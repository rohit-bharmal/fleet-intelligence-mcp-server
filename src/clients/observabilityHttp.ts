import * as k8s from "@kubernetes/client-node";
import http from "node:http";
import https from "node:https";

export interface ObservabilityHttpOptions {
  kubeConfigPath?: string;
  tlsInsecure?: boolean;
}

interface HttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

function toHeaderRecord(headers: unknown): Record<string, string> {
  if (!headers || typeof headers !== "object") {
    return {};
  }

  const withEntries = headers as { entries?: () => Iterable<[string, string]> };
  if (typeof withEntries.entries === "function") {
    return Object.fromEntries(withEntries.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers as Array<[string, string]>);
  }

  return headers as Record<string, string>;
}

export class ObservabilityHttp {
  constructor(private readonly options: ObservabilityHttpOptions = {}) {}

  private loadKubeConfig(): k8s.KubeConfig {
    const kubeConfig = new k8s.KubeConfig();
    if (this.options.kubeConfigPath) {
      kubeConfig.loadFromFile(this.options.kubeConfigPath);
    } else {
      kubeConfig.loadFromDefault();
    }
    return kubeConfig;
  }

  async get(url: string | URL): Promise<HttpResponse> {
    const kubeConfig = this.loadKubeConfig();
    const fetchOpts = await kubeConfig.applyToFetchOptions({ method: "GET" });
    const requestUrl = typeof url === "string" ? new URL(url) : url;
    const headers = toHeaderRecord(fetchOpts.headers);

    const transport = requestUrl.protocol === "https:" ? https : http;

    return new Promise((resolve, reject) => {
      const req = transport.request(
        {
          protocol: requestUrl.protocol,
          hostname: requestUrl.hostname,
          port: requestUrl.port,
          path: `${requestUrl.pathname}${requestUrl.search}`,
          method: "GET",
          headers,
          ...(this.options.tlsInsecure && requestUrl.protocol === "https:"
            ? { rejectUnauthorized: false }
            : {}),
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            const body = Buffer.concat(chunks);
            const status = res.statusCode ?? 500;
            resolve({
              ok: status >= 200 && status < 300,
              status,
              json: async () => JSON.parse(body.toString("utf8")),
            });
          });
        },
      );

      req.on("error", reject);
      req.end();
    });
  }
}
