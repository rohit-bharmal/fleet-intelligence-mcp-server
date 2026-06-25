import { readFileSync, existsSync } from "node:fs";
import { parse } from "yaml";
import type { FleetConfig } from "./clients/kubernetes.js";

export interface AppConfig extends FleetConfig {
  host: string;
  port: number;
  name: string;
}

const defaults: AppConfig = {
  source: "kubernetes",
  url: undefined,
  host: "127.0.0.1",
  port: 3000,
  name: "fleet-intelligence-mcp-server",
};

export function loadConfig(): AppConfig {
  if (!existsSync("config.yaml")) {
    return defaults;
  }

  const raw = parse(readFileSync("config.yaml", "utf8")) as Partial<AppConfig>;
  return {
    source: raw.source ?? defaults.source,
    url: raw.url,
    host: raw.host ?? defaults.host,
    port: raw.port ?? defaults.port,
    name: raw.name ?? defaults.name,
  };
}
