import fs from "fs";
import path from "path";
import url from "url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.resolve(__filename, "../..");

// The updater asks its endpoint for exactly these keys, built from the running
// app's OS and architecture. A key we leave out reads as "no update for this
// platform" rather than as an error, so a quietly missing artifact would strand
// that platform on its installed version forever — hence buildManifest throws
// instead of ever emitting a partial manifest.
const TARGETS = [
  { suffix: "amd64.AppImage", platforms: ["linux-x86_64"] },
  { suffix: "aarch64.AppImage", platforms: ["linux-aarch64"] },
  // One universal bundle answers for both Mac architectures.
  { suffix: ".app.tar.gz", platforms: ["darwin-x86_64", "darwin-aarch64"] },
  // The NSIS installer rather than the .msi: `installMode: passive` drives the
  // setup executable, and it upgrades an msi-installed copy just as well.
  { suffix: "-setup.exe", platforms: ["windows-x86_64"] },
];

// GitHub rewrites characters it will not put in an asset URL, so the file the
// bundler produced ("ZMK Studio.app.tar.gz") and the asset it became
// ("ZMK.Studio.app.tar.gz") do not compare equal. This normalisation exists only
// to pair the two up; the URL itself always comes from the API response.
export function assetKey(name) {
  return name.replace(/[^a-z0-9]+/gi, ".").toLowerCase();
}

export function buildManifest({ release, artifacts, version }) {
  if (release.tagName !== `v${version}`) {
    throw new Error(
      `release ${release.tagName} does not match package.json's ${version}`,
    );
  }

  const assetsByKey = new Map(
    release.assets.map((asset) => [assetKey(asset.name), asset]),
  );
  const platforms = {};
  const missing = [];

  for (const target of TARGETS) {
    const artifact = artifacts.find((a) => a.name.endsWith(target.suffix));
    if (!artifact) {
      missing.push(`nothing matching *${target.suffix} was built and signed`);
      continue;
    }
    const asset = assetsByKey.get(assetKey(artifact.name));
    if (!asset) {
      missing.push(
        `${artifact.name} was built but is not attached to ${release.tagName}`,
      );
      continue;
    }
    for (const platform of target.platforms) {
      platforms[platform] = { signature: artifact.signature, url: asset.url };
    }
  }

  if (missing.length > 0) {
    throw new Error(`incomplete updater manifest:\n  ${missing.join("\n  ")}`);
  }

  return {
    version,
    // Passed through whole. How much of a release's changelog to show is the
    // update UI's decision, not this script's.
    notes: release.body ?? "",
    pub_date: release.publishedAt || release.createdAt,
    platforms,
  };
}

// Pairs each signed bundle with the detached signature the bundler dropped next
// to it. Those .sig files are deliberately not release assets: the signature
// travels inside the manifest, and an extra `*.exe.sig` asset would be matched
// by the download page's unanchored /.*\.exe/ pattern.
function collectArtifacts(dir) {
  const entries = fs.readdirSync(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sig"))
    .map((entry) => ({
      name: entry.name.slice(0, -".sig".length),
      signature: fs
        .readFileSync(path.join(entry.parentPath ?? entry.path, entry.name), "utf8")
        .trim(),
    }));
}

function main(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    args.set(argv[i], argv[i + 1]);
  }
  const release = args.get("--release");
  const artifacts = args.get("--artifacts");
  const out = args.get("--out");
  if (!release || !artifacts || !out) {
    throw new Error(
      "usage: build-updater-manifest.js --release <json> --artifacts <dir> --out <json>",
    );
  }

  const { version } = JSON.parse(
    fs.readFileSync(path.join(__dirname, "package.json"), "utf8"),
  );
  const manifest = buildManifest({
    release: JSON.parse(fs.readFileSync(release, "utf8")),
    artifacts: collectArtifacts(artifacts),
    version,
  });

  fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `wrote ${out} for ${version}: ${Object.keys(manifest.platforms).join(", ")}`,
  );
}

// Importable from the test without running the CLI.
if (process.argv[1] === __filename) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
