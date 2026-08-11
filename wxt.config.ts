import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Lreader",
    description: "Translate comic and webtoon images with a local-first pipeline.",
    permissions: ["storage"],
    host_permissions: ["<all_urls>"],
  },
});
