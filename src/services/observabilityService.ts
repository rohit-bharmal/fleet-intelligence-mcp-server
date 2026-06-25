import { AlertmanagerClient } from "../clients/alertmanager.js";
import { ObservabilityHttp } from "../clients/observabilityHttp.js";
import {
  PrometheusClient,
  type PrometheusQueryResult,
} from "../clients/prometheus.js";
import type { ClusterInventoryProvider } from "../types/clusterProvider.js";
import type { HealthLevel } from "../types/health.js";
import type {
  ActiveAlert,
  ClusterObservability,
  NodeHealthSummary,
} from "../types/observability.js";
import { logInfo } from "../utils/logger.js";

export interface ObservabilityConfig {
  prometheusUrl?: string;
  alertmanagerUrl?: string;
  tlsInsecure?: boolean;
}

function deriveNodeHealth(ready: boolean): HealthLevel {
  return ready ? "healthy" : "critical";
}

function clusterSelector(clusterName: string, inner: string): string {
  return inner.replace(/\{/, `{cluster="${clusterName}",`);
}

export class ObservabilityService {
  constructor(
    private readonly clusterProvider: ClusterInventoryProvider,
    private readonly prometheus?: PrometheusClient,
    private readonly alertmanager?: AlertmanagerClient,
  ) {}

  async listActiveAlerts(clusterName?: string): Promise<ActiveAlert[]> {
    if (!this.alertmanager) {
      return [];
    }

    logInfo("fetching active alerts", { clusterName });
    let alerts;
    try {
      alerts = await this.alertmanager.listAlerts();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logInfo("alertmanager unavailable", { clusterName, error: message });
      return [];
    }

    return alerts
      .filter((alert) => {
        if (!clusterName) {
          return true;
        }
        const cluster =
          alert.labels.cluster ??
          alert.labels.managed_cluster ??
          alert.labels.openshift_cluster;
        return cluster === clusterName;
      })
      .map((alert) => ({
        alertname: alert.labels.alertname ?? "unknown",
        cluster: alert.labels.cluster ?? alert.labels.managed_cluster,
        severity: alert.labels.severity,
        state: alert.state,
        summary: alert.annotations.summary,
        description: alert.annotations.description,
        startsAt: alert.startsAt,
      }));
  }

  async listNodes(clusterName: string): Promise<NodeHealthSummary[]> {
    await this.requireCluster(clusterName);
    const nodes = await this.fetchNodes(clusterName);
    return nodes;
  }

  async getClusterObservability(
    clusterName: string,
  ): Promise<ClusterObservability> {
    logInfo("building cluster observability", { clusterName });
    await this.requireCluster(clusterName);

    const [nodes, alerts, metrics] = await Promise.all([
      this.fetchNodes(clusterName),
      this.listActiveAlerts(clusterName),
      this.fetchClusterMetrics(clusterName),
    ]);

    const nodesReady = nodes.filter((node) => node.ready).length;

    return {
      clusterName,
      nodeCount: nodes.length,
      nodesReady,
      nodesNotReady: nodes.length - nodesReady,
      cpuUsagePercent: metrics.cpuUsagePercent,
      memoryUsagePercent: metrics.memoryUsagePercent,
      activeAlerts: alerts,
      nodes,
    };
  }

  private async requireCluster(clusterName: string): Promise<void> {
    const cluster = await this.clusterProvider.getManagedCluster(clusterName);
    if (!cluster) {
      throw new Error(`ManagedCluster "${clusterName}" was not found`);
    }
  }

  private requirePrometheus(): PrometheusClient {
    if (!this.prometheus) {
      throw new Error(
        "Prometheus not configured. Set observability.prometheusUrl in config.yaml and port-forward thanos-querier.",
      );
    }
    return this.prometheus;
  }

  private async queryForCluster(
    expr: string,
    clusterName: string,
  ): Promise<PrometheusQueryResult[]> {
    const prometheus = this.requirePrometheus();
    const scoped = expr.includes("{")
      ? clusterSelector(clusterName, expr)
      : `${expr}{cluster="${clusterName}"}`;

    try {
      const results = await prometheus.query(scoped);
      if (results.length > 0) {
        return results;
      }
    } catch {
      // fall through to unscoped query (hub metrics may lack cluster label)
    }

    return prometheus.query(expr);
  }

  private async fetchNodes(clusterName: string): Promise<NodeHealthSummary[]> {
    const [infoResults, readyResults, cpuResults, memResults] =
      await Promise.all([
        this.queryForCluster("kube_node_info", clusterName),
        this.queryForCluster(
          'kube_node_status_condition{condition="Ready",status="true"}',
          clusterName,
        ),
        this.queryForCluster(
          `100 * (1 - avg by (node) (rate(node_cpu_seconds_total{mode="idle"}[5m])))`,
          clusterName,
        ),
        this.queryForCluster(
          `100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))`,
          clusterName,
        ),
      ]);

    const readyNodes = new Set(
      readyResults.map((r) => r.metric.node).filter(Boolean),
    );
    const cpuByNode = new Map(
      cpuResults.map((r) => [
        r.metric.node,
        Number.parseFloat(r.value?.[1] ?? "NaN"),
      ]),
    );
    const memByNode = new Map(
      memResults.map((r) => [
        r.metric.node,
        Number.parseFloat(r.value?.[1] ?? "NaN"),
      ]),
    );

    const nodes = infoResults
      .map((r) => r.metric.node)
      .filter((name): name is string => Boolean(name));

    if (nodes.length === 0) {
      throw new Error(
        `No node metrics found for "${clusterName}". Ensure Prometheus is reachable and kube-state-metrics exposes kube_node_info.`,
      );
    }

    return [...new Set(nodes)].map((name) => {
      const ready = readyNodes.has(name);
      return {
        name,
        health: deriveNodeHealth(ready),
        ready,
        conditions: [{ type: "Ready", status: ready ? "True" : "False" }],
        cpuUsagePercent: cpuByNode.get(name),
        memoryUsagePercent: memByNode.get(name),
      };
    });
  }

  private async fetchClusterMetrics(clusterName: string) {
    if (!this.prometheus) {
      return {};
    }

    const queries = [
      {
        cpu: clusterSelector(
          clusterName,
          `100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])))`,
        ),
        memory: clusterSelector(
          clusterName,
          `100 * (1 - avg(node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))`,
        ),
      },
      {
        cpu: `100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])))`,
        memory: `100 * (1 - avg(node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))`,
      },
    ];

    for (const querySet of queries) {
      try {
        const [cpu, memory] = await Promise.all([
          this.prometheus.queryScalar(querySet.cpu),
          this.prometheus.queryScalar(querySet.memory),
        ]);
        if (cpu !== undefined || memory !== undefined) {
          return { cpuUsagePercent: cpu, memoryUsagePercent: memory };
        }
      } catch {
        continue;
      }
    }

    return {};
  }
}

export function createObservabilityService(
  clusterProvider: ClusterInventoryProvider,
  observability: ObservabilityConfig,
  kubeConfigPath?: string,
): ObservabilityService {
  const http = new ObservabilityHttp({
    kubeConfigPath,
    tlsInsecure: observability.tlsInsecure,
  });
  const prometheus = observability.prometheusUrl
    ? new PrometheusClient(observability.prometheusUrl, http)
    : undefined;
  const alertmanager = observability.alertmanagerUrl
    ? new AlertmanagerClient(observability.alertmanagerUrl, http)
    : undefined;

  return new ObservabilityService(clusterProvider, prometheus, alertmanager);
}
