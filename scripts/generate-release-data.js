import fs from "fs/promises";
import path from "path";
import url from "url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.resolve(__filename, "../..");

async function generateReleaseData() {
  try {
    // This fork's own release, not upstream's: the desktop app carries the combos
    // and custom behaviour work, so upstream's installers would not match the site
    // they are offered from. tauri-build keeps the `latest` release in step with
    // whatever customkeyboards is serving.
    //
    // Addressed by tag rather than through /releases/latest, because two consumers
    // want different things: this page wants the build matching the deployed site,
    // while the updater endpoint wants the newest tagged version. /releases/latest
    // resolves by created_at, so merging a release PR pointed it at the versioned
    // release release-please had just created empty, and a release with no assets
    // fails the build rather than the page.
    const response = await fetch(
      "https://api.github.com/repos/danielsvane/zmk-studio/releases/tags/latest",
      {
        headers: process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {},
      },
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const dataFilePath = path.resolve(
      __dirname,
      "src",
      "data",
      "release-data.json",
    );
    await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
    await fs.writeFile(dataFilePath, JSON.stringify(data));

    console.log("Release data generated successfully!");
  } catch (error) {
    console.error("Error generating release data:", error);
    process.exit(1);
  }
}

generateReleaseData();
