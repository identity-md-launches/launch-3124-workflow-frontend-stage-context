import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useConnect, useDisconnect, type Connector } from "wagmi";
import { getAddress } from "viem";
import { useRuntime } from "./context";
import { explainError, shortAddress } from "./domain";
import { Icon } from "./art";
export const OPEN_IN = [
  {
    id: "metamask",
    name: "MetaMask",
    href: (url: string) =>
      `https://link.metamask.io/dapp/${url.replace(/^https?:\/\//, "")}`,
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    href: (url: string) =>
      `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`,
  },
  {
    id: "rabby",
    name: "Rabby",
    href: (url: string) =>
      `https://go.rabby.io/mobile/?_cmd=open-dapp&dapp=${encodeURIComponent(url)}`,
  },
  {
    id: "phantom",
    name: "Phantom",
    href: (url: string) =>
      `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(new URL(url).origin)}`,
  },
];
export async function switchProvider(
  provider: { request: (args: any) => Promise<any> },
  chainId: number,
  walletAddChain: unknown,
) {
  const params = [{ chainId: `0x${chainId.toString(16)}` }];
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params });
  } catch (error) {
    const e = error as {
      code?: number;
      message?: string;
      data?: { originalError?: { code?: number } };
    };
    if (
      e.code !== 4902 &&
      e.data?.originalError?.code !== 4902 &&
      !/unknown chain|unrecognized chain|chain.*not.*added/i.test(
        e.message ?? "",
      )
    )
      throw error;
    if (!walletAddChain)
      throw Error(
        "Your wallet does not know this network. Add it using the public RPC in How it works.",
      );
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [walletAddChain],
    });
    await provider.request({ method: "wallet_switchEthereumChain", params });
  }
}
const WalletContext = createContext<{
  open: () => void;
  switchChain: () => Promise<void>;
  error: string;
  switching: boolean;
}>({
  open: () => {},
  switchChain: async () => {},
  error: "",
  switching: false,
});
export const useWallet = () => useContext(WalletContext);
export function WalletUi({ children }: { children: ReactNode }) {
  const r = useRuntime(),
    account = useAccount(),
    { connectors, connectAsync, isPending, variables } = useConnect();
  const [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [switching, setSwitching] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  const change = useCallback(
    async (c = account.connector) => {
      if (!c) return;
      setSwitching(true);
      setError("");
      try {
        const provider = await c.getProvider();
        await switchProvider(
          provider as any,
          r.deployment.chainId,
          r.deployment.walletAddChain,
        );
      } catch (e) {
        setError(explainError(e));
      } finally {
        setSwitching(false);
      }
    },
    [account.connector, r],
  );
  const connect = async (connector: Connector) => {
    setError("");
    try {
      const result = await connectAsync({ connector });
      setOpen(false);
      if (result.chainId !== r.chain.id) await change(connector);
    } catch (e) {
      setError(explainError(e));
    }
  };
  const named = connectors.some(
    (c) => c.type === "injected" && c.id !== "injected",
  );
  const mobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    !window.ethereum &&
    !named;
  const listed = connectors.filter(
    (c) =>
      !(named && c.id === "injected") && (!mobile || c.type !== "injected"),
  );
  return (
    <WalletContext.Provider
      value={{
        open: () => {
          setError("");
          setOpen(true);
        },
        switchChain: () => change(),
        error,
        switching,
      }}
    >
      {children}
      <dialog
        ref={dialog}
        className="wallet-dialog"
        aria-labelledby="wallet-title"
        onCancel={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setOpen(false);
        }}
      >
        <div className="dialog-head">
          <h2 id="wallet-title">Come on in.</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close wallet picker"
            onClick={() => setOpen(false)}
          >
            <Icon name="close" />
          </button>
        </div>
        <p>Connect a wallet to look after your pet.</p>
        {mobile &&
          OPEN_IN.map((w) => (
            <a key={w.id} className="wallet-row" href={w.href(location.href)}>
              <img
                src={`${import.meta.env.BASE_URL}wallets/${w.id}.svg`}
                alt=""
                width="28"
                height="28"
              />
              Open in {w.name}
              <Icon name="external" />
            </a>
          ))}
        {listed.map((c) => (
          <button
            key={c.uid}
            className="wallet-row"
            disabled={isPending}
            onClick={() => void connect(c)}
          >
            {c.icon ? (
              <img src={c.icon} alt="" width="28" height="28" />
            ) : c.id === "coinbaseWalletSDK" ? (
              <img
                src={`${import.meta.env.BASE_URL}wallets/coinbase.svg`}
                alt=""
                width="28"
                height="28"
              />
            ) : (
              <Icon name="wallet" />
            )}
            <span>
              {c.id === "injected"
                ? "Browser wallet"
                : c.id === "coinbaseWalletSDK"
                  ? mobile
                    ? "Coinbase Smart Wallet"
                    : "Coinbase Wallet"
                  : c.name}
              {isPending && variables?.connector === c ? " · opening…" : ""}
            </span>
          </button>
        ))}
        <div role="status" className={error ? "notice error" : ""}>
          {error}
        </div>
        <p className="fine">
          Sepolia testnet. No payments. You only pay network gas.
        </p>
      </dialog>
    </WalletContext.Provider>
  );
}
export function WalletControl() {
  const { address, chainId, isConnected } = useAccount(),
    { disconnect } = useDisconnect(),
    r = useRuntime(),
    wallet = useWallet();
  if (isConnected && chainId !== r.chain.id)
    return (
      <button
        className="button wallet-control"
        onClick={() => void wallet.switchChain()}
        disabled={wallet.switching}
      >
        {wallet.switching ? "Switching…" : `Switch to ${r.chain.name}`}
      </button>
    );
  if (address)
    return (
      <details className="account-menu">
        <summary className="button">
          <span className="connection-dot" />
          {shortAddress(address)}
        </summary>
        <div className="account-popover">
          <p className="address">{getAddress(address)}</p>
          <button className="button" onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      </details>
    );
  return (
    <button className="button wallet-control" onClick={wallet.open}>
      <Icon name="wallet" />
      Connect wallet
    </button>
  );
}
declare global {
  interface Window {
    ethereum?: any;
  }
}
