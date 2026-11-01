import {
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import path from "node:path";

/**
 * Build the Tauri updater manifest from signed bundle artifacts.
 *
 * Usage: node scripts/generate-updater-manifest.mjs <distDir> <version> <tag> [notesFile]
 */
const [distArg, versionArg, tagArg, notesFile] = process.argv.slice(2);
if (!distArg || !versionArg || !tagArg) {
  console.error(
    "Usage: node scripts/generate-updater-manifest.mjs <distDir> <version> <tag> [notesFile]",
  );
  process.exit(2);
}

const distDir = path.resolve(distArg);
const version = versionArg.replace(/^v/, "");
const tag = tagArg.startsWith("v") ? tagArg : `v${version}`;
const repo = process.env.RELEASE_REPO || "PorKeat/KubeView";

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const files = walk(distDir);
const byName = (suffix) =>
  files.filter((file) => file.endsWith(suffix) && !file.endsWith(".sig"));

function signatureFor(file) {
  const signatureFile = `${file}.sig`;
  if (!existsSync(signatureFile)) {
    throw new Error(`Missing signature for ${path.basename(file)}`);
  }
  return readFileSync(signatureFile, "utf8").trim();
}

function platformEntry(file) {
  return {
    signature: signatureFor(file),
    url: `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(
      path.basename(file),
    )}`,
  };
}

const platforms = {};

const macArchives = byName(".app.tar.gz");
if (macArchives.length > 0) {
  const entry = platformEntry(macArchives[0]);
  platforms["darwin-aarch64"] = entry;
  platforms["darwin-x86_64"] = entry;
}

const windowsInstallers = byName(".exe");
if (windowsInstallers.length > 0) {
  platforms["windows-x86_64"] = platformEntry(windowsInstallers[0]);
}

const linuxApplications = byName(".AppImage");
if (linuxApplications.length > 0) {
  platforms["linux-x86_64"] = platformEntry(linuxApplications[0]);
}

if (Object.keys(platforms).length === 0) {
  console.error(
    "No updater archives found. Ensure bundle.createUpdaterArtifacts is enabled and signing env is set.",
  );
  process.exit(1);
}

const notes =
  notesFile && existsSync(notesFile)
    ? readFileSync(notesFile, "utf8").trim()
    : `KubeView ${version}`;

const manifest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms,
};

const output = path.join(distDir, "latest.json");
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${output}`);
console.log(JSON.stringify(manifest, null, 2));
