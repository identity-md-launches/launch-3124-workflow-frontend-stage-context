# Squeeklings implemented design

## Overview

Squeeklings is a free Sepolia pet game. Its interface uses warm paper, muted meadow greens and a
small illustrated burrow to make a contract interaction feel like tending a little home. The first
Hatchery screen contains the product, supply, wallet control and hatch action. Game state is always
contract-derived; the illustrative hatch scene is explicitly a preview.

The shell, typography and controls are shared across Hatchery, My Burrow, public pet pages, Meadow,
Expedition Log and How it works. The Meadow deliberately uses a separate pixel-art canvas world.
This is one light, cozy theme; there is no theme switch or invented dark UI variant. Night in the
Meadow is a signal state of its scene, not a second application theme.

This document is in `docs/` because the assignment's explicit write scope excludes root files.
It describes implemented source, not an additional proposed design system.

## Colors

Canonical semantic tokens live at the beginning of `web/src/styles.css`.

| Token                        | Value                 | Role                                         |
| ---------------------------- | --------------------- | -------------------------------------------- |
| `--page`                     | `#f7f2e7`             | Warm paper page                              |
| `--surface`                  | `#fffcf4`             | Action panels, fields, dialogs               |
| `--soft`                     | `#eee7d8`             | Quiet supporting groups, selected navigation |
| `--ink`                      | `#392f25`             | Primary text                                 |
| `--muted`                    | `#716452`             | Supporting text, explanations                |
| `--line`                     | `#d8cfba`             | Structural dividers, neutral button borders  |
| `--accent`                   | `#49603e`             | Primary filled action                        |
| `--accent-hover`             | `#354a2d`             | Primary action hover                         |
| `--focus`                    | `#8b4a26`             | 3px keyboard focus perimeter                 |
| `--error` / `--error-bg`     | `#8b3d30` / `#f8e6dd` | Recoverable failure text/surface             |
| `--success` / `--success-bg` | `#3a5832` / `#e8eddd` | Confirmed action text/surface                |

Illustration colors are local to `web/src/art.tsx`. Pixel-world day/night colors are local to
`MeadowCanvas` in `web/src/Meadow.tsx`; do not borrow those for UI text. Capsule rarity uses a static
word and white/green/blue/gold radial light, so rarity is never communicated by color alone.
Rendered contrast checks and their limits are recorded in the validation report; token values by
themselves are not a claim about every possible rendered background.

## Typography

The local Nunito variable Latin WOFF2 is loaded with `@font-face` from the pinned npm dependency.
The CSS requests weights 400–700, normal style, `font-display: swap`; the face is used at weights
400, 600 and 700. Fallbacks are Trebuchet MS and sans-serif. Georgia / Times New Roman / serif
provide the display heading. Browser checks confirmed the intended Nunito face loaded.

| Token            | Size at 16px root | Use                                              |
| ---------------- | ----------------- | ------------------------------------------------ |
| `--text-sm`      | 14px              | Supporting copy, navigation, status and metadata |
| `--text-base`    | 16px              | Body, inputs and buttons                         |
| `--text-lg`      | 18px              | Subheadings and event titles                     |
| `--text-title`   | 22px              | Section/dialog headings, mobile brand            |
| `--text-heading` | 28px              | Mobile h1, Hatchery panel heading, desktop brand |
| `--text-display` | 40px              | Desktop h1                                       |

Display h1 uses Georgia at 700, 1.12 line height and −0.035em tracking. Section h2 is 700 with
1.35 line height; body is 400 at 1.6. Supporting copy uses 1.5. Headings balance their wrapping,
paragraphs use `text-wrap: pretty`, and long-form rules stop near 72 characters. Supply, calendar
and address data use tabular numbers. Content keeps natural casing. Inputs remain at least 16px.

Complete addresses are reachable, copyable and linked to the configured explorer. The header alone
uses a short address; opening it exposes the full value. Large contract numbers use wrapping, never
ellipsis or a smaller font to force a fit.

## Layout

`container` is capped at 1,120px. Its desktop width is `100% − 64px`, then `100% − 40px` below 760px
and `100% − 32px` below 600px. The spacing vocabulary is 4, 8, 12, 16, 24, 32 and 48px; the CSS exposes
those as `--space-*` tokens while the implementation also uses corresponding literal spacing.

- Above 1,150px, the brand, navigation and wallet share a header row. Below it, navigation wraps
  to a second row while the wallet stays at the trailing edge.
- At 600px and below, three primary navigation entries remain in the header; Log and How it works
  stay available in the footer. Navigation text can wrap at 200% text size without widening a column.
- Hatchery uses a 1.25:1 scene/action layout with 48px gap, reducing the gap at intermediate widths.
  Mobile stacks the scene and action with a 210px scene. The 390×844 first screen includes hatch.
- Pet detail is a desktop portrait plus expedition panel. On mobile the final CSS override pairs a
  96px portrait with the trip heading, then gives route cards and the main action the full width.
  These final rules use `display: contents` on the section's layout box; section semantics remain.
- Equipment uses four columns on desktop and two on smaller screens. Inventories, pet collections,
  residents and catalog entries collapse to one column on phones. Long numeric values wrap fully.
- Wallet selection is centered on desktop and a bottom sheet below 600px, with safe-area padding.
  Native dialogs have bounded viewport height and internal scrolling.

320, 390, 760 and 1,440 CSS-pixel widths were checked. Text enlargement to 200% was checked separately
from browser-native zoom. Native zoom, RTL layout and physical-device behavior were not verified.

## Elevation & depth

Most of the interface is flat: space groups content, tonal surfaces support tasks, and borders mark
controls or structure. Modal dialogs and the account popover alone use soft elevation shadows.
No content panel combines a decorative border with a shadow. Capsule radial light is a reveal cue;
it is not used as a competing decoration around ordinary controls. Native modal backdrops make the
rest of the document inert while selection/reveal is open.

## Shapes

`--radius` is 20px for shared panels. The scene and dialogs use 24px, buttons/route choices use 12px,
inputs use 10px, and inner artwork usually uses 16px. A 24px outer portrait padding on desktop and
its nested 16px image preserve an intentional inset treatment. Small circular status indicators
always appear beside text. Seeds, leaves and round burrow doors are the product's illustration
language; icons use one outlined SVG set with `currentColor`.

## Components

| Source / pattern                                             | Intended use and implemented behavior                                                                                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `App.tsx` shell                                              | Hash routing, named navigation, skip link, route heading focus, wrong-chain notices, footer motion control                                                                           |
| `components.tsx` `PageIntro`                                 | One page title and plain supporting sentence, optional page utilities                                                                                                                |
| `art.tsx` `Icon`, `BurrowScene`, `RouteArt`                  | Shared outlined icons and original scene illustrations; decorative icons are hidden from accessibility APIs                                                                          |
| `wallet.tsx` `WalletUi`, `WalletControl`                     | Named EIP-6963 wallets, mobile open-in rows, Coinbase connector, switch/add-chain, account/disconnect; native dialog closes with Escape, backdrop or close button and restores focus |
| `transactions.tsx` `TxButton`                                | Neutral or primary action, action-specific checking/wallet/confirmation text, synchronous duplicate lock, verified network prerequisites                                             |
| `transactions.tsx` `TxFeedback`                              | Persistent inline state and explorer link; errors say how to retry; uncertain receipts keep their confirmation check                                                                 |
| `components.tsx` `AddressLink`                               | Full checksummed address, explorer link, copy status and copy failure recovery                                                                                                       |
| `components.tsx` `PetPreview`                                | Contract SVG as an image, actual image alt text, explicit unavailable-art fallback; motion pause can freeze the embedded SVG                                                         |
| `PetPage.tsx` route / equipment patterns                     | Native radios, real calendar-derived times, settlement state, pity meter with uncapped textual count, inventory ownership gating                                                     |
| `components.tsx` `CapsuleReveal`                             | Confirmed-event item only; drop/wobble/crack/glow when motion is allowed, static equivalent for reduced motion, item/rarity words in both modes                                      |
| `Meadow.tsx` `MeadowCanvas`                                  | Pixel scene capped at 150 real discovered pets; API-only wheel speed, contract-derived mood/progress, a parallel textual resident list                                               |
| `components.tsx` `Empty`, `Loading`, `ErrorNotice`, `Lookup` | Forward action in empty states, persistent named loading/error status, labeled lookup with input errors                                                                              |

Native `details` elements disclose ownership, public RPC provenance and advanced approvals. Standard
form controls keep their labels and keyboard behavior. Primary actions are green; peer utilities
stay neutral. A disabled action is accompanied by a reason or required-state explanation.

Motion is opt-in with `prefers-reduced-motion: no-preference`. Button press scale is 0.96,
interactive transitions are 150ms, and only named properties transition. The original hamster
breathes at 4 seconds and blinks at 6; capsule motion runs once. Canvas animation uses
`requestAnimationFrame`, honors reduced motion and can be paused. No `transition: all` is used.

## Do's and don'ts

- Start a page with `PageIntro` inside the shared shell and use the existing type scale and width.
- Reuse `TxButton` / `TxFeedback`; preserve the simulation, receipt and state-refresh lock.
- Keep wallet and contract/network configuration in the runtime deployment loader. A visual change
  must not replace ABI paths, router addresses, network switching or signing behavior.
- Put contract numbers and addresses in a wrapping container. Keep the whole value reachable.
- Use a label and text explanation in addition to status/rarity color. Respect the motion preference.
- Keep the product and its current action ahead of long explanation. Add explanatory rules to How
  it works rather than placing another marketing section above the game.
- Do not insert remote artwork, invented live counts, a paid game action, analytics, or API-derived
  game state. The separate public wheel signal cannot become an oracle for game results.

To add a page: add its hash branch and navigation placement in `App.tsx`, reuse `PageIntro` and
existing controls, put reads in the shared query/client layer, and validate at 320 and 390px plus
the gateway subpath. Update this document from the final source after any material visual change.
