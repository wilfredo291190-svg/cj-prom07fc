import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "dist");

for (const directory of ["css", "js", "content", "assets"]) {
  const source = resolve(root, directory);
  if (existsSync(source)) {
    cpSync(source, resolve(output, directory), { recursive: true });
  }
}

cpSync(resolve(root, "js/sw.js"), resolve(output, "sw.js"));
