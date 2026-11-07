import React, { Component, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { loadRuntime } from "./config";
import { RuntimeContext } from "./context";
import { WalletUi } from "./wallet";
import { Transactions } from "./transactions";
import { App } from "./App";
import "./styles.css";
const root = ReactDOM.createRoot(document.getElementById("root")!);
class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="boot">
        <h1>Your burrow is safe.</h1>
        <p>
          This page could not display its latest state. Reload to try again.
        </p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload Squeeklings
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
root.render(
  <div className="boot" role="status">
    <img
      src={`${import.meta.env.BASE_URL}favicon.svg`}
      alt=""
      width="56"
      height="56"
    />
    <h1>Opening the burrow…</h1>
    <p>Loading the verified deployment and on-chain ABIs.</p>
  </div>,
);
loadRuntime()
  .then((r) => {
    const query = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          refetchOnWindowFocus: true,
          refetchIntervalInBackground: false,
        },
      },
    });
    root.render(
      <React.StrictMode>
        <Boundary>
          <RuntimeContext.Provider value={r}>
            <WagmiProvider config={r.walletConfig}>
              <QueryClientProvider client={query}>
                <WalletUi>
                  <Transactions>
                    <App />
                  </Transactions>
                </WalletUi>
              </QueryClientProvider>
            </WagmiProvider>
          </RuntimeContext.Provider>
        </Boundary>
      </React.StrictMode>,
    );
  })
  .catch((error) => {
    root.render(
      <div className="boot">
        <h1>The burrow is taking a breath.</h1>
        <p role="alert">
          {error instanceof Error
            ? error.message
            : "Deployment configuration unavailable."}
        </p>
        <button className="button primary" onClick={() => location.reload()}>
          Try loading again
        </button>
        <p>
          Transactions remain unavailable until deployment verification
          succeeds.
        </p>
      </div>,
    );
  });
