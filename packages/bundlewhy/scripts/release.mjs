// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repoRoot = path.resolve(packageRoot, "../..");
export const platforms = Object.freeze({
  "darwin-arm64": {
    target: "aarch64-apple-darwin",
    os: "darwin",
    cpu: "arm64",
  },
  "linux-x64-gnu": {
    target: "x86_64-unknown-linux-gnu",
    os: "linux",
    cpu: "x64",
    libc: ["glibc"],
  },
  "win32-x64-msvc": {
    target: "x86_64-pc-windows-msvc",
    os: "win32",
    cpu: "x64",
  },
});
const repository = {
  type: "git",
  url: "git+https://github.com/delinoio/bundlewhy.git",
};
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) =>
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

// Git can check text out with CRLF on Windows. Normalize staged text so the
// launcher tarball is identical on every native runner; binary bytes stay intact.
function copyText(source, destination) {
  fs.writeFileSync(
    destination,
    fs.readFileSync(source, "utf8").replaceAll("\r\n", "\n"),
  );
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `${command} failed (${result.status}): ${result.stderr ?? ""}\n${result.stdout ?? ""}`,
    );
  return result.stdout;
}

// Invoke npm through Node on Windows too, without a shell or a .cmd shim.
function npm(args, options = {}) {
  const cli = [
    process.env.npm_execpath,
    path.join(
      path.dirname(process.execPath),
      "node_modules/npm/bin/npm-cli.js",
    ),
  ].find(
    (file) =>
      file && /[\\/]npm(?:-cli)?\.(?:c?js)$/.test(file) && fs.existsSync(file),
  );
  if (!cli || !/[\\/]npm(?:-cli)?\.(?:c?js)$/.test(cli)) {
    if (process.platform === "win32")
      throw new Error("Run release commands with npm run on Windows");
    return run("npm", args, options);
  }
  return run(process.execPath, [cli, ...args], options);
}

export function manifests(version) {
  assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  assert.notEqual(
    version,
    "0.0.0",
    "0.0.0 is reserved for metadata-only bootstrap",
  );
  const common = {
    version,
    license: "Apache-2.0",
    repository,
    publishConfig: { access: "public" },
  };
  return {
    launcher: {
      ...common,
      name: "@delino/bundlewhy",
      description: "Explain why your bundler could not apply an optimization",
      engines: { node: ">=22.18" },
      bin: { bundlewhy: "bin/bundlewhy.cjs" },
      files: ["bin", "LICENSE", "NOTICE", "README.md"],
      optionalDependencies: Object.fromEntries(
        Object.keys(platforms).map((suffix) => [
          `@delino/bundlewhy-${suffix}`,
          version,
        ]),
      ),
    },
    ...Object.fromEntries(
      Object.entries(platforms).map(([suffix, platform]) => [
        suffix,
        {
          ...common,
          name: `@delino/bundlewhy-${suffix}`,
          description: `bundlewhy native CLI for ${suffix}`,
          os: [platform.os],
          cpu: [platform.cpu],
          ...(platform.libc ? { libc: platform.libc } : {}),
          files: [
            "bin",
            "LICENSE",
            "NOTICE",
            "README.md",
            "THIRD-PARTY-LICENSES.json",
          ],
        },
      ]),
    ),
  };
}

function version() {
  const manifest = readJson(path.join(packageRoot, "package.json"));
  assert.equal(manifest.name, "@delino/bundlewhy");
  const cargo = fs.readFileSync(
    path.join(repoRoot, "crates/bundlewhy/Cargo.toml"),
    "utf8",
  );
  assert.equal(
    cargo.match(/^version = "([^"]+)"/m)?.[1],
    manifest.version,
    "Rust and launcher versions must match",
  );
  manifests(manifest.version);
  return manifest.version;
}

// Preserve complete upstream license and notice files, including their copyright
// notices. Missing texts fail packaging instead of silently shipping an SPDX ID.
function licenseTexts(directory, fallback) {
  const texts = [];
  const walk = (dir, prefix = "") => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const relative = path.join(prefix, entry.name);
      if (
        entry.isFile() &&
        /^(licen[cs]e|copying|copyright|notice)([._-]|$)/i.test(entry.name)
      ) {
        texts.push({
          file: relative,
          text: fs.readFileSync(path.join(dir, entry.name), "utf8"),
        });
      } else if (
        entry.isDirectory() &&
        !prefix &&
        /^(licenses?|legal)$/i.test(entry.name)
      ) {
        walk(path.join(dir, entry.name), relative);
      }
    }
  };
  walk(directory);
  if (!texts.length && fallback) return fallback.files;
  assert(
    texts.some((file) => file.text.trim()),
    `No license text found in ${directory}`,
  );
  return texts.sort((a, b) => a.file.localeCompare(b.file));
}

export function licenses(target) {
  const fallbacks = readJson(path.join(packageRoot, "licenses/cargo.json"));
  const metadata = JSON.parse(
    run("cargo", [
      "metadata",
      "--locked",
      "--format-version",
      "1",
      "--filter-platform",
      target,
    ]),
  );
  const nodes = new Map(metadata.resolve.nodes.map((node) => [node.id, node]));
  const packages = new Map(metadata.packages.map((pkg) => [pkg.id, pkg]));
  const seen = new Set();
  const records = [];
  const visitRust = (id) => {
    if (seen.has(id)) return;
    seen.add(id);
    const pkg = packages.get(id);
    if (pkg.source)
      records.push({
        ecosystem: "cargo",
        name: pkg.name,
        version: pkg.version,
        license: pkg.license,
        files: licenseTexts(
          path.dirname(pkg.manifest_path),
          fallbacks[`${pkg.name}@${pkg.version}`],
        ),
        ...(fallbacks[`${pkg.name}@${pkg.version}`]
          ? { licenseSource: fallbacks[`${pkg.name}@${pkg.version}`].source }
          : {}),
      });
    for (const dep of nodes.get(id).deps) {
      if (dep.dep_kinds.some((kind) => kind.kind !== "dev")) visitRust(dep.pkg);
    }
  };
  for (const id of metadata.workspace_members) visitRust(id);
  const seenNpm = new Set();
  const npmFallbacks = readJson(path.join(packageRoot, "licenses/npm.json"));
  const visitNpm = (directory, include = true) => {
    directory = fs.realpathSync(directory);
    if (seenNpm.has(directory)) return;
    seenNpm.add(directory);
    const manifest = path.join(directory, "package.json");
    const pkg = readJson(manifest);
    if (include)
      records.push({
        ecosystem: "npm",
        name: pkg.name,
        version: pkg.version,
        license: pkg.license,
        files: licenseTexts(
          directory,
          npmFallbacks[`${pkg.name}@${pkg.version}`],
        ),
        ...(npmFallbacks[`${pkg.name}@${pkg.version}`]
          ? { licenseSource: npmFallbacks[`${pkg.name}@${pkg.version}`].source }
          : {}),
      });
    const require = createRequire(manifest);
    for (const name of Object.keys(pkg.dependencies ?? {})) {
      const dependency = require.resolve
        .paths(name)
        .map((base) => path.join(base, name))
        .find((dir) => fs.existsSync(path.join(dir, "package.json")));
      assert(dependency, `Missing UI dependency ${name}`);
      visitNpm(dependency);
    }
  };
  visitNpm(path.join(repoRoot, "apps/bundlewhy-web"), false);
  return records.sort((a, b) =>
    `${a.ecosystem}/${a.name}/${a.version}`.localeCompare(
      `${b.ecosystem}/${b.name}/${b.version}`,
    ),
  );
}

export function stage({
  output,
  suffix,
  binary,
  thirdParty,
  releaseVersion = version(),
}) {
  assert(platforms[suffix], `Unsupported platform: ${suffix}`);
  assert(fs.statSync(binary).isFile(), "Native binary must be a regular file");
  assert(
    Array.isArray(thirdParty) && thirdParty.length > 0,
    "Third-party license texts are required",
  );
  const definitions = manifests(releaseVersion);
  for (const key of ["launcher", suffix]) {
    const directory = path.join(output, key);
    fs.mkdirSync(directory, { recursive: false });
    fs.mkdirSync(path.join(directory, "bin"));
    writeJson(path.join(directory, "package.json"), definitions[key]);
    for (const file of ["LICENSE", "NOTICE"])
      copyText(path.join(repoRoot, file), path.join(directory, file));
    const readme = fs
      .readFileSync(path.join(packageRoot, "README.md"), "utf8")
      .replaceAll("\r\n", "\n")
      .replace(/^> Status:.*\n\n/m, "");
    fs.writeFileSync(path.join(directory, "README.md"), readme);
    if (key === "launcher")
      copyText(
        path.join(packageRoot, "bin/bundlewhy.cjs"),
        path.join(directory, "bin/bundlewhy.cjs"),
      );
    else {
      const executable = path.join(
        directory,
        "bin",
        suffix.startsWith("win32") ? "bundlewhy.exe" : "bundlewhy",
      );
      fs.copyFileSync(binary, executable);
      fs.chmodSync(executable, 0o755);
      writeJson(path.join(directory, "THIRD-PARTY-LICENSES.json"), thirdParty);
    }
  }
}

function pack(directory, output) {
  const [packed] = JSON.parse(
    npm(["pack", "--json", "--ignore-scripts", "--pack-destination", output], {
      cwd: directory,
    }),
  );
  const expected = readJson(path.join(directory, "package.json"));
  assert.equal(packed.name, expected.name);
  assert.equal(packed.version, expected.version);
  const expectedFiles = fs
    .readdirSync(directory, { recursive: true })
    .filter((file) => fs.statSync(path.join(directory, file)).isFile())
    .map((file) => file.replaceAll("\\", "/"))
    .sort();
  assert.deepEqual(
    packed.files.map((file) => file.path).sort(),
    expectedFiles,
    "Tarball contents differ from staged package",
  );
  return path.join(output, packed.filename);
}

function buildPackage(suffix) {
  const platform = platforms[suffix];
  assert(
    platform &&
      platform.os === process.platform &&
      platform.cpu === process.arch,
    "Package on its native runner",
  );
  const releaseVersion = version();
  const executable =
    process.platform === "win32" ? "bundlewhy.exe" : "bundlewhy";
  const binary = path.join(
    repoRoot,
    "target",
    platform.target,
    "release",
    executable,
  );
  assert.equal(
    run(binary, ["--version"]).trim(),
    `bundlewhy ${releaseVersion}`,
  );
  const output = path.join(packageRoot, "dist/release");
  fs.mkdirSync(output, { recursive: true });
  stage({
    output,
    suffix,
    binary,
    thirdParty: licenses(platform.target),
    releaseVersion,
  });
  const launcher = pack(path.join(output, "launcher"), output);
  const native = pack(path.join(output, suffix), output);
  const install = fs.mkdtempSync(
    path.join(os.tmpdir(), "bundlewhy-installed-"),
  );
  try {
    writeJson(path.join(install, "package.json"), {
      name: "bundlewhy-install-check",
      private: true,
    });
    npm(
      [
        "install",
        "--offline",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--package-lock=false",
        launcher,
        native,
      ],
      { cwd: install },
    );
    const installedLauncher = path.join(
      install,
      "node_modules/@delino/bundlewhy/bin/bundlewhy.cjs",
    );
    const env = { ...process.env };
    delete env.BUNDLEWHY_BINARY;
    assert.equal(
      run(process.execPath, [installedLauncher, "--version"], { env }).trim(),
      `bundlewhy ${releaseVersion}`,
    );
    const installedBinary = path.join(
      install,
      `node_modules/@delino/bundlewhy-${suffix}/bin`,
      executable,
    );
    const acceptance = run(
      process.execPath,
      [path.join(packageRoot, "scripts/acceptance.mjs"), "--skip-build"],
      { env: { ...env, BUNDLEWHY_ACCEPTANCE_MOCK_BINARY: installedBinary } },
    );
    fs.writeFileSync(
      path.join(output, `acceptance-${suffix}.json`),
      acceptance,
    );
    console.log(acceptance);
  } finally {
    fs.rmSync(install, { recursive: true, force: true });
  }
}

function publish(directory) {
  const releaseVersion = version();
  for (const suffix of [...Object.keys(platforms), ""]) {
    const name = `@delino/bundlewhy${suffix ? `-${suffix}` : ""}`;
    const file = path.join(
      directory,
      `${name.slice(1).replace("/", "-")}-${releaseVersion}.tgz`,
    );
    const integrity = `sha512-${createHash("sha512").update(fs.readFileSync(file)).digest("base64")}`;
    let published;
    try {
      published = npm([
        "view",
        `${name}@${releaseVersion}`,
        "dist.integrity",
        "--json",
        "--registry=https://registry.npmjs.org",
      ]);
    } catch (error) {
      if (!/E404/.test(error.message)) throw error;
    }
    if (published)
      assert.equal(
        JSON.parse(published),
        integrity,
        `Published ${name} differs; do not replace an immutable version`,
      );
    else
      npm(
        [
          "publish",
          file,
          "--access=public",
          "--tag=latest",
          "--provenance",
          "--ignore-scripts",
          "--registry=https://registry.npmjs.org",
        ],
        { stdio: "inherit" },
      );
    assert.equal(
      JSON.parse(
        npm([
          "view",
          `${name}@${releaseVersion}`,
          "dist.integrity",
          "--json",
          "--registry=https://registry.npmjs.org",
        ]),
      ),
      integrity,
    );
    console.log(
      JSON.stringify({
        event: "npm_release_verified",
        name,
        version: releaseVersion,
        integrity,
      }),
    );
  }
}

export function collect(artifacts, output, releaseVersion = version()) {
  const launcherName = `delino-bundlewhy-${releaseVersion}.tgz`;
  const files = [];
  let launcher;
  for (const suffix of Object.keys(platforms)) {
    const directory = path.join(artifacts, `release-${suffix}`);
    const candidate = fs.readFileSync(path.join(directory, launcherName));
    if (launcher)
      assert(
        candidate.equals(launcher),
        "Launcher tarballs differ between native runners",
      );
    launcher = candidate;
    const name = `delino-bundlewhy-${suffix}-${releaseVersion}.tgz`;
    files.push([name, fs.readFileSync(path.join(directory, name))]);
    const acceptance = readJson(
      path.join(directory, `acceptance-${suffix}.json`),
    );
    assert.equal(
      acceptance.platform,
      `${platforms[suffix].os}-${platforms[suffix].cpu}`,
    );
    assert.deepEqual(
      acceptance.records.map((record) => record.bundler).sort(),
      ["rspack", "vite"],
    );
    for (const record of acceptance.records) {
      assert.equal(record.status, "RUN_STATUS_COMPLETE");
      assert.deepEqual(record.problems, []);
    }
  }
  fs.mkdirSync(output, { recursive: false });
  for (const [name, bytes] of [...files, [launcherName, launcher]])
    fs.writeFileSync(path.join(output, name), bytes);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [command, value] = process.argv.slice(2);
  if (command === "check-tag") assert.equal(value, `v${version()}`);
  else if (command === "package") buildPackage(value);
  else if (command === "publish") publish(path.resolve(value));
  else if (command === "collect")
    collect(process.env.ARTIFACTS, process.env.TARBALLS);
  else
    throw new Error(
      "Expected check-tag <tag>, package <platform>, collect or publish <tarball-directory>",
    );
}
