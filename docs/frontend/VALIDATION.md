# Squeeklings frontend validation

Complete for the permitted frontend source/export/evidence delivery scope. Local Git staging and
commit are unavailable: `git add -- web dist docs` failed because `.git/index.lock` is on a read-only
filesystem. The files are delivered in the workspace for the submission process; no local commit
is claimed. This is the worker's local
validation report, not independent certification. The subsequent publisher's IPFS/CID/named-site
checks have not run here. No site was published and no contract was deployed or modified.

## Delivered scope and assumptions

The approved game is a free ERC-721 pet game on Sepolia, without a fungible token, swap, payments,
payouts, or liquidity. The runtime loads the delivered `dist/imd-deployment.json` and its two
implementation-derived ABIs. It uses the exact handoff contracts and network configuration.

Implemented: Hatchery; My Burrow with a direct pet view for a single owned pet and collection view
otherwise; animated on-chain SVG, pity, inventory and equipment; real-time route durations; Away /
Waiting for settlement / Ready / older-epoch Fog states; confirmed-event capsule reveal; public
pixel Meadow and resident list; shared event log; public pet links with Share on X; full rules,
rarities, pity, welfare and deployment information. Advanced NFT permissions/transfer and the
connected administrator's sole `setCore` action are also exposed.

The cozy light theme, original burrow art and pixel Meadow are ordinary design choices inferred
from the approved brief. No fabricated pets, loot, counts or game outcomes appear in production.
Screenshots in this directory explicitly use deterministic browser-test fixtures, except the
`probe-*` screenshots, which show the worker's disconnected/public-endpoint-failure state.

The root `DESIGN.md` location conflicts with the explicit write scope. The full implemented design
is delivered at **`docs/DESIGN.md`**; no root file was created. The original root README and contract
sources remain unchanged. `web/.gitignore` is the only changed dotfile, with an explicit path budget
of nested `node_modules`, `.npm`, `.cache`, `.vite`, coverage, test-results and playwright-report
under `web/`. Dependency/cache directories and browser downloads are excluded from the submission.

## Verification results

| Check                           | Result / evidence                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production build and TypeScript | `npm run build --prefix web` passed; includes `tsc --noEmit`. Standalone `npm run typecheck --prefix web` also passed.                                                                            |
| Pinned ABIs                     | Both raw ABI arrays loaded with `git show` at `e382a7cbd4f4f50e047a3b5a20af6957a3985484`; canonical Keccak matched the handoff.                                                                   |
| Export manifest                 | `npm run verify --prefix web` passed: exact handoff/network, 2 ABI hashes, all 18 exported asset hashes; manifest excludes itself.                                                                |
| Export size                     | 988,828 asset bytes before the manifest; largest asset about 670 KB. Well below the 8 MiB/file, 128-asset and HTTP response-budget bounds.                                                        |
| Unit tests                      | `npm test --prefix web`: 6/6 passed. Expedition state/progress, calendar formatting, input safety, wheel freshness and error translation.                                                         |
| Production interactions         | `npm run test:browser --prefix web`: 27/27 checks passed in Chromium headless shell, with mocked wallet/RPC, against actual `dist/` served at a gateway-like subpath. See `browser-results.json`. |
| Axe                             | No violations on the four tested Hatchery / pet / Meadow / rules pages. This is an automated scan, not full accessibility certification.                                                          |
| Design probe                    | Pinned taste@1: 16/16 checks passed on the final export, measuring 320, 390 and 1440 widths. See `taste.json`.                                                                                    |
| Development middleware smoke    | Same manifest, both ABI arrays, indexing boundary and Vite entrypoint served successfully; `dev-smoke.json`. Development HMR was not interaction-tested.                                          |
| Read-only chain checks          | Chain 11155111, nonempty code for both attested contracts, correct renderer, readable core calendar/state and zero live supply at block 12,085,786; `live-reads.json`.                            |

The build has a non-fatal Vite advisory that its main uncompressed chunk exceeds 500 KB (about
207 KB gzip). No dependency archives, source maps, registry mirror, submodule or vendored npm
registry are included. Runtime fonts, imagery, wallet marks and license notices are local assets.

The design probe was invoked from the repository root:

```sh
node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

For this machine, its `IMD_PLAYWRIGHT` module adapter selected the installed Chromium headless shell
and `TMPDIR` selected the authorized scratch directory. The probe itself was unchanged. Its
original scratch outputs are removable; the final JSON and representative screenshots are copied
here as durable evidence. The provided MCP browser attempted to launch full Chrome and failed
with **“Socket path too long”**. Direct Chromium headless-shell Playwright rendering succeeded.

For ordinary reruns, use the commands in `web/README.md`; the browser runner supports an existing
Chromium executable via `PLAYWRIGHT_EXECUTABLE_PATH`. Each runner owns and closes its test server
and browser; no persistent shell server is needed by the export.

## Interaction coverage

The delivered browser runner validates actual production DOM/requests, with in-memory RPC and
EIP-1193 providers rather than keys or funded wallets:

- Gateway-subpath bootstrap, runtime manifest and ABI requests, local font/art resources, and no
  unhandled JavaScript errors or missing local resources.
- Product, wallet and hatch button within the 390×844 first screen. Same first action remains
  visible when public RPC reads fail; verbose request bodies/selectors never reach the interface.
- Native dialog opening with the keyboard, Escape close, focus return and a visible focus ring;
  named EIP-6963 provider and hiding the generic row; four mobile open-in links and Coinbase row;
  an EIP-6963-only mobile provider remains connectable without `window.ethereum`.
- Wrong chain, exact unknown-chain add parameters and subsequent switch. Required write controls
  remain disabled for wrong network or missing code.
- Actual hatch simulation before a double-click attempt; only one zero-value mock transaction;
  confirmed event selects the minted pet ID.
- Equipment/unequipment, native route selection, actual 10-minute calendar-derived 1/3/6-hour
  route labels, Away / waiting / ready states, confirmed Legendary Dream item reveal and pity reset.
- Wallet rejection, failed simulation, eligibility after transferring a pet away, supply cap,
  core signal loss, older-epoch readiness and configured public RPC fallback.
- Safe transfer and address validation, single-pet approval/revocation, acknowledged operator
  grant/revocation, connected administrator
  `setCore`, and single-pet My Burrow SVG/pity/route controls.
- Public disconnected Meadow, log discovery and Multicall3 reads, API wheel speed, and reduced-motion
  control. Wheel idle/stale/malformed handling also has separate unit coverage.
- Full addresses/account menus/rules at 320, 390, 760 and 1440; 200% text enlargement at 390; and
  very large 256-bit-like ages and inventory counts at 320/390 without clipping or sideways scroll.

Some browser logs show `ERR_ABORTED` for the Coinbase SDK's entrypoint HEAD probe or a read canceled
by intentional navigation/teardown. Those were distinguished from missing local files, application
exceptions and unexpected resource failures. No production resource 404 or uncaught page exception
was observed in the asserted main flow. Tests deliberately inject RPC errors and wallet rejections.

## Better Interface consolidated review

Visual idea: a free on-chain hamster game presented as a warm paper field guide beside its own
little burrow, with the public world rendered in pixels.

| Domain                  | Coverage and limits                                                                                                                                                                                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility — Checked | Native buttons/radios/forms/details/dialogs, names and labels, keyboard wallet picker, Escape/focus return, visible focused skip link screenshot, status landmark, semantic pity meter, automated Axe and reduced motion. No screen-reader session, forced-colors manual pass or physical assistive-technology test. |
| Layout — Checked        | Rendered production export at 320/390/760/1440; first-screen hatch; long addresses/counts; open account/wallet menus; error state; 200% text resize. Native browser zoom and RTL/pseudo-localization not verified.                                                                                                   |
| Writing — Checked       | Primary labels name actions, gas cost is distinct from free gameplay, illustrations are labeled, unknown settlement stays unknown, errors remain actionable, rare/pity/welfare rules match implementation. Repeated taglines removed.                                                                                |
| Typography — Checked    | Six-size scale, two families, three weights; locally loaded Nunito confirmed. Full addresses and numeric values wrap; headings and main action observed at phone widths. No locale-specific typography review.                                                                                                       |
| Colors — Checked        | Probe's measured pairs pass 4.5:1 normal / 3:1 large; Axe found no contrast violation on the four tested pages. Rarity has words as well as color. Illustration pixels/gradients and every possible dynamic SVG are not a comprehensive measured-text contrast claim.                                                |
| UI — Checked            | Primary/neutral control distinction, disabled/loading/error/success states, native overlays, hover/press CSS, capsule stages and reduced-motion equivalent, restrained keyframes and pause control. Browser animation-panel 10% playback and physical touch were not performed.                                      |

### Findings fixed and rechecked

Source locations below refer to the final source and identify the correction, rather than a stale
line from an earlier intermediate version.

| Severity / domain          | Source and observed issue                                                                                                                                            | Fix and recheck                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| High / layout + writing    | `web/src/components.tsx:68`, `web/src/App.tsx:136`: raw RPC failure text above the game expanded the 390 screen and displaced hatch.                                 | Shared plain-English error mapping; service notices follow the main product content. Offline first-screen assertion and final screenshots pass. |
| High / transaction UI      | `web/src/transactions.tsx:71`: success could enable another action before the refreshed read released the synchronous lock. Reproduced by equip followed by unequip. | Hold confirmation state/lock through cache invalidation; then publish success. Consecutive equipment actions and duplicate hatch clicks pass.   |
| Medium / accessibility     | `web/src/components.tsx:94`: standalone status text fell outside a named landmark in Axe.                                                                            | Named `aside` for Squeekchain status. Final Axe pages have no region finding.                                                                   |
| High / layout + typography | `web/src/styles.css:1773`: navigation widened the page under 200% text sizing.                                                                                       | Zero-minimum grid columns, block links and wrapping. 200% and 320/390 reflow tests pass.                                                        |
| High / layout + typography | `web/src/styles.css:1812`: a very large inventory count imposed a flex intrinsic width beyond 320px.                                                                 | Zero minimum widths plus full numeric wrapping; inventory actions get a mobile row. 256-bit-like fixture values pass at both narrow widths.     |
| Medium / writing           | `web/src/Hatchery.tsx:35`: repeated two-beat copy and a repeated caption/footer line.                                                                                | Kept one identity line, replaced the redundant caption and section/link copy. Final probe repetition/slogan checks pass.                        |
| Medium / layout            | `web/src/styles.css:1825`: the large pet portrait pushed route controls too far down on a phone.                                                                     | Compact 96px portrait/summary above full-width routes and action; final pet screenshot reviewed.                                                |
| Low / UI                   | `web/src/components.tsx:239`: revealing an item swapped the button's primary variant during a background transition.                                                 | Keep the single reveal/close action primary in both stages; final capsule screenshot reviewed.                                                  |

No unresolved high or medium implementation finding remains from these checks. A future browser
or physical-device check can still reveal issues outside this coverage.

## Evidence files and limitations

Durable screenshots: `screenshots/hatchery-390.png`, `pet-390.png`, `capsule-390.png`,
`meadow-1440.png`, `wallet-390.png`, `focus-390.png`, and final `probe-*` screenshots. Mock-state
images document layout and behavior; the live deployment still had zero pets at the separately
checked block. Capsule/item screenshots must never be used as claims of a real live-chain return.

Not performed: a live hatch/expedition/return/transfer/permission/core replacement; a funded wallet
or hardware wallet; Coinbase passkey signup/authentication; real mobile app hand-off; mainnet
behavior; unknown-confirmation timeout/retry and wallet replacement branches against a real wallet;
physical Safari/iOS/Android; screen reader; native zoom; comprehensive Canvas pixel verification.

WebKit was downloaded in authorized scratch and a launch was attempted. It was **unavailable due
to missing system libraries**, including GTK4, GStreamer/GL, libavif and related dependencies.
No WebKit interaction pass is claimed. Public browser requests from the worker can fail because of
its sandbox/network; authoritative worker read-only checks used the task's contributor RPC while
recording only the configured public source names. Real hosted gateway CORS/provider availability
remains unverified until publication.

Open Graph metadata and a real local PNG share card are included. Their paths remain relative
because the final hosting domain/CID is assigned after this worker. Publication and absolute-domain
unfurl behavior are `after review`, not faked completion. The source/export and all required runtime
assets are complete within the permitted write scope.
