import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccount } from "wagmi";
import { getWalletClient } from "@wagmi/core";
import { useQueryClient } from "@tanstack/react-query";
import { parseEventLogs, type Hex, type TransactionReceipt } from "viem";
import { useRuntime } from "./context";
import { useVerification } from "./data";
import { explainError } from "./domain";
import { useWallet } from "./wallet";
import { Icon } from "./art";
type State = {
  key: string;
  label: string;
  phase: "checking" | "wallet" | "confirming" | "unknown" | "success" | "error";
  hash?: Hex;
  message?: string;
};
type Action = {
  key: string;
  label: string;
  functionName: string;
  args?: readonly unknown[];
  onReceipt?: (receipt: TransactionReceipt) => void;
};
const TxContext = createContext<{
  state?: State;
  run: (action: Action) => Promise<void>;
  busy: boolean;
  resume: () => Promise<void>;
}>({ run: async () => {}, busy: false, resume: async () => {} });
export const useTx = () => useContext(TxContext);
export function Transactions({ children }: { children: ReactNode }) {
  const r = useRuntime(),
    { address, chainId } = useAccount(),
    query = useQueryClient(),
    verification = useVerification();
  const [state, setState] = useState<State>(),
    lock = useRef(false),
    pending = useRef<Action | undefined>(undefined);
  const confirm = async (action: Action, hash: Hex) => {
    let cancelledOrChanged = false;
    try {
      const receipt = await r.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
        timeout: 180000,
        onReplaced: (replacement) => {
          cancelledOrChanged = replacement.reason !== "repriced";
          setState({
            key: action.key,
            label: action.label,
            phase: "confirming",
            hash: replacement.transactionReceipt.transactionHash,
          });
        },
      });
      if (receipt.status === "reverted")
        throw Error(
          "Transaction reverted. Nothing changed. Refresh and try again.",
        );
      if (cancelledOrChanged)
        throw Error(
          "Transaction was cancelled or changed in your wallet. Refresh to see the latest state.",
        );
      // Keep the action locked through receipt confirmation AND the fresh state read.
      await query.invalidateQueries({
        predicate: (q) =>
          !["verification", "items", "wheel"].includes(String(q.queryKey[0])),
      });
      lock.current = false;
      pending.current = undefined;
      setState({
        key: action.key,
        label: action.label,
        phase: "success",
        hash: receipt.transactionHash,
        message: `${action.label} confirmed.`,
      });
      // Receipt events are authoritative. Predictions from eth_call are never revealed as loot.
      action.onReceipt?.(receipt);
    } catch (e) {
      if (
        /timeout|timed out|not be found|not found|failed to fetch|http request failed/i.test(
          String(e),
        )
      ) {
        setState({
          key: action.key,
          label: action.label,
          phase: "unknown",
          hash,
          message:
            "Transaction sent. Confirmation is not available yet. Check the explorer or check again.",
        });
      } else {
        setState({
          key: action.key,
          label: action.label,
          phase: "error",
          hash,
          message: explainError(e),
        });
        lock.current = false;
        pending.current = undefined;
      }
    }
  };
  const run = async (action: Action) => {
    if (lock.current) return;
    lock.current = true;
    pending.current = action;
    setState({ key: action.key, label: action.label, phase: "checking" });
    try {
      if (
        !address ||
        chainId !== r.chain.id ||
        !verification.data ||
        verification.isStale
      )
        throw Error(
          "Your wallet must be connected to the verified deployment network. Refresh before trying again.",
        );
      const wallet = await getWalletClient(r.walletConfig, {
        chainId: r.chain.id,
      });
      // Check the signing provider again immediately before simulation/signing.
      if ((await wallet.getChainId()) !== r.chain.id)
        throw Error(
          "The wallet is on another network. Switch to Sepolia and try again.",
        );
      const simulated = await r.publicClient.simulateContract({
        address: r.game.address,
        abi: r.abi,
        functionName: action.functionName,
        args: action.args ?? [],
        account: address,
      });
      setState({ key: action.key, label: action.label, phase: "wallet" });
      const hash = await wallet.writeContract({
        ...simulated.request,
        chain: r.chain,
        account: address,
      });
      setState({
        key: action.key,
        label: action.label,
        phase: "confirming",
        hash,
      });
      await confirm(action, hash);
    } catch (e) {
      setState({
        key: action.key,
        label: action.label,
        phase: "error",
        message: explainError(e),
      });
      lock.current = false;
      pending.current = undefined;
    }
  };
  const busy =
    !!state &&
    ["checking", "wallet", "confirming", "unknown"].includes(state.phase);
  return (
    <TxContext.Provider
      value={{
        state,
        run,
        busy,
        resume: async () => {
          if (state?.hash && pending.current) {
            setState({ ...state, phase: "confirming" });
            await confirm(pending.current, state.hash);
          }
        },
      }}
    >
      {children}
    </TxContext.Provider>
  );
}
export function TxButton({
  action,
  disabled = false,
  primary = false,
  children,
}: {
  action: Action;
  disabled?: boolean;
  primary?: boolean;
  children?: ReactNode;
}) {
  const tx = useTx(),
    { address, chainId } = useAccount(),
    r = useRuntime(),
    wallet = useWallet(),
    verified = useVerification();
  const active = tx.state?.key === action.key && tx.busy;
  return (
    <button
      className={`button ${primary ? "primary" : ""}`}
      disabled={
        disabled ||
        tx.busy ||
        (!!address &&
          (chainId !== r.chain.id || !verified.data || verified.isStale))
      }
      onClick={() => {
        if (!address) wallet.open();
        else void tx.run(action);
      }}
    >
      {active ? (
        <>
          <span className="spinner" />
          {tx.state?.phase === "checking"
            ? "Checking…"
            : tx.state?.phase === "wallet"
              ? "Confirm in wallet…"
              : "Awaiting confirmation…"}
        </>
      ) : (
        <>
          {children ?? action.label}
          {primary && <Icon name="arrow" />}
        </>
      )}
    </button>
  );
}
export function TxFeedback({ actionKey }: { actionKey: string }) {
  const tx = useTx(),
    r = useRuntime(),
    s = tx.state;
  return (
    <div aria-live="polite" className="tx-feedback">
      {s?.key === actionKey && (
        <div
          className={`notice ${s.phase === "error" ? "error" : s.phase === "success" ? "success" : ""}`}
        >
          <span>
            {s.message ??
              (s.phase === "checking"
                ? "Simulating this action before asking for a signature."
                : s.phase === "wallet"
                  ? "Review the transaction in your wallet. Game payment: 0 ETH. Sepolia network gas applies."
                  : "Transaction submitted. Waiting for on-chain confirmation.")}
          </span>
          {s.hash && (
            <a
              href={`${r.deployment.network.explorer}/tx/${s.hash}`}
              target="_blank"
              rel="noreferrer"
            >
              View transaction <Icon name="external" />
            </a>
          )}
          {s.phase === "unknown" && (
            <button className="button" onClick={() => void tx.resume()}>
              Check confirmation again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
export function returnedItem(
  r: ReturnType<typeof useRuntime>,
  receipt: TransactionReceipt,
) {
  const events = parseEventLogs({
    abi: r.abi,
    eventName: "Returned",
    logs: receipt.logs,
    strict: true,
  });
  const event = events.find(
    (e) => e.address.toLowerCase() === r.game.address.toLowerCase(),
  );
  return event?.args as
    | {
        itemId: number;
        rarity: number;
        kind: number;
        pity: number;
        tokenId: bigint;
      }
    | undefined;
}
