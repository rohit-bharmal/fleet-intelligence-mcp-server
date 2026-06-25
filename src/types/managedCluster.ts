export const MANAGED_CLUSTER_API_GROUP = "cluster.open-cluster-management.io";
export const MANAGED_CLUSTER_API_VERSION = "v1";
export const MANAGED_CLUSTER_PLURAL = "managedclusters";

export interface ManagedClusterCondition {
  type: string;
  status: "True" | "False" | "Unknown";
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
  observedGeneration?: number;
}

export interface ManagedClusterTaint {
  key: string;
  effect?: string;
  timeAdded?: string;
}

export interface ManagedClusterStatus {
  conditions?: ManagedClusterCondition[];
  version?: {
    kubernetes?: string;
  };
  capacity?: Record<string, string>;
  allocatable?: Record<string, string>;
  clusterClaims?: Array<{
    name: string;
    value?: string;
  }>;
}

export interface ManagedClusterSpec {
  hubAcceptsClient?: boolean;
  leaseDurationSeconds?: number;
  taints?: ManagedClusterTaint[];
}

export interface ManagedCluster {
  apiVersion?: string;
  kind?: string;
  metadata: {
    name: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec?: ManagedClusterSpec;
  status?: ManagedClusterStatus;
}

export interface ManagedClusterList {
  items: ManagedCluster[];
}
