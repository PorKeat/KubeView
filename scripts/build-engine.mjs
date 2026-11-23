import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const exe = process.platform === "win32" ? ".exe" : "";
const output = path.join("bin", `kubeview-engine${exe}`);

mkdirSync(path.join(root, "engine", "bin"), { recursive: true });

const ldflags = [
  "-s",
  "-w",
  `-X github.com/kubeview/engine/internal/ipc.EngineVersion=${pkg.version}`,
].join(" ");

execFileSync(
  "go",
  [
    "-C",
    "engine",
    "build",
    "-ldflags",
    ldflags,
    "-o",
    output,
    "./cmd/kubeview-engine",
  ],
  { cwd: root, stdio: "inherit" },
);

if (process.platform !== "win32") {
  chmodSync(path.join(root, "engine", output), 0o755);
}

console.log(`Built engine/bin/kubeview-engine${exe} (v${pkg.version})`);
