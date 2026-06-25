import type { ObservabilityHttp } from "./observabilityHttp.js";

export interface AlertmanagerAlert {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  state: string;
  startsAt?: string;
}

export class AlertmanagerClient {
  constructor(
    private readonly baseUrl: string,
    private readonly http: ObservabilityHttp,
  ) {}

  async listAlerts(): Promise<AlertmanagerAlert[]> {
    const url = new URL("/api/v2/alerts", this.baseUrl);
    const response = await this.http.get(url);

    if (!response.ok) {
      throw new Error(`Alertmanager request failed: HTTP ${response.status}`);
    }

    return (await response.json()) as AlertmanagerAlert[];
  }
}
