// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collect, manifests, platforms, stage } from "./release.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "bundlewhy-release-test-"),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("public launcher pins all native optional packages to the same version", () => {
  const packages = manifests("0.1.0");
  assert.equal(packages.launcher.name, "@delino/bundlewhy");
  assert.equal(packages.launcher.private, undefined);
  assert.deepEqual(packages.launcher.optionalDependencies, {
    "@delino/bundlewhy-darwin-arm64": "0.1.0",
    "@delino/bundlewhy-linux-x64-gnu": "0.1.0",
    "@delino/bundlewhy-win32-x64-msvc": "0.1.0",
  });
  assert.deepEqual(packages["linux-x64-gnu"].libc, ["glibc"]);
  for (const [suffix, platform] of Object.entries(platforms)) {
    assert.deepEqual(packages[suffix].os, [platform.os]);
    assert.deepEqual(packages[suffix].cpu, [platform.cpu]);
    assert.equal(packages[suffix].version, packages.launcher.version);
  }
  for (const version of ["0.0.0", "0.1.0-beta", "../0.1.0", "01.0.0"])
    assert.throws(() => manifests(version));
});

test("native staging includes licenses and only the selected executable", (t) => {
  const root = fixture(t);
  const binary = path.join(root, "fixture-binary");
  fs.writeFileSync(binary, "fixture native executable");
  for (const suffix of Object.keys(platforms)) {
    const output = path.join(root, suffix);
    fs.mkdirSync(output);
    const thirdParty = [
      {
        name: "fixture",
        files: [{ file: "LICENSE", text: "fixture license" }],
      },
    ];
    stage({ output, suffix, binary, thirdParty, releaseVersion: "0.1.0" });
    const native = path.join(output, suffix);
    assert.deepEqual(fs.readdirSync(native).sort(), [
      "LICENSE",
      "NOTICE",
      "README.md",
      "THIRD-PARTY-LICENSES.json",
      "bin",
      "package.json",
    ]);
    assert.deepEqual(fs.readdirSync(path.join(native, "bin")), [
      suffix.startsWith("win32") ? "bundlewhy.exe" : "bundlewhy",
    ]);
    assert.deepEqual(
      JSON.parse(
        fs.readFileSync(path.join(native, "THIRD-PARTY-LICENSES.json")),
      ),
      thirdParty,
    );
    assert.doesNotMatch(
      fs.readFileSync(path.join(native, "README.md"), "utf8"),
      /not published/,
    );
    assert.throws(() =>
      stage({
        output,
        suffix,
        binary,
        thirdParty: [],
        releaseVersion: "0.1.0",
      }),
    );
  }
});

function artifacts(root) {
  for (const [suffix, platform] of Object.entries(platforms)) {
    const directory = path.join(root, `release-${suffix}`);
    fs.mkdirSync(directory);
    fs.writeFileSync(
      path.join(directory, "delino-bundlewhy-0.1.0.tgz"),
      "same launcher",
    );
    fs.writeFileSync(
      path.join(directory, `delino-bundlewhy-${suffix}-0.1.0.tgz`),
      suffix,
    );
    fs.writeFileSync(
      path.join(directory, `acceptance-${suffix}.json`),
      JSON.stringify({
        platform: `${platform.os}-${platform.cpu}`,
        records: ["vite", "rspack"].map((bundler) => ({
          bundler,
          status: "RUN_STATUS_COMPLETE",
          problems: [],
        })),
      }),
    );
  }
}

test("publication collection requires every platform and matching launcher bytes", (t) => {
  const root = fixture(t);
  artifacts(root);
  collect(root, path.join(root, "valid"), "0.1.0");
  assert.equal(fs.readdirSync(path.join(root, "valid")).length, 4);
  fs.writeFileSync(
    path.join(root, "release-linux-x64-gnu/delino-bundlewhy-0.1.0.tgz"),
    "different launcher",
  );
  assert.throws(
    () => collect(root, path.join(root, "invalid"), "0.1.0"),
    /Launcher tarballs differ/,
  );
  assert.equal(fs.existsSync(path.join(root, "invalid")), false);
  fs.rmSync(path.join(root, "release-darwin-arm64"), { recursive: true });
  assert.throws(() => collect(root, path.join(root, "missing"), "0.1.0"));
});

test("failed native acceptance blocks artifact collection", (t) => {
  const root = fixture(t);
  artifacts(root);
  const file = path.join(
    root,
    "release-win32-x64-msvc/acceptance-win32-x64-msvc.json",
  );
  const report = JSON.parse(fs.readFileSync(file));
  report.records[0].problems.push("project files changed");
  fs.writeFileSync(file, JSON.stringify(report));
  assert.throws(() => collect(root, path.join(root, "failed"), "0.1.0"));
  assert.equal(fs.existsSync(path.join(root, "failed")), false);
});
