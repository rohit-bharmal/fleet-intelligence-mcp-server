import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
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

export function resolveConfigUrl(
  source: FleetConfig["source"],
  url: string | undefined,
): string | undefined {
  if (url === undefined || url.trim() === "") {
    return undefined;
  }

  const trimmed = url.trim();
  if (source !== "kubernetes") {
    return trimmed;
  }

  if (trimmed.startsWith("~/")) {
    return resolve(homedir(), trimmed.slice(2));
  }

  if (trimmed === "~") {
    return homedir();
  }

  return trimmed;
}

export function loadConfig(): AppConfig {
  if (!existsSync("config.yaml")) {
    return defaults;
  }

  const raw = parse(readFileSync("config.yaml", "utf8")) as Partial<AppConfig>;
  const source = raw.source ?? defaults.source;

  return {
    source,
    url: resolveConfigUrl(source, raw.url),
    host: raw.host ?? defaults.host,
    port: raw.port ?? defaults.port,
    name: raw.name ?? defaults.name,
  };
}
