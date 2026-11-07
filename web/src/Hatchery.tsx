import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { parseEventLogs } from "viem";
import { BurrowScene, Icon } from "./art";
import { useRuntime } from "./context";
import { useEligibility, useGlobal } from "./data";
import { read } from "./chain";
import { TxButton, TxFeedback } from "./transactions";
import { PageIntro } from "./components";
export function Hatchery() {
  const r = useRuntime(),
    global = useGlobal(),
    eligibility = useEligibility(),
    { address } = useAccount();
  const balance = useQuery({
    queryKey: ["balance", address],
    queryFn: () => read<bigint>(r, "balanceOf", [address]),
    enabled: !!address,
    refetchInterval: 12000,
  });
  const g = global.data,
    hatched = eligibility.data === true,
    full = !!g && g.supply >= g.cap;
  const unavailable =
    !g ||
    global.isError ||
    (global.isStale && Date.now() - (g?.updatedAt ?? 0) > 60000) ||
    g.signalLost;
  return (
    <>
      <PageIntro title="Meet your Squeekling.">
        A free on-chain pet. A little place to call home.
      </PageIntro>
      <div className="hatch-layout">
        <figure className="hatch-scene">
          <BurrowScene />
          <figcaption>
            <span>
              <Icon name="leaf" />A burrow of your own
            </span>
            <span>Illustrated preview</span>
          </figcaption>
        </figure>
        <section className="hatch-panel" aria-labelledby="hatch-title">
          <div className="panel-top">
            <span className="soft-label">
              <Icon name="seed" />
              The Hatchery
            </span>
            <span className="supply">
              {g
                ? `${g.supply.toLocaleString()} / ${g.cap.toLocaleString()}`
                : "Reading supply…"}
            </span>
          </div>
          <h2 id="hatch-title">A tiny friend awaits.</h2>
          <p>
            Hatch one pet per wallet, free. Its fur, little treasures, and
            entire story live on Sepolia.
          </p>
          <div className="hatch-facts">
            <span>
              <Icon name="check" />
              Free to hatch
            </span>
            <span>
              <Icon name="check" />
              Yours to keep
            </span>
          </div>
          {hatched ? (
            <>
              <a className="button primary" href="#/burrow">
                Visit My Burrow <Icon name="arrow" />
              </a>
              <p className="fine">
                This wallet has used its free hatch.
                {balance.data === 0n
                  ? " Your pet may have moved to another wallet."
                  : ""}
              </p>
            </>
          ) : (
            <>
              <TxButton
                primary
                disabled={
                  !!address &&
                  (unavailable ||
                    eligibility.data === undefined ||
                    eligibility.isError ||
                    full)
                }
                action={{
                  key: "hatch",
                  label: "Hatch a Squeekling",
                  functionName: "hatch",
                  onReceipt: (receipt) => {
                    const events = parseEventLogs({
                      abi: r.abi,
                      eventName: "Hatched",
                      logs: receipt.logs,
                      strict: true,
                    });
                    const event = events.find(
                      (e) =>
                        e.address.toLowerCase() ===
                        r.game.address.toLowerCase(),
                    );
                    const args = event?.args as
                      { tokenId?: bigint } | undefined;
                    if (args?.tokenId) location.hash = `/pet/${args.tokenId}`;
                  },
                }}
              />
              <p className="fine">
                {full
                  ? "The Hatchery is full. Visit the Meadow to meet the pets."
                  : unavailable && address
                    ? "Waiting for a readable core and fresh contract state."
                    : address && eligibility.isError
                      ? "Eligibility unavailable. Refresh to try again."
                      : "No game fee. A little Sepolia ETH for network gas."}
              </p>
            </>
          )}
          <TxFeedback actionKey="hatch" />
          <a className="quiet-link" href="#/meadow">
            Explore the Meadow <Icon name="arrow" />
          </a>
        </section>
      </div>
      <section className="home-how" aria-labelledby="home-how-title">
        <div className="section-heading">
          <h2 id="home-how-title">Life in the burrow</h2>
          <a className="text-link" href="#/how">
            How it works <Icon name="arrow" />
          </a>
        </div>
        <div className="three-stories">
          <article>
            <Icon name="burrow" />
            <h3>Make yourself at home</h3>
            <p>
              Your pet grows with settled Squeek blocks. Dress it in the
              treasures it brings home.
            </p>
          </article>
          <article>
            <Icon name="leaf" />
            <h3>Take the scenic route</h3>
            <p>
              Choose a trail, then come back once its rounds settle. Every
              return brings a Seed Capsule.
            </p>
          </article>
          <article>
            <Icon name="moon" />
            <h3>Rest is part of the story</h3>
            <p>
              A quiet wheel brings Dream treasures at the same odds. There is
              never a reason to push.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
