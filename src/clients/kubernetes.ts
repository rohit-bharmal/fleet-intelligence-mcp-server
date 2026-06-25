import * as k8s from "@kubernetes/client-node";
import pg from "pg";
import type { ClusterInventoryProvider } from "../types/clusterProvider.js";
import {
  MANAGED_CLUSTER_API_GROUP,
  MANAGED_CLUSTER_API_VERSION,
  MANAGED_CLUSTER_PLURAL,
  type ManagedCluster,
} from "../types/managedCluster.js";

export interface KubernetesClientOptions {
  kubeConfigPath?: string;
}

export class KubernetesClient implements ClusterInventoryProvider {
  private readonly customObjectsApi: k8s.CustomObjectsApi;

  constructor(options: KubernetesClientOptions = {}) {
    const kubeConfig = new k8s.KubeConfig();

    if (options.kubeConfigPath) {
      kubeConfig.loadFromFile(options.kubeConfigPath);
    } else if (this.isInCluster()) {
      kubeConfig.loadFromCluster();
    } else {
      kubeConfig.loadFromDefault();
    }

    this.customObjectsApi = kubeConfig.makeApiClient(k8s.CustomObjectsApi);
  }

  private isInCluster(): boolean {
    return (
      process.env.KUBERNETES_SERVICE_HOST !== undefined &&
      process.env.KUBERNETES_SERVICE_PORT !== undefined
    );
  }

  async listManagedClusters(): Promise<ManagedCluster[]> {
    const response = await this.customObjectsApi.listClusterCustomObject({
      group: MANAGED_CLUSTER_API_GROUP,
      version: MANAGED_CLUSTER_API_VERSION,
      plural: MANAGED_CLUSTER_PLURAL,
    });

    const body = response as { items?: ManagedCluster[] };
    return (body.items ?? []) as ManagedCluster[];
  }

  async getManagedCluster(name: string): Promise<ManagedCluster | undefined> {
    try {
      const response = await this.customObjectsApi.getClusterCustomObject({
        group: MANAGED_CLUSTER_API_GROUP,
        version: MANAGED_CLUSTER_API_VERSION,
        plural: MANAGED_CLUSTER_PLURAL,
        name,
      });

      return response as ManagedCluster;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private isNotFoundError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const statusCode = (error as Error & { statusCode?: number }).statusCode;
    if (statusCode === 404) {
      return true;
    }

    return /not found/i.test(error.message);
  }
}

export function createKubernetesClient(
  options?: KubernetesClientOptions,
): KubernetesClient {
  return new KubernetesClient(options);
}

// --- Global Hub (Postgres) + config-driven client ---

export interface FleetConfig {
  source: "kubernetes" | "globalhub";
  url?: string;
}

class GlobalHubClient implements ClusterInventoryProvider {
  private readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({ connectionString: databaseUrl });
  }

  async listManagedClusters(): Promise<ManagedCluster[]> {
    const result = await this.pool.query<{ payload: ManagedCluster }>(
      "SELECT payload FROM status.managed_clusters",
    );
    return result.rows.map((row) => row.payload);
  }

  async getManagedCluster(name: string): Promise<ManagedCluster | undefined> {
    const result = await this.pool.query<{ payload: ManagedCluster }>(
      "SELECT payload FROM status.managed_clusters WHERE payload->'metadata'->>'name' = $1 LIMIT 1",
      [name],
    );
    return result.rows[0]?.payload;
  }
}

let dataClient: ClusterInventoryProvider | undefined;
let dataClientKey: string | undefined;

export function createDataClient(config: FleetConfig): ClusterInventoryProvider {
  const key = `${config.source}:${config.url ?? ""}`;
  if (dataClient && dataClientKey === key) {
    return dataClient;
  }

  if (config.source === "globalhub") {
    if (!config.url) {
      throw new Error("config.yaml: url is required for globalhub (postgres://...)");
    }
    dataClient = new GlobalHubClient(config.url);
  } else {
    dataClient = createKubernetesClient({
      kubeConfigPath: config.url || undefined,
    });
  }

  dataClientKey = key;
  return dataClient;
}
