import { keccak256, stringToHex } from "viem";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
export const stable = (value) =>
  Array.isArray(value)
    ? value.map(stable)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((k) => [k, stable(value[k])]),
        )
      : value;
export const abiHash = (abi) =>
  keccak256(stringToHex(JSON.stringify(stable(abi)))).slice(2);
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export async function files(root, prefix = "") {
  const entries = await readdir(path.join(root, prefix), {
    withFileTypes: true,
  });
  const all = await Promise.all(
    entries.map((e) =>
      e.isDirectory()
        ? files(root, path.join(prefix, e.name))
        : path.join(prefix, e.name).replaceAll("\\", "/"),
    ),
  );
  return all.flat().sort();
}
export const json = async (p) => JSON.parse(await readFile(p, "utf8"));
