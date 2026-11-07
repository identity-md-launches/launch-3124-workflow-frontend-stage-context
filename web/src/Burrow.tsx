import { useState } from "react";
import { useAccount } from "wagmi";
import { useActivity, usePets } from "./data";
import { Empty, ErrorNotice, Loading, Lookup, PageIntro } from "./components";
import { MOODS, STAGES } from "./domain";
import { Icon } from "./art";
import { useWallet } from "./wallet";
import { PetPage } from "./PetPage";
export function Burrow({ paused }: { paused: boolean }) {
  const { address } = useAccount(),
    wallet = useWallet(),
    [pages, setPages] = useState(12);
  const activity = useActivity(pages, true),
    pets = usePets(activity.data?.ids, true);
  if (address && pets.data?.length === 1)
    return (
      <>
        <div className="burrow-breadcrumb">
          <Icon name="burrow" />
          My Burrow
        </div>
        <PetPage id={pets.data[0].id} paused={paused} />
        <Lookup />
      </>
    );
  return (
    <>
      <PageIntro title="My Burrow">
        A soft landing for your little adventurers.
      </PageIntro>
      {!address ? (
        <Empty title="Your burrow is waiting." icon="burrow">
          <p>Connect your wallet to find the Squeeklings you own.</p>
          <button className="button primary" onClick={wallet.open}>
            Connect to My Burrow <Icon name="wallet" />
          </button>
        </Empty>
      ) : (
        <>
          {(activity.isPending || pets.isPending) && (
            <Loading label="Following pawprints on Sepolia…" />
          )}
          {activity.isError && (
            <ErrorNotice
              error={activity.error}
              retry={() => void activity.refetch()}
            />
          )}
          {pets.isError && (
            <ErrorNotice error={pets.error} retry={() => void pets.refetch()} />
          )}
          {pets.data?.length === 0 && (
            <Empty title="No little paws here yet.">
              <p>
                {activity.data?.truncated
                  ? "No pets found in the scanned history. Load older activity or look up a pet number."
                  : "Hatch a friend, or receive a pet from someone you know."}
              </p>
              <a className="button primary" href="#/">
                Visit the Hatchery <Icon name="arrow" />
              </a>
            </Empty>
          )}
          <div className="pet-grid">
            {pets.data?.map((p) => (
              <a className="pet-card" href={`#/pet/${p.id}`} key={String(p.id)}>
                <div
                  className={`mini-pet palette-${Number(BigInt(p.display.seed) % 6n)}`}
                >
                  <Icon name={p.trip.away ? "leaf" : "burrow"} />
                  <span>#{String(p.id)}</span>
                </div>
                <div>
                  <h2>Squeekling #{String(p.id)}</h2>
                  <p>
                    {STAGES[p.display.stage]} ·{" "}
                    {p.display.signalLost
                      ? "Signal lost"
                      : MOODS[p.display.mood]}{" "}
                    · {p.trip.away ? "Away" : "Home"}
                  </p>
                  <span className="text-link">
                    Visit pet <Icon name="arrow" />
                  </span>
                </div>
              </a>
            ))}
          </div>
          {activity.data?.truncated && (
            <div className="notice">
              <p>
                Showing up to 150 pets from recent Transfer logs. Ownership is
                checked live.
              </p>
              {activity.data.ids.length < 150 && (
                <button
                  className="button"
                  onClick={() => setPages((p) => p + 12)}
                >
                  Load older activity
                </button>
              )}
            </div>
          )}
        </>
      )}
      <Lookup />
    </>
  );
}
