import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { abiHash, files, json, sha256 } from "./shared.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const manifest = await json(`${root}dist/imd-deployment.json`);
const handoff = await json(`${root}web/deployment-handoff.json`);
const network = await json(`${root}web/network-handoff.json`);
const allowed = [
  "version",
  "launchId",
  "chainId",
  "sourceCommit",
  "attestationHash",
  "contracts",
  "assets",
  "network",
  "walletAddChain",
  ...(handoff.poolKey ? ["poolKey"] : []),
];
assert.deepEqual(Object.keys(manifest).sort(), allowed.sort());
for (const k of [
  "version",
  "launchId",
  "chainId",
  "sourceCommit",
  "attestationHash",
])
  assert.deepEqual(manifest[k], handoff[k]);
for (const [k, v] of Object.entries(network)) assert.deepEqual(manifest[k], v);
if (handoff.poolKey) assert.deepEqual(manifest.poolKey, handoff.poolKey);
assert.equal(manifest.contracts.length, handoff.contracts.length);
for (let i = 0; i < handoff.contracts.length; i++) {
  const c = manifest.contracts[i],
    h = handoff.contracts[i];
  for (const k of ["name", "address", "abiHash"]) assert.equal(c[k], h[k]);
  assert.match(c.abiPath, /^abi\/[A-Za-z0-9_-]+\.json$/);
  assert.equal(abiHash(await json(`${root}dist/${c.abiPath}`)), c.abiHash);
}
const disk = (await files(`${root}dist`)).filter(
  (p) => p !== "imd-deployment.json",
);
assert.deepEqual(manifest.assets.map((a) => a.path).sort(), disk);
assert.ok(disk.length <= 128);
let total = 0;
for (const a of manifest.assets) {
  assert.ok(
    !a.path.startsWith("/") &&
      !a.path.includes("..") &&
      !a.path.includes("://"),
  );
  assert.match(a.sha256, /^[a-f0-9]{64}$/);
  const p = `${root}dist/${a.path}`,
    b = await readFile(p);
  total += b.length;
  assert.ok((await stat(p)).size <= 8388608);
  assert.equal(sha256(b), a.sha256, a.path);
}
assert.ok(
  total < 24 * 1024 * 1024,
  "Export needs HTTP verification budget headroom",
);
console.log(
  `PASS: exact handoff, network, ${manifest.contracts.length} ABI hashes, ${disk.length} asset hashes, ${total} exported bytes.`,
);
