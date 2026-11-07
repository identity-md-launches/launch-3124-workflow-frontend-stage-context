import { useEffect, useRef, useState } from "react";
import { useActivity, useGlobal, usePets, useWheel } from "./data";
import { Empty, ErrorNotice, Loading, Lookup, PageIntro } from "./components";
import { MOODS, tripProgress, tripState } from "./domain";
import type { Pet } from "./domain";
import type { Global } from "./chain";
import { Icon } from "./art";
export function Meadow({ paused }: { paused: boolean }) {
  const [pages, setPages] = useState(12),
    activity = useActivity(pages),
    pets = usePets(activity.data?.ids),
    global = useGlobal(),
    wheel = useWheel();
  const reduced = useReducedMotion(),
    still = paused || reduced;
  const liveWheel =
    wheel.data && !wheel.isError && Date.now() - wheel.dataUpdatedAt < 120000
      ? wheel.data.rpm
      : 0;
  const recent =
    activity.data?.logs.filter((l) => l.eventName === "Returned").slice(0, 5) ??
    [];
  return (
    <>
      <PageIntro
        title="The Meadow"
        aside={
          <span className="soft-label">
            <Icon name="leaf" />
            Everyone’s welcome
          </span>
        }
      >
        A shared little world. No wallet needed.
      </PageIntro>
      <div className="meadow-world">
        <MeadowCanvas
          pets={pets.data ?? []}
          global={global.data}
          rpm={liveWheel}
          paused={still}
        />
        <div className="meadow-caption">
          <span>
            {liveWheel > 0
              ? `Wheel turning · ${liveWheel.toFixed(1)} rpm`
              : "The wheel is resting. Goodnight, little world."}
          </span>
          <span>{pets.data?.length ?? 0} of up to 150 pets</span>
        </div>
      </div>
      <div className="meadow-note">
        <Icon name="moon" />
        <p>
          The wheel follows the Squeekchain status signal. Pet ages, moods,
          trips, and treasures come only from Sepolia contracts. A resting wheel
          is equally welcome.
        </p>
      </div>
      <section className="return-ticker" aria-label="Recent homecomings">
        <h2>Back to the burrow</h2>
        {recent.length ? (
          recent.map((l) => (
            <a
              key={`${l.transactionHash}-${l.logIndex}`}
              href={`#/pet/${l.args.tokenId}`}
            >
              <Icon name="seed" />#{String(l.args.tokenId)} returned ·{" "}
              {["Trail", "Dream", "Fog"][Number(l.args.kind)]} item #
              {String(l.args.itemId)}
              <Icon name="arrow" />
            </a>
          ))
        ) : (
          <p>
            {activity.isPending
              ? "Listening for homecomings…"
              : "No returns in the scanned history yet."}
          </p>
        )}
      </section>
      {(pets.isPending || activity.isPending) && (
        <Loading label="Looking for little pawprints…" />
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
        <Empty title="A meadow with room to grow." icon="leaf">
          <p>
            The scanned contract logs have no hatched pets yet. Yours could be
            the first little visitor.
          </p>
          <a className="button" href="#/">
            Visit the Hatchery <Icon name="arrow" />
          </a>
        </Empty>
      )}
      {pets.data && pets.data.length > 0 && (
        <section>
          <h2>Meet the little residents</h2>
          <div className="resident-list">
            {pets.data.map((p) => (
              <a key={String(p.id)} href={`#/pet/${p.id}`}>
                <strong>#{String(p.id)}</strong>
                <span>
                  {global.data
                    ? tripState(p.trip, global.data)
                    : p.trip.away
                      ? "Signal lost"
                      : "Home"}{" "}
                  ·{" "}
                  {p.display.signalLost ? "Signal lost" : MOODS[p.display.mood]}
                </span>
                <Icon name="arrow" />
              </a>
            ))}
          </div>
        </section>
      )}
      {activity.data?.truncated && (
        <div className="notice">
          <p>
            Showing the latest discovered pets, up to 150. Earlier history is
            available in batches.
          </p>
          {activity.data.ids.length < 150 && (
            <button className="button" onClick={() => setPages((p) => p + 12)}>
              Load older activity
            </button>
          )}
        </div>
      )}
      <Lookup />
    </>
  );
}
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)"),
      update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}
function MeadowCanvas({
  pets,
  global,
  rpm,
  paused,
}: {
  pets: Pet[];
  global?: Global;
  rpm: number;
  paused: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    let frame = 0,
      previous = 0,
      rotation = 0;
    const night = rpm <= 0;
    const rect = (
      x: number,
      y: number,
      w: number,
      h: number,
      color: string,
    ) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), w, h);
    };
    const draw = (time: number) => {
      const elapsed = previous ? Math.min(0.1, (time - previous) / 1000) : 0;
      previous = time;
      if (!paused) rotation += (elapsed * rpm * Math.PI * 2) / 60;
      rect(0, 0, 480, 236, night ? "#263545" : "#cbd7bf");
      if (night) {
        for (let i = 0; i < 42; i++) {
          const x = (i * 79 + 13) % 480,
            y = (i * 31 + 4) % 107;
          rect(x, y, i % 5 === 0 ? 2 : 1, 1, "#e7ddb3");
        }
        rect(381, 25, 18, 18, "#eee1b3");
        rect(375, 20, 18, 16, "#263545");
      } else {
        rect(374, 22, 22, 22, "#f6e5aa");
        for (let i = 0; i < 6; i++) {
          rect(i * 91 + 22, 40 + (i % 3) * 16, 31, 6, "#e7edda");
        }
      }
      const hill = (
        x: number,
        y: number,
        w: number,
        h: number,
        color: string,
      ) => {
        for (let j = 0; j < h; j += 3) {
          const width = Math.sqrt(1 - (1 - j / h) ** 2) * w;
          rect(x - width / 2, y + j, width, 3, color);
        }
      };
      hill(80, 77, 300, 56, night ? "#3a4e4c" : "#a8bb91");
      hill(340, 64, 350, 78, night ? "#3c514a" : "#9bb385");
      rect(0, 128, 480, 108, night ? "#4c624b" : "#899f6a");
      for (let i = 0; i < 90; i++) {
        rect(
          (i * 41) % 480,
          136 + ((i * 13) % 95),
          3,
          2,
          night ? "#627455" : "#a8b77b",
        );
      }
      const trail = (y: number, color: string) => {
        for (let x = 195; x < 480; x += 4)
          rect(x, y + Math.sin(x / 42) * 7, 5, 8, color);
      };
      trail(145, night ? "#8c8462" : "#c9bb8f");
      trail(175, night ? "#79795d" : "#c2b68a");
      trail(208, night ? "#71745b" : "#b7ad85");
      // Pixel burrow and the three trails.
      rect(22, 132, 70, 39, "#75573c");
      rect(31, 122, 52, 13, "#75573c");
      rect(43, 116, 28, 9, "#75573c");
      rect(46, 142, 24, 29, "#342e27");
      rect(44, 138, 28, 7, "#342e27");
      rect(48, 146, 4, 18, "#c39d60");
      rect(18, 167, 78, 4, "#aea176");
      rect(94, 159, 31, 4, "#7c825d");
      // Wheel speed is rpmMilli / 1000, independent of all game state.
      ctx.strokeStyle = night ? "#c3b18a" : "#8b724e";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(148, 112, 37, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = rotation + (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(148, 112);
        ctx.lineTo(148 + Math.cos(a) * 34, 112 + Math.sin(a) * 34);
        ctx.stroke();
      }
      rect(145, 113, 6, 49, night ? "#b4a17b" : "#86754d");
      rect(127, 159, 43, 5, night ? "#b4a17b" : "#86754d");
      const colors = [
        "#d8a16c",
        "#d4c0a0",
        "#9a8068",
        "#c78a67",
        "#e2c18e",
        "#aca59a",
      ];
      for (let i = 0; i < Math.min(150, pets.length); i++) {
        const p = pets[i],
          seed = Number(BigInt(p.display.seed) % 99991n),
          nap = !p.trip.away && (p.display.mood === 0 || p.display.signalLost);
        let x: number, y: number;
        if (p.trip.away) {
          const progress = global ? tripProgress(p.trip, global) : undefined;
          x = 201 + (progress ?? 0) * 255;
          y = [148, 178, 211][p.trip.route] ?? 148;
          y += Math.sin(x / 42) * 7;
        } else {
          x = 20 + (seed % 170);
          y = 183 + ((seed * 7) % 43);
          if (!paused && !nap) x += Math.sin(time / 1800 + i) * 7;
        }
        const bob =
          !paused && !nap
            ? Math.sin(time / (p.display.mood === 2 ? 80 : 180) + i) * 1
            : 0;
        x = Math.round(x);
        y = Math.round(y + bob);
        rect(x - 5, y - 4, 10, 7, colors[seed % 6]);
        rect(x - 4, y - 7, 3, 4, colors[seed % 6]);
        rect(x + 2, y - 7, 3, 4, colors[seed % 6]);
        rect(x - 3, y, 6, 3, "#eed4ab");
        rect(x - 3, y - 3, 1, nap ? 1 : 2, "#3a3028");
        rect(x + 2, y - 3, 1, nap ? 1 : 2, "#3a3028");
        if (nap) {
          rect(x + 7, y - 11, 4, 1, "#e6dbb7");
          rect(x + 9, y - 10, 1, 1, "#e6dbb7");
          rect(x + 7, y - 9, 4, 1, "#e6dbb7");
        }
      }
      if (!paused) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [pets, global, rpm, paused]);
  return (
    <canvas
      ref={canvas}
      width="480"
      height="236"
      role="img"
      aria-label={`Pixel Meadow. ${pets.length} pets. ${rpm > 0 ? "The wheel turns with the live status signal." : "The wheel rests under a night sky."} Pet states are listed below.`}
    />
  );
}
