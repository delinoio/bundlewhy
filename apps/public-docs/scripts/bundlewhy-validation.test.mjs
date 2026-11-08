import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

let fixtureDirectory;
const projectValidator = fileURLToPath(
  new URL("./validate-bundlewhy.mjs", import.meta.url),
);

before(async () => {
  fixtureDirectory = await mkdtemp(
    path.join(tmpdir(), "bundlewhy-docs-validation-"),
  );
  await cp(
    new URL("../doc_build", import.meta.url),
    path.join(fixtureDirectory, "doc_build"),
    { recursive: true },
  );
});
after(async () => {
  if (fixtureDirectory)
    await rm(fixtureDirectory, { recursive: true, force: true });
});

function validate(script) {
  return spawnSync(process.execPath, [script], {
    cwd: fixtureDirectory,
    encoding: "utf8",
  });
}

async function rejectsMutation(
  script,
  mutate,
  classification,
  hiddenValue,
  page = "bundlewhy/index.html",
) {
  const file = path.join(fixtureDirectory, "doc_build", page);
  const original = await readFile(file, "utf8");
  const mutated = mutate(original);
  assert.notEqual(mutated, original, "fixture must change the rendered page");
  try {
    await writeFile(file, mutated);
    const result = validate(script);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, classification);
    if (hiddenValue)
      assert.ok(
        !result.stderr.includes(hiddenValue),
        "diagnostic exposed rejected content",
      );
  } finally {
    await writeFile(file, original);
  }
}

test("bundlewhy pages must identify the published release", async () => {
  await rejectsMutation(
    projectValidator,
    (html) =>
      html.replaceAll(
        "bundlewhy 0.1.0 is available on npm",
        "bundlewhy release notes",
      ),
    /bundlewhy\/.*missing its release or bootstrap notice/u,
    undefined,
    "bundlewhy/installation.html",
  );
});

test("bundlewhy pages cannot describe the published release as unavailable", async () => {
  await rejectsMutation(
    projectValidator,
    (html) =>
      html.replace(
        "Version 0.0.0 contains no executable.",
        "Version 0.0.0 contains no executable. Version 0.1.0 is in development.",
      ),
    /bundlewhy\/.*claims the published release is unavailable/u,
    undefined,
    "bundlewhy/limitations.html",
  );
});
