import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { Hatchery } from "./Hatchery";
import { Burrow } from "./Burrow";
import { Meadow } from "./Meadow";
import { PetPage } from "./PetPage";
import { LogPage } from "./LogPage";
import { HowPage } from "./HowPage";
import { Icon } from "./art";
import { useRuntime } from "./context";
import { useGlobal } from "./data";
import { NetworkNotice, StatusStrip, Lookup } from "./components";
import { WalletControl } from "./wallet";
import { TxFeedback } from "./transactions";
import { safePetId } from "./domain";
import { useReducedMotion } from "./Meadow";
const links = [
  { path: "/", name: "Hatchery", icon: "seed" },
  { path: "/burrow", name: "My Burrow", icon: "burrow" },
  { path: "/meadow", name: "The Meadow", icon: "leaf" },
  { path: "/log", name: "Expedition Log", icon: "clock" },
  { path: "/how", name: "How it works", icon: "sparkle" },
];
export function App() {
  const [path, setPath] = useState(() => location.hash.slice(1) || "/"),
    [paused, setPaused] = useState(false),
    reduced = useReducedMotion();
  const main = useRef<HTMLElement>(null),
    r = useRuntime(),
    { isConnected, chainId } = useAccount(),
    g = useGlobal();
  useEffect(() => {
    const change = () => {
      setPath(location.hash.slice(1) || "/");
      scrollTo({ top: 0 });
      requestAnimationFrame(() =>
        main.current
          ?.querySelector<HTMLElement>("h1")
          ?.focus({ preventScroll: true }),
      );
    };
    addEventListener("hashchange", change);
    return () => removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    const title = path.startsWith("/pet/")
      ? `Squeekling #${path.split("/")[2]}`
      : (links.find((l) => l.path === path)?.name ?? "Squeeklings");
    document.title = `${title} · Squeeklings`;
  }, [path]);
  let content;
  if (path === "/") content = <Hatchery />;
  else if (path === "/burrow") content = <Burrow paused={paused} />;
  else if (path === "/meadow") content = <Meadow paused={paused} />;
  else if (path === "/log") content = <LogPage />;
  else if (path === "/how") content = <HowPage />;
  else if (path.startsWith("/pet/")) {
    try {
      content = (
        <PetPage
          key={path}
          id={safePetId(path.split("/")[2])}
          paused={paused}
        />
      );
    } catch {
      content = (
        <>
          <h1>That pet number wandered off.</h1>
          <p>Choose a pet number from 1 to 88,888.</p>
          <Lookup />
        </>
      );
    }
  } else
    content = (
      <>
        <h1>A path back home.</h1>
        <p>This page was not found.</p>
        <a className="button" href="#/">
          Visit the Hatchery
        </a>
      </>
    );
  return (
    <div className={`app ${paused || reduced ? "motion-paused" : ""}`}>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#/" aria-label="Squeeklings Hatchery">
            <img
              src={`${import.meta.env.BASE_URL}favicon.svg`}
              alt=""
              width="38"
              height="38"
            />
            <span>
              squeeklings
              <span className="brand-detail">a little on-chain life</span>
            </span>
          </a>
          <WalletControl />
          <nav aria-label="Main navigation">
            {links.map((link, i) => (
              <a
                className={i > 2 ? "secondary-nav" : ""}
                key={link.path}
                href={`#${link.path}`}
                aria-current={path === link.path ? "page" : undefined}
              >
                <Icon name={link.icon} />
                {link.name}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <StatusStrip />
      <main id="main" ref={main} tabIndex={-1} className="container">
        {isConnected && chainId !== r.chain.id && (
          <div className="notice error" role="status">
            Your wallet is on another network. Use “Switch to {r.chain.name}”
            above to play.
          </div>
        )}
        {content}
        <NetworkNotice />
        {g.isError && (
          <div className="notice error" role="status">
            Game reads are unavailable. Your pet is safe.{" "}
            <button className="text-button" onClick={() => void g.refetch()}>
              Retry game reads
            </button>
          </div>
        )}
        {path !== "/" && <TxFeedback actionKey="hatch" />}
      </main>
      <footer className="site-footer container">
        <div>
          <a className="brand footer-brand" href="#/">
            squeeklings
            <Icon name="leaf" />
          </a>
          <p>Little paws. Their own pace.</p>
        </div>
        <nav aria-label="More information">
          <a href="#/log">Expedition Log</a>
          <a href="#/how">How it works</a>
          <button
            className="text-button"
            aria-pressed={paused || reduced}
            disabled={reduced}
            onClick={() => setPaused((p) => !p)}
          >
            {reduced
              ? "Reduced motion on"
              : paused
                ? "Resume motion"
                : "Pause motion"}
          </button>
        </nav>
        <p className="fine footer-note">
          Sepolia testnet · no monetary value · no payments
        </p>
      </footer>
    </div>
  );
}
