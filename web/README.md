# Squeeklings frontend

A static Sepolia pet game, built with Vite, React, TypeScript, wagmi, viem and TanStack Query.
The deployed Solidity files are preserved. This worker does not deploy contracts or publish a site.

## Install, build and preview

Use Node 22.12+ (validated with Node 24) and npm. Keep the repository's Git history, including the
pinned deployed source commit, available when building.

```sh
cd web
npm ci
npm run build
npm run verify
npm run preview
```

Open the preview URL printed by Vite. Production files are in **repository-root `dist/`**, not
`web/dist/`. Upload the whole `dist/` directory unchanged. It uses a relative `./` base and hash
routes, including `#/`, `#/burrow`, `#/meadow`, `#/pet/1`, `#/log` and `#/how`. No server rewrites,
server rendering, API service, account, wallet relay, project ID or environment file is required.

`npm run dev` first prepares the export, then starts Vite with hot reload. Its development middleware
serves the generated deployment, indexing boundary and ABI files from `dist/`; it introduces no
second runtime address map. Rebuild after changing the deployment inputs. `npm run typecheck` runs
TypeScript separately. The build always runs it too.

## Deployment configuration and reproducibility

- `deployment-handoff.json` and `network-handoff.json` retain the supplied public handoffs as build
  inputs. They are not imported into the browser. Never edit addresses in application components.
- `scripts/manifest.mjs` obtains `docs/abi/<Contract>.json` using `git show` at the attested
  `sourceCommit`. It checks the current ABI files against those bytes, hashes recursively sorted,
  compact JSON with Keccak-256, and checks the handoff's hashes before copying the raw ABI arrays.
- After Vite finishes, that script writes `dist/imd-deployment.json`. It copies the exact contract
  set, identifiers and network blocks; a future handoff containing `poolKey` is preserved as well.
  Every other exported file, including ABI JSON, local licenses, images, `index.html`, and the
  generated deployment-block-only `indexing.json`, receives a SHA-256 inventory entry.
- `src/config.ts` fetches that same manifest and the referenced ABIs at runtime and verifies their
  canonical hashes. It derives the chain, public fallback transport, game contract and wallet
  configuration from them. The active core and administrator are read from the game contract.
- On startup, transactions wait for the configured RPC chain ID, nonempty code for both attested
  contracts, and a matching `art()` address. Code existence is not a new bytecode/source attestation;
  the supplied deployment attestation remains the provenance binding.
- The standard Sepolia Multicall3 address comes from the installed viem chain definition. All
  application reads use the implementation-derived ABI. Core read signatures come from the pinned
  `src/interfaces/ISqueekCoreV3.sol` interface. No Uniswap action applies: this is an NFT game.

The build needs Git to resolve `e382a7cbd4f4f50e047a3b5a20af6957a3985484`. A shallow clone must fetch
that existing commit/history first. No `.imd/reads/` file is needed to rebuild the delivered source.
Do not edit generated `dist/` files directly; rebuild and run `npm run verify` after each change.

## Wallets and transactions

One wallet picker supports EIP-6963 named extensions, Coinbase Wallet / Smart Wallet, and mobile
open-in links for MetaMask, Coinbase Wallet, Rabby and Phantom. Unknown networks are added using
the exact handoff's `walletAddChain` parameters after a failed switch, then switched again.
There is no WalletConnect relay or project ID.

Actions simulate before the wallet prompt, send no game payment, and remain locked through the
receipt and refreshed reads. A rejected request or failed simulation changes no game state. An
unknown confirmation retains its transaction link and offers another confirmation check. Capsule
reveals come only from the confirmed game's `Returned` event. Wallet speed-up/cancellation and
replacements have defensive handling but were not exercised against a real wallet.

Pet actions include hatch, three expedition routes, return, equip/unequip, safe transfer, single-NFT
approval/revocation and all-pet operator permission. The immutable administrator alone sees the
`setCore` panel. Sepolia gas is the only transaction cost; there are no swaps or ERC-20 approvals.

## Data boundaries and observability

- Game views poll every 12 seconds. Pet collections poll every 15 seconds; event discovery every
  30 seconds. Background polling stops when the browser is hidden. Required verification refreshes
  every four minutes. The UI exposes the last successful game block/read, active core/epoch,
  round calendar, settlement boundary, owners, contract links, and transaction status.
- Discovery scans backward in 2,000-block chunks, initially at most 12 chunks. A visitor can expand
  earlier history in batches. The Meadow and owned-pet discovery cap the displayed pet set at 150;
  live `ownerOf` checks resolve current ownership. Single-owner burrows open their pet directly.
  Manual pet lookup remains available. The log can display additional already-scanned events.
- Logs are reread, not stored as an authoritative local index; ownership is multicall-checked at a
  shared block. Recent logs can change during a reorganization. Historical reads depend on the
  public providers' log range/availability. At scale, only the bounded scanned window is shown.
- `https://api.squeekchain.com/v1/status` supplies **only** wheel/status data. Its
  `measurement.rpmMilli / 1000` controls the wheel. IDLE, stale/future/malformed observations or a
  failed request stop the wheel under a night sky. Calendar, pet mood, progress and loot never use
  the API's projected work or settlement fields.
- Motion follows `prefers-reduced-motion`. A footer pause control also freezes illustration and
  canvas motion, and pauses the on-chain SVG displayed as an image. There is no site analytics.
  Chain-provided SVG is rendered as an image, never injected as HTML.

## Validation

```sh
cd web
npm test
npx playwright install chromium
npm run test:browser
npm run verify
```

The browser runner starts and closes its own foreground static server at a gateway-like subpath.
It uses in-memory EIP-1193/RPC fixtures and **never broadcasts** a real transaction. It writes
`docs/frontend/browser-results.json` and screenshots under `docs/frontend/screenshots/`.
`PLAYWRIGHT_EXECUTABLE_PATH` can select an existing Chromium executable. If a restricted machine
needs a different temporary directory, set `TMPDIR` to a writable scratch directory before running.
Playwright browser downloads, dependency/cache directories and scratch output are not deliverables.

See [the validation report](../docs/frontend/VALIDATION.md), [implemented design](../docs/DESIGN.md)
and [third-party notices](../docs/frontend/THIRD_PARTY.md). Browser screenshots use labeled test
fixtures; they are not evidence of pets minted on the live deployment. Live reads are separately
recorded in `docs/frontend/live-reads.json`. No paid, funded, production-wallet or live-chain write
was attempted. IPFS publication, fixed CID/named-site verification and an absolute sharing domain
belong to the subsequent publisher, not this frontend build.
