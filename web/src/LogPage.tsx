import { useState } from "react";
import { useActivity, useItems } from "./data";
import { Empty, ErrorNotice, Loading, PageIntro } from "./components";
import { useRuntime } from "./context";
import { ROUTES, RARITIES, KINDS } from "./domain";
import { Icon } from "./art";
export function LogPage() {
  const r = useRuntime(),
    [pages, setPages] = useState(12),
    [filter, setFilter] = useState(""),
    [limit, setLimit] = useState(150);
  const activity = useActivity(pages),
    items = useItems();
  const matching =
    activity.data?.logs.filter(
      (l) =>
        ["Embarked", "Returned", "Hatched"].includes(l.eventName) &&
        (!filter || String(l.args.tokenId) === filter),
    ) ?? [];
  const logs = matching.slice(0, limit);
  return (
    <>
      <PageIntro title="Expedition Log">
        Little departures. Happy homecomings. Written on Sepolia.
      </PageIntro>
      <label className="log-filter">
        Filter by pet number
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          placeholder="All Squeeklings"
          autoComplete="off"
        />
        {filter && (
          <button className="button" onClick={() => setFilter("")}>
            Show all pets
          </button>
        )}
      </label>
      {activity.isPending && <Loading label="Reading on-chain stories…" />}
      {activity.isError && (
        <ErrorNotice
          error={activity.error}
          retry={() => void activity.refetch()}
        />
      )}
      {activity.data && logs.length === 0 && (
        <Empty title="A quiet page, for now." icon="leaf">
          <p>
            {filter
              ? `No activity for pet #${filter} in the scanned history. Clear the filter or load older activity.`
              : "No hatch or expedition events in the scanned history yet."}
          </p>
        </Empty>
      )}
      <ol className="event-log">
        {logs.map((log) => (
          <li key={`${log.transactionHash}-${log.logIndex}`}>
            <div className="event-icon">
              <Icon
                name={
                  log.eventName === "Returned"
                    ? "seed"
                    : log.eventName === "Hatched"
                      ? "burrow"
                      : "leaf"
                }
              />
            </div>
            <div>
              <h2>
                <a href={`#/pet/${log.args.tokenId}`}>
                  Squeekling #{String(log.args.tokenId)}
                </a>{" "}
                {log.eventName === "Returned"
                  ? "came home"
                  : log.eventName === "Hatched"
                    ? "hatched"
                    : "set off"}
              </h2>
              <p>
                {log.eventName === "Embarked"
                  ? `${ROUTES[Number(log.args.route)]?.name} · rounds ${log.args.startRound}–${log.args.endRound}`
                  : log.eventName === "Returned"
                    ? `${items.data?.find((i) => i.id === Number(log.args.itemId))?.name ?? `Item #${log.args.itemId}`} · ${RARITIES[Number(log.args.rarity)]} · ${KINDS[Number(log.args.kind)]}`
                    : "A new little story begins."}
              </p>
              {log.eventName === "Returned" && (
                <p className="fine">
                  {String(log.args.work)} settled work ·{" "}
                  {String(log.args.blocks)} Squeek blocks · busiest round{" "}
                  {String(log.args.busiest)} work · pity {String(log.args.pity)}
                  /5
                </p>
              )}
              <a
                className="text-link fine"
                href={`${r.deployment.network.explorer}/tx/${log.transactionHash}`}
                target="_blank"
                rel="noreferrer"
              >
                Block {log.blockNumber.toLocaleString()}{" "}
                <Icon name="external" />
              </a>
            </div>
          </li>
        ))}
      </ol>
      {matching.length > limit && (
        <button className="button" onClick={() => setLimit((n) => n + 150)}>
          Show more recorded events
        </button>
      )}
      {activity.data?.truncated && (
        <div className="notice">
          <p>
            {logs.length} events shown. The scan covers blocks{" "}
            {activity.data.fromBlock.toLocaleString()}–
            {activity.data.throughBlock.toLocaleString()}. Recent events can
            change during a chain reorganization.
          </p>
          <button className="button" onClick={() => setPages((p) => p + 12)}>
            Load older activity
          </button>
        </div>
      )}
    </>
  );
}
