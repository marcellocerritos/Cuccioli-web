import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

// Recursos en la cuenta de Cloudflare de Cuccioli.
const D1_DATABASE_ID = "76bda3e0-ed49-487d-9c32-66e13f0b587e";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  name: "cuccioli-api",
  main: "./worker/index.ts",
  compatibility_date: "2026-04-01",
  vars: { CUCCIOLI_PUBLIC_ORIGIN: "https://cuccioli-sv.web.app" },
  // Workers Logs: guarda cada solicitud y cada console.error para revisarlos en el panel de Cloudflare.
  observability: { enabled: true, head_sampling_rate: 1 },
  compatibility_flags: ["nodejs_compat"],
  // Límite por IP, en el borde de Cloudflare. Holgado a propósito: muchas conexiones móviles
  // en El Salvador comparten IP. El login además tiene su propio límite estricto en D1.
  ratelimits: [
    { name: "API_LIMITER", namespace_id: "4201", simple: { limit: 120, period: 60 as const } },
    { name: "IMAGE_LIMITER", namespace_id: "4202", simple: { limit: 600, period: 60 as const } },
  ],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "cuccioli-db",
          database_id: D1_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "cuccioli-imagenes",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    ],
  };
});
