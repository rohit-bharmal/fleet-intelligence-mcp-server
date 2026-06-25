import type { ClusterInventoryProvider } from "../types/clusterProvider.js";
import type {
  ClusterHealthDetail,
  ClusterHealthExplanation,
  FleetHealthSummary,
  UnhealthyClusterSummary,
} from "../types/health.js";
import {
  countByHealthLevel,
  deriveHealthLevel,
  isUnhealthyHealthLevel,
  toClusterHealthDetail,
  toClusterHealthExplanation,
  toUnhealthyClusterSummary,
} from "../utils/health.js";

export class ClusterNotFoundError extends Error {
  constructor(clusterName: string) {
    super(`ManagedCluster "${clusterName}" was not found`);
    this.name = "ClusterNotFoundError";
  }
}

export class HealthService {
  constructor(private readonly clusterProvider: ClusterInventoryProvider) {}

  async getFleetHealth(): Promise<FleetHealthSummary> {
    const clusters = await this.clusterProvider.listManagedClusters();
    const counts = countByHealthLevel(clusters);

    return {
      totalClusters: clusters.length,
      healthy: counts.healthy,
      warning: counts.warning,
      critical: counts.critical,
      unknown: counts.unknown,
    };
  }

  async listUnhealthyClusters(): Promise<UnhealthyClusterSummary[]> {
    const clusters = await this.clusterProvider.listManagedClusters();

    return clusters
      .map(toUnhealthyClusterSummary)
      .filter((summary) => isUnhealthyHealthLevel(summary.health))
      .sort((left, right) => {
        const priority = { critical: 0, unknown: 1, warning: 2, healthy: 3 };
        const healthDiff = priority[left.health] - priority[right.health];
        if (healthDiff !== 0) {
          return healthDiff;
        }
        return left.clusterName.localeCompare(right.clusterName);
      });
  }

  async getClusterHealth(clusterName: string): Promise<ClusterHealthDetail> {
    const cluster = await this.clusterProvider.getManagedCluster(clusterName);
    if (!cluster) {
      throw new ClusterNotFoundError(clusterName);
    }

    return toClusterHealthDetail(cluster);
  }

  async explainClusterHealth(
    clusterName: string,
  ): Promise<ClusterHealthExplanation> {
    const cluster = await this.clusterProvider.getManagedCluster(clusterName);
    if (!cluster) {
      throw new ClusterNotFoundError(clusterName);
    }

    return toClusterHealthExplanation(cluster);
  }

  async getInvestigationPriority(): Promise<UnhealthyClusterSummary[]> {
    return this.listUnhealthyClusters();
  }

  async getClusterHealthLevel(clusterName: string) {
    const cluster = await this.clusterProvider.getManagedCluster(clusterName);
    if (!cluster) {
      throw new ClusterNotFoundError(clusterName);
    }

    return deriveHealthLevel(cluster);
  }
}
