import {
  BaseError,
  ContractFunctionRevertedError,
  getAddress,
  isAddress,
} from "viem";
export const ROUTES = [
  {
    name: "Burrow Loop",
    rounds: 6,
    description: "A familiar path past the clover.",
    icon: "burrow",
  },
  {
    name: "Meadow Trail",
    rounds: 18,
    description: "A little farther, through the flowers.",
    icon: "leaf",
  },
  {
    name: "Moonlit Ridge",
    rounds: 36,
    description: "A long wander beneath the stars.",
    icon: "moon",
  },
] as const;
export const STAGES = ["Pinky", "Fuzz", "Runner", "Elder"];
export const MOODS = ["Napping", "Jogging", "Zoomies"];
export const SLOTS = ["Head", "Neck", "Hand", "Background"];
export const RARITIES = ["Common", "Uncommon", "Rare", "Legendary"];
export const KINDS = ["Trail", "Dream", "Lost in the Fog"];
export type Item = {
  id: number;
  name: string;
  slot: number;
  rarity: number;
  kind: number;
};
export type Trip = {
  startRound: bigint;
  endRound: bigint;
  epoch: bigint;
  route: number;
  away: boolean;
};
export type Display = {
  seed: `0x${string}`;
  ageBlocks: bigint;
  pity: number;
  stage: number;
  mood: number;
  away: boolean;
  signalLost: boolean;
  equipped: readonly number[];
};
export type Pet = {
  id: bigint;
  owner: `0x${string}`;
  display: Display;
  trip: Trip;
  inventory?: readonly bigint[];
  image?: string;
};
export type Calendar = {
  genesis?: bigint;
  duration?: bigint;
  settled?: bigint;
  epoch: bigint;
};
export function tripState(
  trip: Trip,
  calendar: Calendar,
  now = Date.now() / 1000,
) {
  if (!trip.away) return "Home";
  if (trip.epoch !== calendar.epoch) return "Ready · Lost in the Fog";
  if (calendar.settled !== undefined && calendar.settled >= trip.endRound)
    return "Ready";
  if (
    calendar.settled === undefined ||
    calendar.genesis === undefined ||
    !calendar.duration
  )
    return "Signal lost";
  const ends = Number(calendar.genesis + trip.endRound * calendar.duration);
  return now >= ends ? "Waiting for settlement" : "Away";
}
export function tripProgress(
  trip: Trip,
  calendar: Calendar,
  now = Date.now() / 1000,
) {
  if (calendar.genesis === undefined || !calendar.duration) return undefined;
  const start = Number(
    calendar.genesis + (trip.startRound - 1n) * calendar.duration,
  );
  const end = Number(calendar.genesis + trip.endRound * calendar.duration);
  return Math.max(0, Math.min(1, (now - start) / (end - start)));
}
export function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.ceil(seconds)} sec`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400)
    return `${(seconds / 3600).toFixed(seconds % 3600 ? 1 : 0)} hr`;
  return `${(seconds / 86400).toFixed(1)} days`;
}
export function normalizeAddress(value: string) {
  const a = value.trim();
  if (!isAddress(a, { strict: true }) || /^0x0{40}$/i.test(a))
    throw Error("Enter a valid, nonzero Ethereum address.");
  return getAddress(a);
}
export function shortAddress(a: string) {
  const c = getAddress(a);
  return `${c.slice(0, 6)}…${c.slice(-4)}`;
}
export function safePetId(raw: string) {
  if (!/^[1-9]\d{0,4}$/.test(raw) || BigInt(raw) > 88888n)
    throw Error("Enter a pet number from 1 to 88,888.");
  return BigInt(raw);
}
const messages: Record<string, string> = {
  AlreadyHatched:
    "This wallet has already hatched its free pet. Check My Burrow or choose another wallet.",
  SupplyCap: "All 88,888 pets have hatched. You can still explore the Meadow.",
  NotPetOwner: "Connect the wallet that owns this pet, then try again.",
  ERC721InsufficientApproval:
    "Use the pet owner’s wallet or an approved transfer operator.",
  PetAway:
    "Your pet is away. Return it home before transferring or departing again.",
  PetAtHome: "This pet is already home. Refresh to see its latest state.",
  NotSettledYet:
    "Squeekchain has not settled the final round yet. Keep resting and try again later.",
  CoreUnavailable:
    "Signal lost. Your pet and inventory are safe. Try again when Squeekchain is reachable.",
  InvalidHistory:
    "Settlement history is unavailable. Your trip is safe; try again later.",
  ItemNotOwned: "This pet does not have that item. Refresh its inventory.",
  InvalidSlot: "Choose one of the four equipment slots.",
  InvalidRoute: "Choose one of the three expedition routes.",
  InvalidItem: "Choose an available inventory item.",
  OnlyOwner: "Only the contract administrator can change the core.",
  InvalidAddress: "Enter a valid, nonzero Ethereum address.",
  InvalidCore:
    "That core does not provide a valid SqueekCore V3 calendar and state.",
  CoreUnchanged: "That core is already active. Choose a different valid core.",
  RoundOverflow:
    "The core’s calendar is invalid. Contact the contract administrator.",
  ERC721NonexistentToken: "This pet has not hatched. Check the pet number.",
  ERC721InvalidReceiver:
    "The destination cannot receive this NFT. Check the receiving wallet.",
};
export function explainError(error: unknown): string {
  const e = error as { code?: number; message?: string; cause?: unknown };
  if (
    e?.code === 4001 ||
    /user rejected|user denied|rejected the request/i.test(e?.message ?? "")
  )
    return "Request declined in your wallet. Nothing changed; you can try again.";
  if (/provider not found|no provider|not installed/i.test(e?.message ?? ""))
    return "No browser wallet was found. Install a wallet extension, open this page in a wallet app, or choose Coinbase Wallet.";
  if (e?.code === -32002)
    return "A request is already open in your wallet. Finish or dismiss it there.";
  if (/insufficient funds/i.test(e?.message ?? ""))
    return "You need a little Sepolia ETH for network gas. The game itself is free.";
  if (error instanceof BaseError) {
    const revert = error.walk(
      (x) => x instanceof ContractFunctionRevertedError,
    ) as ContractFunctionRevertedError;
    if (revert?.data?.errorName && messages[revert.data.errorName])
      return messages[revert.data.errorName];
  }
  for (const [name, message] of Object.entries(messages))
    if (e?.message?.includes(name)) return message;
  if (e?.cause && e.cause !== error) {
    const inner = explainError(e.cause);
    if (!inner.startsWith("Unable to")) return inner;
  }
  if (
    e?.message &&
    /^(Enter |The wallet|This wallet|Your wallet|Contract code|The deployed|Pet history|Transaction |The receiving)/.test(
      e.message,
    )
  )
    return e.message;
  return "Unable to complete this request. Check your connection and wallet network, then try again.";
}
export function readWheel(payload: unknown, now = Date.now()) {
  const p = payload as Record<string, any>;
  const m = p?.measurement;
  const rawTime = m?.timestamp ?? m?.observedAt ?? p?.timestamp ?? p?.updatedAt;
  let stamp =
    typeof rawTime === "number"
      ? rawTime < 1e12
        ? rawTime * 1000
        : rawTime
      : Date.parse(rawTime);
  if (!Number.isFinite(stamp)) stamp = 0;
  const state = String(
    m?.coreStatus ?? p?.status ?? p?.state ?? m?.status ?? "",
  ).toUpperCase();
  const rpm = Number(m?.rpmMilli) / 1000;
  const maxAge =
    Math.min(120, Math.max(1, Number(m?.staleAfterSeconds) || 90)) * 1000;
  const fresh =
    now - stamp <= maxAge &&
    stamp <= now + 15000 &&
    m?.freshness !== "stale" &&
    m?.freshness !== "offline";
  return {
    rpm: fresh && state !== "IDLE" && Number.isFinite(rpm) && rpm > 0 ? rpm : 0,
    fresh,
    state: !fresh
      ? "Resting · stale signal"
      : state === "IDLE" || !rpm
        ? "Resting"
        : "Wheel turning",
  };
}
