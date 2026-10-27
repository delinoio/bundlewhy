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

test("bundlewhy pages must keep the unpublished availability notice", async () => {
  await rejectsMutation(
    projectValidator,
    (html) =>
      html.replaceAll(
        "bundlewhy is not yet published to npm",
        "bundlewhy release notes",
      ),
    /bundlewhy\/.*missing its unpublished availability notice/u,
    undefined,
    "bundlewhy/installation.html",
  );
});

test("bundlewhy pages cannot claim published availability", async () => {
  await rejectsMutation(
    projectValidator,
    (html) =>
      html.replace(
        "Version 0.1.0 is in development.",
        "Version 0.1.0 is in development. bundlewhy is available.",
      ),
    /bundlewhy\/.*claims published availability/u,
    undefined,
    "bundlewhy/limitations.html",
  );
});
