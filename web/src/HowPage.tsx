import { useState } from "react";
import { useAccount } from "wagmi";
import { useRuntime } from "./context";
import { useGlobal, useItems, useVerification } from "./data";
import { AddressLink, ErrorNotice, Loading, PageIntro } from "./components";
import { Icon } from "./art";
import {
  KINDS,
  RARITIES,
  SLOTS,
  formatDuration,
  normalizeAddress,
  explainError,
} from "./domain";
import { useTx, TxFeedback } from "./transactions";
export function HowPage() {
  const r = useRuntime(),
    global = useGlobal(),
    items = useItems(),
    g = global.data;
  return (
    <div className="how-page">
      <PageIntro title="A gentler kind of adventure.">
        Free pets, settled hamster history, and equally lovely naps.
      </PageIntro>
      <div className="rules-intro">
        <Icon name="moon" />
        <p>
          Running is never a goal. A zero-work expedition is a Dream trip with
          its own treasures at the same rarity odds. There are no payments, paid
          pulls, payouts, or rewards for running.
        </p>
      </div>
      <section>
        <h2>From a seed to a little friend</h2>
        <p>
          One free hatch per address, ever, with a cap of 88,888 Squeeklings
          (SQLING). Each is an ERC-721 NFT. A transfer does not restore hatch
          eligibility. You may own pets received from other wallets.
        </p>
        <p>
          This is Sepolia testnet. Pets and gas tokens have no game value. There
          is no fungible game token. The only transaction cost is Sepolia
          network gas; no USD price source is configured.
        </p>
      </section>
      <section>
        <h2>Time moves with Squeekchain</h2>
        <p>
          A pet’s age grows only with settled Squeek blocks, not your wall
          clock. One block is one billion core units. Pinky: under 200 blocks;
          Fuzz: 200–1,999; Runner: 2,000–9,999; Elder: 10,000+.
        </p>
        <p>
          Mood reads the last six settled rounds. No work means Napping; any
          round with at least 500 work means Zoomies; otherwise, Jogging.
          Unsettled work is unknown.
        </p>
        <dl className="facts-list">
          <div>
            <dt>Core calendar</dt>
            <dd>
              {g?.duration
                ? `${formatDuration(Number(g.duration))} per round`
                : "Unavailable · try again later"}
            </dd>
          </div>
          <div>
            <dt>Current round</dt>
            <dd>{g?.current?.toLocaleString() ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Settled through</dt>
            <dd>{g?.settled?.toLocaleString() ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Core epoch</dt>
            <dd>{g?.epoch?.toLocaleString() ?? "Unknown"}</dd>
          </div>
        </dl>
      </section>
      <section>
        <h2>Choose a path, then come home</h2>
        <p>
          Burrow Loop lasts 6 rounds, Meadow Trail 18, and Moonlit Ridge 36.
          Trips begin at the next round. Approximate duration is rounds × the
          live core’s round duration, plus the wait to the next round.
          Settlement may finish later. Transfers are locked while away.
        </p>
        <p>
          Once the end round settles, anyone may return a pet. One return opens
          one free Seed Capsule. The item belongs to the pet, auto-equips into
          an empty matching slot, and stays in its inventory when unequipped.
          The confirmed return event decides what you receive.
        </p>
      </section>
      <section>
        <h2>Seed Capsule odds</h2>
        <p>
          Zero-work trips use the Dream table: 6 rounds = Tier 1, 18 = Tier 2,
          36 = Tier 3. A 36-round Dream trip is legendary-eligible. Trail trips
          use settled blocks: under 40 = Tier 1, 40–199 = Tier 2, 200+ = Tier 3.
          A Trail trip is legendary-eligible if its busiest round has 500+ work.
        </p>
        <div className="table-wrap">
          <table>
            <caption>
              Rarity odds before a legendary result or pity guarantee
            </caption>
            <thead>
              <tr>
                <th>Tier</th>
                <th>Common</th>
                <th>Uncommon</th>
                <th>Rare</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>1</th>
                <td>100%</td>
                <td>0%</td>
                <td>0%</td>
              </tr>
              <tr>
                <th>2</th>
                <td>60%</td>
                <td>40%</td>
                <td>0%</td>
              </tr>
              <tr>
                <th>3</th>
                <td>30%</td>
                <td>45%</td>
                <td>25%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          For each untimed roll, an eligible trip gets Legendary when r &lt; 10
          (10%). Otherwise, pity at 5 or more guarantees Rare on an 18- or
          36-round trip. These checks run before the tier table and use the same
          r from 0 to 99; percentages are thresholds, not independent rolls. For
          example, an eligible Tier 3 trip without pity has 10% Legendary, 20%
          Common, 45% Uncommon, and 25% Rare.
        </p>
        <p>
          Rare or Legendary resets pity. Other Trail or Dream items add one.
          Short trips can take pity above five. Lost in the Fog leaves pity
          unchanged and grants a Compass when the administrator has changed the
          core during a trip.
        </p>
        <p>
          Loot is deterministic from public data, not tamper-proof randomness. A
          Dream roll can be predicted before departure and timing may select an
          outcome. These are odds for one untimed roll; nothing of monetary
          value is at stake.
        </p>
      </section>
      <section>
        <h2>All the little treasures</h2>
        {items.isPending && <Loading label="Reading the item catalog…" />}
        {items.isError && (
          <ErrorNotice error={items.error} retry={() => void items.refetch()} />
        )}
        <div className="catalog">
          {items.data?.map((item) => (
            <div key={item.id}>
              <span className={`rarity-marker rarity-${item.rarity}`}>
                <Icon
                  name={
                    item.kind === 1
                      ? "moon"
                      : item.kind === 2
                        ? "arrow"
                        : "leaf"
                  }
                />
              </span>
              <span>
                <strong>{item.name}</strong>
                <span className="fine">
                  {KINDS[item.kind]} · {SLOTS[item.slot]} ·{" "}
                  {RARITIES[item.rarity]}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>What is live, and where</h2>
        <p>
          All game state is read from contracts through public RPCs with
          fallbacks. The status API only controls the wheel and status strip.
          When that signal is idle, stale, or unreachable, the wheel rests under
          a night sky. No analytics, backend, email, or private keys are used.
        </p>
        <dl className="facts-list">
          <div>
            <dt>Network</dt>
            <dd>
              {r.chain.name} · chain {r.chain.id}
            </dd>
          </div>
          <div>
            <dt>Last game read</dt>
            <dd>
              {g
                ? `Block ${g.block.toLocaleString()} · ${new Date(g.updatedAt).toLocaleTimeString()}`
                : "Waiting for RPC"}
            </dd>
          </div>
          <div>
            <dt>Game state</dt>
            <dd>
              {global.isError
                ? "Unavailable · last successful data may be shown"
                : g?.signalLost
                  ? "Core signal lost"
                  : g
                    ? "Readable"
                    : "Checking…"}
            </dd>
          </div>
        </dl>
        {r.deployment.contracts.map((c) => (
          <div className="contract-address" key={c.name}>
            <h3>{c.name}</h3>
            <AddressLink address={c.address} />
          </div>
        ))}
        {g && (
          <>
            <h3>Active SqueekCore V3</h3>
            <AddressLink address={g.core} />
            <h3>Contract administrator</h3>
            <AddressLink address={g.owner} />
          </>
        )}
        <details>
          <summary>Public RPCs & provenance</summary>
          <ul className="breakable-list">
            {r.deployment.network.rpcUrls.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer">
                  {url}
                </a>
              </li>
            ))}
          </ul>
          <p className="address">Source commit: {r.deployment.sourceCommit}</p>
          <p className="address">Attestation: {r.deployment.attestationHash}</p>
          <a
            className="text-link"
            href="./imd-deployment.json"
            target="_blank"
            rel="noreferrer"
          >
            Read deployment manifest <Icon name="external" />
          </a>
        </details>
        <details>
          <summary>Get Sepolia gas for testing</summary>
          <p>
            Hatching and playing are free. A small amount of testnet ETH is
            needed for network gas.
          </p>
          <ul>
            {r.deployment.network.faucets.map((f, i) => (
              <li key={f}>
                <a href={f} target="_blank" rel="noreferrer">
                  Sepolia faucet {i + 1} <Icon name="external" />
                </a>
              </li>
            ))}
          </ul>
        </details>
      </section>
      <AdminPanel />
    </div>
  );
}
function AdminPanel() {
  const r = useRuntime(),
    { address, chainId } = useAccount(),
    g = useGlobal(),
    verify = useVerification(),
    tx = useTx();
  const [core, setCore] = useState(""),
    [ack, setAck] = useState(false),
    [error, setError] = useState("");
  if (address?.toLowerCase() !== g.data?.owner.toLowerCase() || !address)
    return null;
  const submit = async () => {
    setError("");
    try {
      const value = normalizeAddress(core);
      if (!ack)
        throw Error(
          "Enter your confirmation that older trips will become Fog trips.",
        );
      await tx.run({
        key: "set-core",
        label: "Replace SqueekCore",
        functionName: "setCore",
        args: [value],
      });
    } catch (e) {
      setError(explainError(e));
    }
  };
  return (
    <section className="admin-panel">
      <h2>Administrator · core connection</h2>
      <p>
        The only owner power is replacing the read-only core. Age is preserved;
        all currently away pets become Lost in the Fog and return with a
        Compass, without changing pity. The new core is validated by the
        contract.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="new-core">New SqueekCore V3 address</label>
        <input
          id="new-core"
          placeholder="0x…"
          value={core}
          onChange={(e) => {
            setCore(e.target.value);
            setAck(false);
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <label className="check-row">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />
          I understand all active trips will become Fog trips.
        </label>
        <button
          className="button"
          disabled={tx.busy || chainId !== r.chain.id || !verify.data}
        >
          {tx.state?.key === "set-core" && tx.busy
            ? "Awaiting confirmation…"
            : "Replace SqueekCore"}
        </button>
        <div role="status" className={error ? "notice error" : ""}>
          {error}
        </div>
        <TxFeedback actionKey="set-core" />
      </form>
    </section>
  );
}
