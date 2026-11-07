import { createConfig } from "wagmi";
import { injected } from "wagmi/connectors/injected";
import { coinbaseWallet } from "wagmi/connectors/coinbaseWallet";
import {
  createPublicClient,
  defineChain,
  fallback,
  http,
  keccak256,
  stringToHex,
  type Abi,
  type Address,
} from "viem";
import { sepolia } from "viem/chains";

export type Deployment = {
  version: 1;
  launchId: string;
  chainId: number;
  sourceCommit: string;
  attestationHash: string;
  contracts: {
    name: string;
    address: Address;
    abiHash: string;
    abiPath: string;
  }[];
  assets: { path: string; sha256: string }[];
  network: {
    chainId: number;
    name: string;
    testnet: boolean;
    rpcUrls: string[];
    explorer: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    faucets: string[];
  };
  walletAddChain?: {
    chainId: string;
    chainName: string;
    rpcUrls: string[];
    nativeCurrency: { name: string; symbol: string; decimals: number };
    blockExplorerUrls: string[];
  };
};
export function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, stable((value as Record<string, unknown>)[k])]),
    );
  return value;
}
const assetUrl = (path: string) =>
  new URL(path, new URL(import.meta.env.BASE_URL, document.baseURI));
async function getJson(path: string) {
  if (path.startsWith("/") || path.includes("..") || path.includes(":"))
    throw Error("Unsafe deployment asset path.");
  const r = await fetch(assetUrl(path), { cache: "no-cache" });
  if (!r.ok) throw Error(`Unable to load ${path}. Reload to try again.`);
  return r.json();
}
export async function loadRuntime() {
  const deployment: Deployment = await getJson("imd-deployment.json");
  if (
    deployment.version !== 1 ||
    !deployment.network ||
    deployment.chainId !== deployment.network.chainId ||
    deployment.network.rpcUrls.length === 0
  )
    throw Error("Deployment configuration could not be verified.");
  const abis = new Map<string, Abi>();
  for (const c of deployment.contracts) {
    const abi = await getJson(c.abiPath);
    if (
      !Array.isArray(abi) ||
      keccak256(stringToHex(JSON.stringify(stable(abi)))).slice(2) !== c.abiHash
    )
      throw Error(
        `ABI verification failed for ${c.name}. Transactions are disabled.`,
      );
    abis.set(c.name, abi);
  }
  const game = deployment.contracts.find((c) => c.name === "Squeeklings");
  const art = deployment.contracts.find((c) => c.name === "SqueeklingsArt");
  if (!game || !art) throw Error("The Squeeklings deployment is incomplete.");
  const chain = defineChain({
    id: deployment.chainId,
    name: deployment.network.name,
    nativeCurrency: deployment.network.nativeCurrency,
    rpcUrls: { default: { http: deployment.network.rpcUrls } },
    blockExplorers: {
      default: { name: "Explorer", url: deployment.network.explorer },
    },
    testnet: deployment.network.testnet,
    // The standard Multicall3 deployment is supplied by viem's Sepolia chain definition.
    contracts:
      deployment.chainId === sepolia.id ? sepolia.contracts : undefined,
  });
  const transport = fallback(
    deployment.network.rpcUrls.map((url) =>
      http(url, { timeout: 12000, retryCount: 0, batch: { wait: 30 } }),
    ),
    { rank: false, retryCount: 1 },
  );
  const publicClient = createPublicClient({
    chain,
    transport,
    batch: { multicall: { wait: 25, batchSize: 16000 } },
    pollingInterval: 12000,
  });
  const walletConfig = createConfig({
    chains: [chain],
    multiInjectedProviderDiscovery: true,
    connectors: [
      injected(),
      coinbaseWallet({
        appName: "Squeeklings",
        preference: { options: "all" },
      }),
    ],
    transports: { [chain.id]: transport },
  });
  const indexing = await getJson("indexing.json");
  if (
    !Number.isSafeInteger(indexing.deploymentBlock) ||
    indexing.deploymentBlock < 1
  )
    throw Error("Invalid deployment history boundary.");
  return {
    deployment,
    game,
    art,
    abi: abis.get("Squeeklings")!,
    artAbi: abis.get("SqueeklingsArt")!,
    chain,
    publicClient,
    walletConfig,
    deploymentBlock: BigInt(indexing.deploymentBlock),
  };
}
export type Runtime = Awaited<ReturnType<typeof loadRuntime>>;
export const STATUS_URL = "https://api.squeekchain.com/v1/status";
