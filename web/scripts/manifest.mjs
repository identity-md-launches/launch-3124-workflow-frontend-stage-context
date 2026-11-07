import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { abiHash, files, json, sha256 } from "./shared.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const handoff = await json(`${root}web/deployment-handoff.json`);
const chain = await json(`${root}web/network-handoff.json`);
const dist = `${root}dist/`;
await mkdir(`${dist}abi`, { recursive: true });
const contracts = [];
for (const c of handoff.contracts) {
  const abiPath = `abi/${c.name}.json`;
  const pinned = execFileSync(
    "git",
    ["show", `${handoff.sourceCommit}:docs/${abiPath}`],
    { cwd: root },
  );
  const abi = JSON.parse(pinned);
  if (!Array.isArray(abi) || abiHash(abi) !== c.abiHash)
    throw Error(`Pinned ABI hash mismatch: ${c.name}`);
  const local = await readFile(`${root}docs/${abiPath}`);
  if (!pinned.equals(local))
    throw Error(`Protected deployed ABI differs from source commit: ${c.name}`);
  await writeFile(`${dist}${abiPath}`, pinned);
  contracts.push({
    name: c.name,
    address: c.address,
    abiHash: c.abiHash,
    abiPath,
  });
}
await writeFile(
  `${dist}indexing.json`,
  JSON.stringify({
    deploymentBlock: Math.min(...handoff.contracts.map((c) => c.blockNumber)),
  }) + "\n",
);
const assets = [];
for (const p of await files(dist)) {
  if (p === "imd-deployment.json") continue;
  const bytes = await readFile(`${dist}${p}`);
  if (bytes.length > 8388608) throw Error(`Asset too large: ${p}`);
  assets.push({ path: p, sha256: sha256(bytes) });
}
if (assets.length > 128) throw Error("More than 128 exported assets");
const manifest = {
  version: 1,
  launchId: handoff.launchId,
  chainId: handoff.chainId,
  sourceCommit: handoff.sourceCommit,
  attestationHash: handoff.attestationHash,
  contracts,
  ...(handoff.poolKey ? { poolKey: handoff.poolKey } : {}),
  ...chain,
  assets,
};
await writeFile(
  `${dist}imd-deployment.json`,
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `Manifest: ${contracts.length} verified pinned ABIs, ${assets.length} assets.`,
);
