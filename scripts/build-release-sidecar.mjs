import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2];

const targets = {
  "universal-apple-darwin": [
    { goos: "darwin", goarch: "arm64", triple: "aarch64-apple-darwin" },
    { goos: "darwin", goarch: "amd64", triple: "x86_64-apple-darwin" },
  ],
  "x86_64-pc-windows-msvc": [
    {
      goos: "windows",
      goarch: "amd64",
      triple: "x86_64-pc-windows-msvc",
      ext: ".exe",
    },
  ],
  "x86_64-unknown-linux-gnu": [
    { goos: "linux", goarch: "amd64", triple: "x86_64-unknown-linux-gnu" },
  ],
};

const specs = targets[target];
if (!specs) {
  throw new Error(`Unsupported sidecar target: ${target}`);
}

const outDir = path.join(root, "src-tauri", "binaries");
mkdirSync(outDir, { recursive: true });

const built = [];
for (const spec of specs) {
  const output = path.join(
    outDir,
    `kubeview-engine-${spec.triple}${spec.ext ?? ""}`,
  );
  rmSync(output, { force: true });
  console.log(
    `Building engine for ${spec.goos}/${spec.goarch} -> ${path.basename(output)}`,
  );
  execFileSync(
    "go",
    [
      "build",
      "-trimpath",
      "-ldflags",
      "-s -w",
      "-o",
      output,
      "./cmd/kubeview-engine",
    ],
    {
      cwd: path.join(root, "engine"),
      env: {
        ...process.env,
        CGO_ENABLED: "0",
        GOOS: spec.goos,
        GOARCH: spec.goarch,
      },
      stdio: "inherit",
    },
  );
  chmodSync(output, 0o755);
  built.push(output);
}

if (specs.length > 1) {
  const universalPath = path.join(outDir, `kubeview-engine-${target}`);
  rmSync(universalPath, { force: true });
  execFileSync("lipo", ["-create", ...built, "-output", universalPath], {
    stdio: "inherit",
  });
  chmodSync(universalPath, 0o755);
  console.log(`Universal sidecar ready: ${path.relative(root, universalPath)}`);
}

console.log(`Sidecar(s) ready for ${target}`);
