# Third-party notices

The original burrow illustration, pixel scene, favicon and share composition are implemented in
`web/src/art.tsx` / `web/src/Meadow.tsx` for this frontend. The site uses no remote image service.

- Nunito variable Latin font is from `@fontsource-variable/nunito`, by the Nunito Project Authors,
  under SIL OFL 1.1. Its license is included in the source and export at
  `web/public/licenses/Nunito.txt` / `dist/licenses/Nunito.txt`.
- MetaMask, Rabby and Phantom wallet marks are copied from RainbowKit's wallet connector assets;
  Coinbase uses the supplied wallet-connector reference mark. RainbowKit is MIT, copyright Rainbow.
  Its notice is included at `web/public/licenses/RainbowKit.txt` and in the export. Wallet marks
  identify their respective third-party wallets; no affiliation is claimed.
- React, React DOM, viem, wagmi, wagmi core, TanStack Query and Coinbase Wallet SDK licenses are
  retained in `web/public/licenses/Frontend-dependencies.txt` and the static export. The SDK's
  copyright notice identifies its Apache-2.0 license; the full Apache-2.0 text is also retained in
  `docs/frontend/licenses/Better-Interface.txt` as part of the pinned design guidance's licenses.
- Better Interface design guidance is adapted from Jakub Krehel's pinned
  `267330e1adfc66a718fb65fa6918c1f06d0a689e` revision, MIT. The design-documentation method is adapted
  from Paul Bakaus's Impeccable at `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`, Apache-2.0.
  Their supplied notices/licenses are retained at `licenses/Better-Interface.txt`.
- Contract UX guidance is adapted from Austin Griffith's ethskills at `06ea4efa0807`, MIT.
  Its supplied license and provenance notice are retained at `licenses/eth-frontend-ux.txt`.
- Wallet connector structure follows the supplied no-relay guide. The Rabby open-in URL uses the
  official application's `_cmd=open-dapp&dapp=...` parser, as inspected in
  [Rabby's source](https://github.com/RabbyHub/rabby-mobile/blob/develop/apps/mobile/src/hooks/universalLink.ts).
  Mobile app hand-off and third-party service availability remain physical-device checks.

No upstream skill or documentation file was treated as authority to widen the assignment or alter
contract behavior, ownership, economics or the allowed write paths.
