import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ mode }) => ({
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    exclude: [
      "pg",
      "pg-pool",
      "pg-types",
      "postgres-bytea",
      "livekit-server-sdk",
      "@whiskeysockets/baileys",
      "qrcode",
    ],
  },
  ssr: {
    external: [
      "pg",
      "pg-pool",
      "livekit-server-sdk",
      "@whiskeysockets/baileys",
      "qrcode",
      "sharp",
      "mammoth",
      "@xenova/transformers",
      "unpdf",
      "xlsx",
      "resend",
    ],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    tsconfigPaths: true,
  },
  server: {
    host: true,
    allowedHosts: [".e2b.app", ".localhost", "172.30.160.10"],
    watch: {
      ignored: [
        "**/*.md",
        "**/scratch/**",
        "**/.git/**",
        "**/.tanstack/**",
        "**/.github/**",
        "**/*.crdownload",
        "**/routeTree.gen.ts",
      ],
    },
    proxy: {
      "/rtc": {
        target: process.env["LIVEKIT_HTTP_URL"] || "http://127.0.0.1:7880",
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            if (res && "writeHead" in res && !(res as any).headersSent) {
              try {
                (res as any).writeHead(502, { "Content-Type": "text/plain" });
                (res as any).end(
                  "LiveKit WebRTC gateway offline. Falling back to browser audio synthesis."
                );
              } catch (_) {}
            } else if (
              res &&
              "destroy" in res &&
              typeof (res as any).destroy === "function"
            ) {
              try {
                (res as any).destroy();
              } catch (_) {}
            }
          });
        },
      },
    },
  },
  preview: {
    host: true,
    allowedHosts: [".e2b.app", ".localhost", "172.30.160.10"],
  },
  plugins: [
    // basicSsl only for local dev — Vercel handles HTTPS natively
    ...(mode !== "production" ? [basicSsl()] : []),
    tanstackStart(),
    nitro(),
    react(),
    tailwindcss(),
  ],
}));
