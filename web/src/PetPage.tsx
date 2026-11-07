import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { zeroAddress, type Address } from "viem";
import { useRuntime } from "./context";
import { useGlobal, useItems, usePet, useVerification } from "./data";
import {
  AddressLink,
  CapsuleReveal,
  ErrorNotice,
  Loading,
  PageIntro,
  PetPreview,
} from "./components";
import {
  ROUTES,
  MOODS,
  STAGES,
  SLOTS,
  RARITIES,
  KINDS,
  formatDuration,
  normalizeAddress,
  tripProgress,
  tripState,
  explainError,
} from "./domain";
import type { Pet } from "./domain";
import { Icon, RouteArt } from "./art";
import { read } from "./chain";
import { returnedItem, TxButton, TxFeedback, useTx } from "./transactions";
export function PetPage({ id, paused }: { id: bigint; paused: boolean }) {
  const r = useRuntime(),
    pet = usePet(id),
    global = useGlobal(),
    items = useItems(),
    { address } = useAccount();
  const [route, setRoute] = useState(0),
    [capsule, setCapsule] = useState<{
      itemId: number;
      rarity: number;
      kind: number;
    } | null>(null);
  const [copied, setCopied] = useState("");
  useEffect(() => {
    setCapsule(null);
    setCopied("");
  }, [id]);
  if (pet.isPending) return <Loading label="Opening this little burrow…" />;
  if (pet.isError)
    return (
      <>
        <PageIntro title={`Squeekling #${id}`} />
        <ErrorNotice error={pet.error} retry={() => void pet.refetch()} />
        <a className="button" href="#/burrow">
          Back to My Burrow
        </a>
      </>
    );
  const p = pet.data,
    g = global.data,
    isOwner = address?.toLowerCase() === p.owner.toLowerCase();
  const state = g ? tripState(p.trip, g) : p.trip.away ? "Signal lost" : "Home";
  const progress = g && !g.signalLost ? tripProgress(p.trip, g) : undefined;
  const ready = state.startsWith("Ready");
  const stale = pet.isError || Date.now() - pet.dataUpdatedAt > 60000;
  const primaryKey = ready ? `return-${id}` : `embark-${id}`;
  const share = () => {
    const url = new URL(location.href);
    url.hash = `/pet/${id}`;
    return `https://x.com/intent/tweet?text=${encodeURIComponent(`Meet Squeekling #${id}. Little paws, their own pace.`)}&url=${encodeURIComponent(url.href)}`;
  };
  return (
    <>
      <PageIntro
        title={`Squeekling #${id}`}
        aside={
          <div className="inline-actions">
            <a
              className="button"
              href={share()}
              target="_blank"
              rel="noreferrer"
            >
              Share on X <Icon name="external" />
            </a>
            <button
              className="button"
              onClick={() =>
                void navigator.clipboard.writeText(location.href).then(
                  () => setCopied("Pet link copied."),
                  () => setCopied("Select the page address to copy the link."),
                )
              }
            >
              Copy link <Icon name="copy" />
            </button>
            <span role="status" className="fine">
              {copied}
            </span>
          </div>
        }
      >
        {STAGES[p.display.stage]} ·{" "}
        {p.display.signalLost ? "Signal lost" : MOODS[p.display.mood]} ·{" "}
        {p.display.ageBlocks.toLocaleString()} Squeek blocks old
      </PageIntro>
      <div className="pet-detail-layout">
        <div className={`pet-portrait ${paused ? "motion-paused" : ""}`}>
          <PetPreview image={p.image} id={id} paused={paused} />
          <div className="portrait-caption">
            <span className="state-label">{state}</span>
            <span>On-chain SVG</span>
          </div>
        </div>
        <section className="expedition-panel" aria-labelledby="trip-title">
          <h2 id="trip-title">
            {ready
              ? "Home is one step away."
              : p.trip.away
                ? "Out on a little adventure."
                : "Where shall we wander?"}
          </h2>
          {p.trip.away ? (
            <>
              <p>
                {ROUTES[p.trip.route]?.name} · rounds{" "}
                {String(p.trip.startRound)}–{String(p.trip.endRound)}
              </p>
              {progress !== undefined && (
                <>
                  <progress
                    value={progress}
                    max={1}
                    aria-label="Time along expedition"
                  />
                  <p className="fine">
                    {Math.round(progress * 100)}% of scheduled time · settlement
                    determines readiness.
                  </p>
                </>
              )}
              {g?.genesis && g?.duration && (
                <p className="fine">
                  Scheduled end:{" "}
                  {new Date(
                    Number(g.genesis + p.trip.endRound * g.duration) * 1000,
                  ).toLocaleString()}{" "}
                  (your local time).
                </p>
              )}
              <p className="trip-message">
                {ready
                  ? p.trip.epoch !== g?.epoch
                    ? "The core changed while your pet was away. Return for a Compass; pity stays the same."
                    : "The final round has settled. Return your pet and open its free Seed Capsule."
                  : state === "Waiting for settlement"
                    ? "The walk is finished. Waiting for Squeekchain to certify the final round. Unsettled work is still unknown."
                    : state === "Signal lost"
                      ? "Signal lost. This expedition is safe. Readiness will return when contract data is available."
                      : "No need to hurry. Your pet will be ready after the final round settles."}
              </p>
              <TxButton
                primary
                disabled={!ready || stale}
                action={{
                  key: `return-${id}`,
                  label: "Return home & collect capsule",
                  functionName: "returnHome",
                  args: [id],
                  onReceipt: (receipt) => {
                    const drop = returnedItem(r, receipt);
                    if (drop && drop.tokenId === id) setCapsule(drop);
                  },
                }}
              />
              <p className="fine">
                Anyone can return a ready pet. Its item stays with the NFT.
              </p>
            </>
          ) : (
            <>
              <p>
                Each trip brings one free Seed Capsule. Resting trips bring
                Dream treasures.
              </p>
              <fieldset
                className="routes"
                disabled={!isOwner || !g || g.signalLost || stale}
              >
                <legend>Choose an expedition</legend>
                {ROUTES.map((trip, i) => (
                  <label
                    className={`route-choice ${route === i ? "selected" : ""}`}
                    key={trip.name}
                  >
                    <input
                      type="radio"
                      name="route"
                      value={i}
                      checked={route === i}
                      onChange={() => setRoute(i)}
                    />
                    <RouteArt route={i} />
                    <span>
                      <strong>{trip.name}</strong>
                      <span className="fine">
                        {trip.rounds} rounds ·{" "}
                        {g?.duration
                          ? formatDuration(Number(g.duration) * trip.rounds)
                          : "Time unavailable"}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <TxButton
                primary
                disabled={!isOwner || !g || g.signalLost || stale}
                action={{
                  key: `embark-${id}`,
                  label: `Take the ${ROUTES[route].name}`,
                  functionName: "embark",
                  args: [id, route],
                }}
              />
              <p className="fine">
                {isOwner
                  ? "Starts next round. Transfers stay locked while away. No game payment; network gas applies."
                  : "Only the owner can choose a route. Connect the wallet that owns this pet."}
              </p>
            </>
          )}
          <TxFeedback actionKey={primaryKey} />
        </section>
      </div>
      <section className="pity-section">
        <div>
          <h2>A little luck, saved up</h2>
          <p>
            {p.display.pity}/5 returns without a rare or legendary. At 5+, an
            18- or 36-round return guarantees at least rare. A 6-round trip can
            keep adding pity.
          </p>
        </div>
        <div
          className="pity-meter"
          role="meter"
          aria-label="Pity toward rare guarantee"
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={Math.min(5, p.display.pity)}
          aria-valuetext={`${p.display.pity} returns without rare or legendary; guarantee threshold 5`}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={i < p.display.pity ? "filled" : ""}>
              <Icon name="seed" />
            </span>
          ))}
        </div>
      </section>
      <section className="inventory-section" aria-labelledby="inventory-title">
        <div className="section-heading">
          <div>
            <h2 id="inventory-title">Little treasures</h2>
            <p>Inventory and equipment travel with this pet.</p>
          </div>
        </div>
        <div className="equipment-slots">
          {SLOTS.map((slot, i) => {
            const item = items.data?.find(
              (v) => v.id === p.display.equipped[i],
            );
            return (
              <div className="equipment-slot" key={slot}>
                <span className="fine">{slot}</span>
                <strong>
                  {p.display.equipped[i]
                    ? (item?.name ?? `Item ${p.display.equipped[i]}`)
                    : "Nothing equipped"}
                </strong>
                <TxButton
                  disabled={!isOwner || !p.display.equipped[i] || stale}
                  action={{
                    key: `unequip-${id}-${i}`,
                    label: `Unequip ${slot.toLowerCase()}`,
                    functionName: "unequip",
                    args: [id, i],
                  }}
                />
                <TxFeedback actionKey={`unequip-${id}-${i}`} />
              </div>
            );
          })}
        </div>
        {items.isPending && <Loading label="Reading item descriptions…" />}
        {items.isError && (
          <ErrorNotice error={items.error} retry={() => void items.refetch()} />
        )}
        {p.inventory?.every((v) => v === 0n) && (
          <p className="inventory-empty">
            No keepsakes yet. Take a gentle expedition and bring home your first
            Seed Capsule.
          </p>
        )}
        <div className="inventory-grid">
          {items.data
            ?.filter((item) => (p.inventory?.[item.id - 1] ?? 0n) > 0n)
            .map((item) => (
              <article
                className={`inventory-item rarity-${item.rarity}`}
                key={item.id}
              >
                <Icon
                  name={
                    item.kind === 1
                      ? "moon"
                      : item.kind === 2
                        ? "arrow"
                        : "leaf"
                  }
                />
                <div>
                  <h3>{item.name}</h3>
                  <p className="fine">
                    {RARITIES[item.rarity]} · {KINDS[item.kind]} ·{" "}
                    {SLOTS[item.slot]} · ×{String(p.inventory?.[item.id - 1])}
                  </p>
                </div>
                <TxButton
                  disabled={
                    !isOwner ||
                    p.display.equipped[item.slot] === item.id ||
                    stale
                  }
                  action={{
                    key: `equip-${id}-${item.id}`,
                    label:
                      p.display.equipped[item.slot] === item.id
                        ? "Equipped"
                        : `Equip ${item.name}`,
                    functionName: "equip",
                    args: [id, item.id],
                  }}
                />
                <TxFeedback actionKey={`equip-${id}-${item.id}`} />
              </article>
            ))}
        </div>
      </section>
      <details className="ownership-section">
        <summary>Ownership & transfer</summary>
        <p>Current owner</p>
        <AddressLink address={p.owner} />
        <a
          className="text-link"
          href={`${r.deployment.network.explorer}/token/${r.game.address}?a=${id}`}
          target="_blank"
          rel="noreferrer"
        >
          View NFT on Sepolia explorer <Icon name="external" />
        </a>
        <Ownership pet={p} stale={stale} />
      </details>
      {capsule && (
        <CapsuleReveal
          item={
            items.data?.find((i) => i.id === capsule.itemId)?.name ??
            `Item #${capsule.itemId}`
          }
          rarity={capsule.rarity}
          kind={KINDS[capsule.kind]}
          onClose={() => setCapsule(null)}
        />
      )}
    </>
  );
}
function Ownership({ pet: p, stale }: { pet: Pet; stale: boolean }) {
  const r = useRuntime(),
    { address, chainId } = useAccount(),
    tx = useTx(),
    verified = useVerification();
  const [recipient, setRecipient] = useState(""),
    [operator, setOperator] = useState(""),
    [permit, setPermit] = useState(false),
    [ack, setAck] = useState(false),
    [error, setError] = useState("");
  const isOwner = address?.toLowerCase() === p.owner.toLowerCase();
  const approvals = useQuery({
    queryKey: ["approvals", String(p.id), address, operator],
    queryFn: async () => {
      let op: Address | undefined;
      try {
        op = normalizeAddress(operator);
      } catch {
        /* The operator's current permission is only queried for a valid address. */
      }
      const [approved, forAll] = await Promise.all([
        read<Address>(r, "getApproved", [p.id]),
        address
          ? read<boolean>(r, "isApprovedForAll", [p.owner, address])
          : false,
      ]);
      const operatorApproved = op
        ? await read<boolean>(r, "isApprovedForAll", [p.owner, op])
        : undefined;
      return { approved, forAll, operatorApproved };
    },
    enabled: !!address,
    refetchInterval: 12000,
  });
  const unavailable =
    tx.busy || stale || !address || chainId !== r.chain.id || !verified.data;
  const pendingLabel = (key: string, label: string) =>
    tx.state?.key === key && tx.busy
      ? tx.state.phase === "checking"
        ? "Checking…"
        : tx.state.phase === "wallet"
          ? "Confirm in wallet…"
          : "Awaiting confirmation…"
      : label;
  const allowed =
    isOwner ||
    approvals.data?.approved.toLowerCase() === address?.toLowerCase() ||
    approvals.data?.forAll;
  async function submit(kind: "transfer" | "approve" | "operator") {
    setError("");
    try {
      if (kind === "operator") {
        const target = normalizeAddress(operator);
        if (!ack)
          throw Error(
            "Enter your confirmation that this operator can move all your pets.",
          );
        await tx.run({
          key: `operator-${p.id}`,
          label: permit ? "Grant operator access" : "Revoke operator access",
          functionName: "setApprovalForAll",
          args: [target, permit],
        });
      } else {
        const target = normalizeAddress(recipient);
        if (target.toLowerCase() === p.owner.toLowerCase())
          throw Error(
            "The receiving address must be different from the owner.",
          );
        await tx.run({
          key: `${kind}-${p.id}`,
          label: kind === "transfer" ? "Transfer pet" : "Approve pet transfer",
          functionName: kind === "transfer" ? "safeTransferFrom" : "approve",
          args: kind === "transfer" ? [p.owner, target, p.id] : [target, p.id],
        });
      }
    } catch (e) {
      setError(explainError(e));
    }
  }
  return (
    <div className="ownership-controls">
      <p>
        Transfers move this NFT and its full inventory. They cannot be undone.
        Return home before transferring. No payment is required.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit("transfer");
        }}
      >
        <label htmlFor="recipient">
          Receiving wallet or single-pet approval address
        </label>
        <input
          id="recipient"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x…"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="inline-actions">
          <button
            className="button"
            disabled={!allowed || p.trip.away || unavailable}
          >
            {pendingLabel(`transfer-${p.id}`, "Transfer pet")}
          </button>
          <button
            type="button"
            className="button"
            disabled={!isOwner || unavailable}
            onClick={() => void submit("approve")}
          >
            {pendingLabel(`approve-${p.id}`, "Approve this pet’s transfer")}
          </button>
        </div>
        <TxFeedback actionKey={`transfer-${p.id}`} />
        <TxFeedback actionKey={`approve-${p.id}`} />
        <button
          type="button"
          className="button"
          disabled={
            !isOwner ||
            unavailable ||
            !approvals.data ||
            approvals.data.approved === zeroAddress
          }
          onClick={() =>
            void tx.run({
              key: `revoke-${p.id}`,
              label: "Revoke single-pet approval",
              functionName: "approve",
              args: [zeroAddress, p.id],
            })
          }
        >
          {pendingLabel(`revoke-${p.id}`, "Revoke single-pet approval")}
        </button>
        <TxFeedback actionKey={`revoke-${p.id}`} />
      </form>
      {approvals.data && (
        <p className="fine">
          Current single-pet approval:{" "}
          {/^0x0{40}$/i.test(approvals.data.approved)
            ? "none"
            : approvals.data.approved}
          . Operators can transfer at-home pets.
        </p>
      )}
      <details>
        <summary>Manage access to all pets</summary>
        <p>
          Granting an operator access lets it transfer every Squeekling you own.
          Only approve an address you trust.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit("operator");
          }}
        >
          <label htmlFor="operator">Operator address</label>
          <input
            id="operator"
            value={operator}
            onChange={(e) => {
              setOperator(e.target.value);
              setAck(false);
            }}
            placeholder="0x…"
            autoComplete="off"
            spellCheck={false}
          />
          {approvals.data?.operatorApproved !== undefined && (
            <p>
              Current access:{" "}
              {approvals.data.operatorApproved ? "approved" : "not approved"}
            </p>
          )}
          <label className="check-row">
            <input
              type="checkbox"
              checked={permit}
              onChange={(e) => setPermit(e.target.checked)}
            />
            Allow this operator to transfer all my pets
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            I understand this changes access to every pet in this wallet.
          </label>
          <button className="button" disabled={!isOwner || unavailable}>
            {pendingLabel(`operator-${p.id}`, "Save operator access")}
          </button>
          <TxFeedback actionKey={`operator-${p.id}`} />
        </form>
      </details>
      <div role="status" className={error ? "notice error" : ""}>
        {error}
      </div>
    </div>
  );
}
