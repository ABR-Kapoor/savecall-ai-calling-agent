import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

const useHttps = process.env["HTTPS"] === "true";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: true,
    allowedHosts: [".e2b.app", ".localhost", "172.30.160.10"],
    proxy: {
      "/rtc": {
        target: process.env["LIVEKIT_HTTP_URL"] || "http://127.0.0.1:7880",
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (err, _req, res) => {
            if (res && "writeHead" in res && !(res as any).headersSent) {
              (res as any).writeHead(502, { "Content-Type": "text/plain" });
              (res as any).end("LiveKit WebRTC gateway offline. Falling back to browser audio synthesis.");
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
    ...(useHttps ? [basicSsl()] : []),
    tanstackStart(),
    react(),
    tailwindcss(),
  ],
});
