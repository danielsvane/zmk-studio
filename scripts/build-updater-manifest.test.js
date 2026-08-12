import { describe, expect, it } from "vitest";

import { buildManifest } from "./build-updater-manifest.js";

const release = {
  tagName: "v0.4.0",
  publishedAt: "2026-08-12T18:01:16Z",
  body: "### Features\n\n* combos",
  assets: [
    { name: "ZMK.Studio_0.4.0_amd64.AppImage", url: "https://gh/amd64.AppImage" },
    {
      name: "ZMK.Studio_0.4.0_aarch64.AppImage",
      url: "https://gh/aarch64.AppImage",
    },
    { name: "ZMK.Studio.app.tar.gz", url: "https://gh/mac.app.tar.gz" },
    { name: "ZMK.Studio_0.4.0_x64-setup.exe", url: "https://gh/setup.exe" },
  ],
};

const artifacts = [
  { name: "ZMK.Studio_0.4.0_amd64.AppImage", signature: "sig-linux" },
  { name: "ZMK.Studio_0.4.0_aarch64.AppImage", signature: "sig-linux-arm64" },
  // The bundler names this after the .app bundle, space and all.
  { name: "ZMK Studio.app.tar.gz", signature: "sig-mac" },
  { name: "ZMK.Studio_0.4.0_x64-setup.exe", signature: "sig-windows" },
];

describe("buildManifest", () => {
  it("covers every updater target, pairing names GitHub rewrote", () => {
    const manifest = buildManifest({ release, artifacts, version: "0.4.0" });

    expect(Object.keys(manifest.platforms).sort()).toEqual([
      "darwin-aarch64",
      "darwin-x86_64",
      "linux-aarch64",
      "linux-x86_64",
      "windows-x86_64",
    ]);
    // "ZMK Studio.app.tar.gz" still has to find "ZMK.Studio.app.tar.gz".
    expect(manifest.platforms["darwin-aarch64"]).toEqual({
      signature: "sig-mac",
      url: "https://gh/mac.app.tar.gz",
    });
    // amd64 and aarch64 both end in "64.AppImage"; they must not cross over.
    expect(manifest.platforms["linux-x86_64"].signature).toBe("sig-linux");
    expect(manifest.platforms["linux-aarch64"].signature).toBe("sig-linux-arm64");
    expect(manifest.version).toBe("0.4.0");
    expect(manifest.pub_date).toBe("2026-08-12T18:01:16Z");
  });

  it("refuses to strand a platform on a missing artifact", () => {
    expect(() =>
      buildManifest({
        release,
        artifacts: artifacts.filter((a) => !a.name.endsWith("-setup.exe")),
        version: "0.4.0",
      }),
    ).toThrow(/-setup\.exe/);
  });

  it("refuses to sign an artifact that never reached the release", () => {
    expect(() =>
      buildManifest({
        release: {
          ...release,
          assets: release.assets.filter((a) => !a.name.endsWith(".app.tar.gz")),
        },
        artifacts,
        version: "0.4.0",
      }),
    ).toThrow(/not attached to v0\.4\.0/);
  });

  it("refuses a release that is not the version being built", () => {
    expect(() =>
      buildManifest({ release, artifacts, version: "0.4.1" }),
    ).toThrow(/does not match/);
  });
});
