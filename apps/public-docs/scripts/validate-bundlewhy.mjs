import { readFile } from "node:fs/promises";
import path from "node:path";
import { decodeHTML } from "entities";
import { bundlewhyHeadings, requiredLinks } from "./requirements.mjs";

const failures = [];
for (const [route, headings] of Object.entries(bundlewhyHeadings)) {
  const artifact = route.endsWith("/") ? `${route}index.html` : `${route}.html`;
  let contents;
  try {
    contents = await readFile(
      path.join("doc_build", artifact.slice(1)),
      "utf8",
    );
  } catch {
    failures.push(`${route} is missing its HTML artifact`);
    continue;
  }
  const main = contents.match(/<main\b[^>]*>[\s\S]*?<\/main>/iu)?.[0] ?? "";
  if (!main) failures.push(`${route} is missing a main landmark`);
  const visible = decodeHTML(
    main
      .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/giu, " ")
      .replace(/<[^>]*>/gu, " "),
  ).replace(/\s+/gu, " ");
  if (
    !/\bbundlewhy is not yet published to npm\b/iu.test(visible) ||
    !/\bVersion 0\.1\.0 is in development\b/iu.test(visible)
  ) {
    failures.push(`${route} is missing its unpublished availability notice`);
  }
  if (
    /(?<!\b(?:when|once|until|unless|if|after|before)\s+)\bbundlewhy(?: 0\.1\.0)? is (?:now )?(?:available|published)\b/iu.test(
      visible,
    )
  ) {
    failures.push(`${route} claims published availability`);
  }
  for (const heading of headings) {
    if (!visible.includes(heading))
      failures.push(`${route} is missing required heading: ${heading}`);
  }
  for (const link of requiredLinks.get(route) ?? []) {
    if (!contents.includes(`href="${link}"`))
      failures.push(`${route} is missing required link: ${link}`);
  }
  if (/href=["'][^"']*\.html(?:[?#][^"']*)?["']/iu.test(contents))
    failures.push(`${route} contains an HTML-suffix link`);
  if (
    /(?:apps|crates|packages|protos)\/bundlewhy(?:-web)?(?:\/|\b)|\/Users\/|\.infisical|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/iu.test(
      main,
    )
  )
    failures.push(`${route} contains prohibited public content`);
}
if (failures.length) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
}
