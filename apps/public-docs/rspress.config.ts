import { defineConfig } from "@rspress/core";

const bundlewhyPages = [
  { text: "Overview", link: "/bundlewhy/", activeMatch: "^/bundlewhy/$" },
  { text: "Installation", link: "/bundlewhy/installation" },
  { text: "Getting Started", link: "/bundlewhy/getting-started" },
  { text: "Supported Engines", link: "/bundlewhy/supported-engines" },
  {
    text: "Interpreting Diagnostics",
    link: "/bundlewhy/interpreting-diagnostics",
  },
  { text: "Privacy and Export", link: "/bundlewhy/privacy-and-export" },
  { text: "Limitations", link: "/bundlewhy/limitations" },
  { text: "Troubleshooting", link: "/bundlewhy/troubleshooting" },
];

export default defineConfig({
  title: "bundlewhy",
  description: "Explain missed bundler and minifier optimizations.",
  root: "docs",
  outDir: "doc_build",
  route: { cleanUrls: true },
  builderConfig: {
    server: { strictPort: process.env.DELINO_RSPRESS_STRICT_PORT === "1" },
  },
  themeConfig: {
    nav: [{ text: "Guides", link: "/bundlewhy/" }],
    sidebar: { "/bundlewhy/": [{ text: "bundlewhy", items: bundlewhyPages }] },
    socialLinks: [
      {
        icon: "github",
        mode: "link",
        content: "https://github.com/delinoio/bundlewhy",
      },
    ],
    footer: {
      message:
        'Documentation is maintained in the <a href="https://github.com/delinoio/bundlewhy">bundlewhy repository</a>.',
    },
  },
});
