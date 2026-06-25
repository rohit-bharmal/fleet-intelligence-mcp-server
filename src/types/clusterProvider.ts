import type { ManagedCluster } from "./managedCluster.js";

/**
 * Abstraction over cluster inventory sources (ManagedCluster today, Global Hub APIs later).
 */
export interface ClusterInventoryProvider {
  listManagedClusters(): Promise<ManagedCluster[]>;
  getManagedCluster(name: string): Promise<ManagedCluster | undefined>;
}
