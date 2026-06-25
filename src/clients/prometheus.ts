import type { ObservabilityHttp } from "./observabilityHttp.js";

export interface PrometheusQueryResult {
  metric: Record<string, string>;
  value?: [number, string];
  values?: Array<[number, string]>;
}

export interface PrometheusQueryResponse {
  status: string;
  data?: {
    resultType: string;
    result: PrometheusQueryResult[];
  };
  error?: string;
}

export class PrometheusClient {
  constructor(
    private readonly baseUrl: string,
    private readonly http: ObservabilityHttp,
  ) {}

  async query(expr: string): Promise<PrometheusQueryResult[]> {
    const url = new URL("/api/v1/query", this.baseUrl);
    url.searchParams.set("query", expr);

    const response = await this.http.get(url);

    if (!response.ok) {
      throw new Error(`Prometheus query failed: HTTP ${response.status}`);
    }

    const body = (await response.json()) as PrometheusQueryResponse;
    if (body.status !== "success") {
      throw new Error(body.error ?? "Prometheus query failed");
    }

    return body.data?.result ?? [];
  }

  async queryScalar(expr: string): Promise<number | undefined> {
    const results = await this.query(expr);
    const value = results[0]?.value?.[1];
    if (value === undefined) {
      return undefined;
    }
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
}
