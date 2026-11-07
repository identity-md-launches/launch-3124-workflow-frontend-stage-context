import { useEffect, useRef, useState, type ReactNode } from "react";
import { getAddress, type Address } from "viem";
import { useRuntime } from "./context";
import { Icon, Hamster } from "./art";
import { explainError, shortAddress } from "./domain";
import { useGlobal, useVerification, useWheel } from "./data";
import { useWallet } from "./wallet";
export function AddressLink({
  address,
  label,
}: {
  address: Address;
  label?: string;
}) {
  const r = useRuntime(),
    [copied, setCopied] = useState(false),
    [error, setError] = useState("");
  return (
    <span className="address-group">
      <a
        className="address"
        href={`${r.deployment.network.explorer}/address/${address}`}
        target="_blank"
        rel="noreferrer"
      >
        {label ? `${label} · ` : ""}
        {getAddress(address)}
        <Icon name="external" />
      </a>
      <button
        className="icon-button"
        aria-label={`Copy ${label ?? shortAddress(address)} address`}
        onClick={() => {
          void navigator.clipboard.writeText(getAddress(address)).then(
            () => {
              setCopied(true);
              setError("");
            },
            () => setError("Copy unavailable. Select the address to copy it."),
          );
        }}
      >
        <Icon name={copied ? "check" : "copy"} />
      </button>
      <span role="status" className="fine">
        {copied ? "Copied" : error}
      </span>
    </span>
  );
}
export function Empty({
  title,
  children,
  icon = "seed",
}: {
  title: string;
  children: ReactNode;
  icon?: string;
}) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
export function ErrorNotice({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="notice error" role="status">
      <p>{explainError(error)}</p>
      {retry && (
        <button className="button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Loading({ label = "Reading the burrow…" }: { label?: string }) {
  return (
    <div role="status" className="loading">
      <span className="spinner" />
      {label}
    </div>
  );
}
export function StatusStrip() {
  const global = useGlobal(),
    wheel = useWheel();
  return (
    <aside aria-label="Squeekchain status" className="status-strip">
      <div className="container status-inner">
        <span>
          <span className={`status-dot ${wheel.data?.rpm ? "active" : ""}`} />
          {wheel.isError
            ? "Wheel resting · signal unavailable"
            : (wheel.data?.state ?? "Listening to the wheel…")}
        </span>
        <span className="status-settled">
          {global.data?.settled !== undefined
            ? `Settled round ${global.data.settled.toLocaleString()}`
            : "Settlement unknown"}
        </span>
        <span className="testnet-label">Sepolia · just for play</span>
      </div>
    </aside>
  );
}
export function NetworkNotice() {
  const wallet = useWallet(),
    verified = useVerification();
  return (
    <>
      {wallet.error && (
        <div className="notice error" role="status">
          {wallet.error}
        </div>
      )}
      {verified.isError && (
        <ErrorNotice
          error={verified.error}
          retry={() => void verified.refetch()}
        />
      )}
    </>
  );
}
export function PageIntro({
  title,
  children,
  aside,
}: {
  title: string;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <h1 tabIndex={-1}>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {aside}
    </div>
  );
}
export function PetPreview({
  image,
  id,
  paused = false,
}: {
  image?: string;
  id?: bigint;
  paused?: boolean;
}) {
  if (image) {
    let src = image;
    if (paused) {
      try {
        const raw = atob(image.split(",")[1]);
        src = `data:image/svg+xml;base64,${btoa(raw.replace("</svg>", "<style>*{animation:none!important;transition:none!important}</style></svg>"))}`;
      } catch {
        /* Original safe image remains available. */
      }
    }
    return (
      <img
        className="pet-image"
        src={src}
        alt={`On-chain artwork for Squeekling #${id}`}
        width="320"
        height="320"
      />
    );
  }
  return (
    <div className="pet-image placeholder">
      <svg
        viewBox="0 0 320 320"
        role="img"
        aria-label="Pet artwork unavailable; illustration shown"
      >
        <g transform="translate(160 180)">
          <Hamster sleeping />
        </g>
      </svg>
      <span>Artwork unavailable</span>
    </div>
  );
}
export function Lookup({ onSelect }: { onSelect?: (id: string) => void }) {
  const [id, setId] = useState(""),
    [error, setError] = useState("");
  return (
    <form
      className="lookup"
      onSubmit={(e) => {
        e.preventDefault();
        if (!/^[1-9]\d{0,4}$/.test(id) || Number(id) > 88888) {
          setError("Enter a pet number from 1 to 88,888.");
          return;
        }
        setError("");
        if (onSelect) onSelect(id);
        else location.hash = `/pet/${id}`;
      }}
    >
      <label htmlFor="pet-number">Find a Squeekling</label>
      <div className="input-row">
        <input
          id="pet-number"
          value={id}
          onChange={(e) => setId(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Pet number"
          aria-invalid={!!error}
          aria-describedby={error ? "lookup-error" : undefined}
        />
        <button className="button" type="submit">
          Find pet <Icon name="arrow" />
        </button>
      </div>
      {error && (
        <p id="lookup-error" className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
export function CapsuleReveal({
  item,
  rarity,
  kind,
  onClose,
}: {
  item: string;
  rarity: number;
  kind: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [opened, setOpened] = useState(false);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`capsule-dialog rarity-${rarity}`}
      aria-labelledby="capsule-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-head">
        <h2 id="capsule-title">A little something, for you.</h2>
        <button
          className="icon-button"
          aria-label="Close capsule reveal"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className={`capsule-stage ${opened ? "opened" : ""}`}>
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <ellipse
            cx="100"
            cy="176"
            rx="47"
            ry="9"
            fill="currentColor"
            opacity=".15"
          />
          <g className="capsule">
            <path
              className="capsule-top"
              d="M48 105C31 30 167 20 154 105Z"
              fill="#b7c18e"
              stroke="#596b45"
              strokeWidth="3"
            />
            <path
              className="capsule-bottom"
              d="M48 105q-4 68 52 68t54-68Z"
              fill="#e9d6ac"
              stroke="#927644"
              strokeWidth="3"
            />
            <path d="M100 55q-22-33 13-41 8 26-13 41Z" fill="#6c8551" />
            <path d="m98 62 5-28" stroke="#4f6b42" strokeWidth="3" />
            <path
              className="capsule-crack"
              d="m50 105 28-10 16 17 20-18 17 15 22-4"
              fill="none"
              stroke="#6a593d"
              strokeWidth="3"
            />
          </g>
          <g className="capsule-spark">
            <path
              d="m100 70 9 23 24 8-24 8-9 24-8-24-25-8 25-8Z"
              fill="currentColor"
            />
          </g>
        </svg>
      </div>
      <div className="reveal-result" role="status">
        {opened ? (
          <>
            <p className="rarity-label">
              {["Common", "Uncommon", "Rare", "Legendary"][rarity]} · {kind}
            </p>
            <h3>{item}</h3>
            <p>Added to this pet’s inventory on chain.</p>
          </>
        ) : (
          <p>One settled trip. One free Seed Capsule.</p>
        )}
      </div>
      <button
        className="button primary"
        onClick={() => (opened ? onClose() : setOpened(true))}
      >
        {opened ? "Back to the burrow" : "Open Seed Capsule"}
        <Icon name="sparkle" />
      </button>
    </dialog>
  );
}
