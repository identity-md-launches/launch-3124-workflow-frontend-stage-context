import { parseAbi, type Address, type AbiEvent, type Hex } from "viem";
import type { Runtime } from "./config";
import type { Display, Item, Pet, Trip } from "./domain";
// Read-only signatures taken from src/interfaces/ISqueekCoreV3.sol at the deployed source commit.
export const coreAbi = parseAbi([
  "function state() view returns (uint64,uint64,uint96,uint64,uint96,uint32,uint256,bool)",
  "function configuration() view returns (bytes32,uint64,uint64,uint64,uint16,address,address,uint32,uint64,uint64,uint96)",
]);
export async function read<T>(
  r: Runtime,
  functionName: string,
  args: readonly unknown[] = [],
  blockNumber?: bigint,
): Promise<T> {
  return r.publicClient.readContract({
    address: r.game.address,
    abi: r.abi,
    functionName,
    args,
    blockNumber,
  }) as Promise<T>;
}
export async function batch(
  r: Runtime,
  calls: { name: string; args?: readonly unknown[] }[],
  blockNumber?: bigint,
) {
  const values = await r.publicClient.multicall({
    contracts: calls.map((c) => ({
      address: r.game.address,
      abi: r.abi,
      functionName: c.name,
      args: c.args ?? [],
    })),
    blockNumber,
  });
  return values.map((v) => (v.status === "success" ? v.result : undefined));
}
export async function verifyContracts(r: Runtime) {
  if ((await r.publicClient.getChainId()) !== r.deployment.chainId)
    throw Error("The deployed RPC is on the wrong chain.");
  for (const c of r.deployment.contracts) {
    const code = await r.publicClient.getCode({ address: c.address });
    if (!code || code === "0x")
      throw Error(
        `Contract code is missing for ${c.name}. Transactions are disabled.`,
      );
  }
  const art = await read<Address>(r, "art");
  if (art.toLowerCase() !== r.art.address.toLowerCase())
    throw Error("The deployed renderer does not match the handoff.");
  return true;
}
export async function readGlobal(r: Runtime) {
  const block = await r.publicClient.getBlock();
  const names = [
    "totalSupply",
    "MAX_SUPPLY",
    "core",
    "owner",
    "coreEpoch",
    "currentRound",
    "mood",
  ];
  const values = await batch(
    r,
    names.map((name) => ({ name })),
    block.number,
  );
  const [supply, cap, core, owner, epoch, current, mood] = values as [
    bigint,
    bigint,
    Address,
    Address,
    bigint,
    bigint | undefined,
    readonly [number, boolean] | undefined,
  ];
  if (supply === undefined || !core || !owner || epoch === undefined)
    throw Error("Unable to read the game. Try again shortly.");
  let settled: bigint | undefined,
    genesis: bigint | undefined,
    duration: bigint | undefined;
  try {
    const results = await r.publicClient.multicall({
      contracts: [
        { address: core, abi: coreAbi, functionName: "state" },
        { address: core, abi: coreAbi, functionName: "configuration" },
      ],
      blockNumber: block.number,
    });
    if (results[0].status === "success") settled = results[0].result[0];
    if (results[1].status === "success") {
      genesis = results[1].result[1];
      duration = results[1].result[2];
    }
  } catch {
    /* Unknown settlement is kept unknown; no invented progress or work. */
  }
  return {
    supply,
    cap,
    core,
    owner,
    epoch,
    current,
    mood: mood?.[0],
    signalLost: mood?.[1] !== false || settled === undefined || !duration,
    settled,
    genesis,
    duration,
    block: block.number,
    timestamp: block.timestamp,
    updatedAt: Date.now(),
  };
}
export type Global = Awaited<ReturnType<typeof readGlobal>>;
export function eventAbi(r: Runtime, name: string) {
  return r.abi.find((e) => e.type === "event" && e.name === name) as AbiEvent;
}
export type Activity = {
  eventName: string;
  args: Record<string, any>;
  blockNumber: bigint;
  blockHash: Hex;
  transactionHash: Hex;
  logIndex: number;
};
export async function scanActivity(r: Runtime, pages = 12, account?: Address) {
  // Bounded backward scan, overlapping on each refresh. No local state is presented as shared game state.
  const tip = await r.publicClient.getBlockNumber();
  let cursor = tip;
  const events = ["Hatched", "Embarked", "Returned", "Transfer"].map((n) =>
    eventAbi(r, n),
  );
  const logs: Activity[] = [];
  const discoveredIds = () => {
    if (!account)
      return [
        ...new Set(
          logs
            .filter((l) => l.eventName === "Hatched")
            .map((l) => BigInt(l.args.tokenId)),
        ),
      ];
    const newestTransfers = new Map<string, Activity>();
    for (const log of logs) {
      if (log.eventName !== "Transfer") continue;
      const id = String(log.args.tokenId),
        previous = newestTransfers.get(id);
      if (
        !previous ||
        log.blockNumber > previous.blockNumber ||
        (log.blockNumber === previous.blockNumber &&
          log.logIndex > previous.logIndex)
      )
        newestTransfers.set(id, log);
    }
    return [...newestTransfers.values()]
      .filter((l) => String(l.args.to).toLowerCase() === account.toLowerCase())
      .map((l) => BigInt(l.args.tokenId));
  };
  for (let page = 0; page < pages && cursor >= r.deploymentBlock; page++) {
    const from =
      cursor - 1999n > r.deploymentBlock ? cursor - 1999n : r.deploymentBlock;
    const found = await r.publicClient.getLogs({
      address: r.game.address,
      events,
      fromBlock: from,
      toBlock: cursor,
      strict: true,
    });
    logs.push(...(found as unknown as Activity[]));
    const ids = discoveredIds();
    cursor = from - 1n;
    if (ids.length >= 150) break;
  }
  logs.sort((a, b) =>
    a.blockNumber === b.blockNumber
      ? b.logIndex - a.logIndex
      : a.blockNumber > b.blockNumber
        ? -1
        : 1,
  );
  const candidates = discoveredIds().slice(0, 150);
  return {
    logs,
    ids: candidates,
    truncated: cursor >= r.deploymentBlock,
    throughBlock: tip,
    fromBlock: cursor + 1n,
  };
}
export async function readPets(
  r: Runtime,
  ids: bigint[],
  account?: Address,
): Promise<Pet[]> {
  // Multicall3 reads at a single block; chunking bounds the call gas and returned metadata.
  const block = await r.publicClient.getBlockNumber();
  const pets: Pet[] = [];
  for (let start = 0; start < Math.min(ids.length, 150); start += 20) {
    const group = ids.slice(start, start + 20);
    const values = await batch(
      r,
      group.flatMap((id) => [
        { name: "ownerOf", args: [id] },
        { name: "displayData", args: [id] },
        { name: "expedition", args: [id] },
      ]),
      block,
    );
    for (let i = 0; i < group.length; i++) {
      const [owner, display, trip] = values.slice(i * 3, i * 3 + 3) as [
        Address,
        Display,
        Trip,
      ];
      if (
        owner &&
        display &&
        trip &&
        (!account || owner.toLowerCase() === account.toLowerCase())
      )
        pets.push({ id: group[i], owner, display, trip });
    }
  }
  return pets;
}
export async function readPet(r: Runtime, id: bigint): Promise<Pet> {
  const block = await r.publicClient.getBlockNumber();
  const [owner, display, trip, inventory, uri] = (await batch(
    r,
    [
      { name: "ownerOf", args: [id] },
      { name: "displayData", args: [id] },
      { name: "expedition", args: [id] },
      { name: "inventory", args: [id] },
      { name: "tokenURI", args: [id] },
    ],
    block,
  )) as [Address, Display, Trip, readonly bigint[], string];
  if (!owner || !display || !trip || !inventory)
    throw Error(
      "Pet history is unavailable. Check the pet number and try again.",
    );
  let image: string | undefined;
  try {
    if (uri?.startsWith("data:application/json;base64,")) {
      const metadata = JSON.parse(atob(uri.split(",")[1]));
      // Render untrusted chain SVG only as a sandboxed image, never via innerHTML.
      if (/^data:image\/svg\+xml;base64,/.test(metadata.image))
        image = metadata.image;
    }
  } catch {
    /* A failed artwork decode never hides ownership or inventory. */
  }
  return { id, owner, display, trip, inventory, image };
}
export async function readItems(r: Runtime): Promise<Item[]> {
  const values = await batch(
    r,
    Array.from({ length: 17 }, (_, i) => ({ name: "itemInfo", args: [i + 1] })),
  );
  return values.map((v, i) => {
    if (!v) throw Error("Unable to read item descriptions.");
    const [name, slot, rarity, kind] = v as [string, number, number, number];
    return { id: i + 1, name, slot, rarity, kind };
  });
}
