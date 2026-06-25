import type {
  ClusterCondition,
  ClusterHealthDetail,
  ClusterHealthExplanation,
  ClusterSummary,
  HealthLevel,
  UnhealthyClusterSummary,
} from "../types/health.js";
import type {
  ManagedCluster,
  ManagedClusterCondition,
} from "../types/managedCluster.js";

const CONDITION_JOINED = "ManagedClusterJoined";
const CONDITION_HUB_ACCEPTED = "HubAcceptedManagedCluster";
const CONDITION_HUB_DENIED = "HubDeniedManagedCluster";
const CONDITION_AVAILABLE = "ManagedClusterConditionAvailable";
const CONDITION_CLOCK_SYNCED = "ManagedClusterConditionClockSynced";

const TAINT_UNAVAILABLE = "cluster.open-cluster-management.io/unavailable";
const TAINT_UNREACHABLE = "cluster.open-cluster-management.io/unreachable";

function getCondition(
  cluster: ManagedCluster,
  type: string,
): ManagedClusterCondition | undefined {
  return cluster.status?.conditions?.find((condition) => condition.type === type);
}

function conditionStatus(
  cluster: ManagedCluster,
  type: string,
): "True" | "False" | "Unknown" | undefined {
  return getCondition(cluster, type)?.status;
}

export function toClusterCondition(
  condition: ManagedClusterCondition,
): ClusterCondition {
  return {
    type: condition.type,
    status: condition.status,
    reason: condition.reason,
    message: condition.message,
    lastTransitionTime: condition.lastTransitionTime,
    observedGeneration: condition.observedGeneration,
  };
}

export function getLastHeartbeat(cluster: ManagedCluster): string | undefined {
  const conditions = cluster.status?.conditions ?? [];
  if (conditions.length === 0) {
    return undefined;
  }

  const timestamps = conditions
    .map((condition) => condition.lastTransitionTime)
    .filter((value): value is string => Boolean(value))
    .sort();

  return timestamps.at(-1);
}

export function deriveHealthLevel(cluster: ManagedCluster): HealthLevel {
  const denied = conditionStatus(cluster, CONDITION_HUB_DENIED);
  const joined = conditionStatus(cluster, CONDITION_JOINED);
  const available = conditionStatus(cluster, CONDITION_AVAILABLE);
  const hubAccepted = conditionStatus(cluster, CONDITION_HUB_ACCEPTED);
  const clockSynced = conditionStatus(cluster, CONDITION_CLOCK_SYNCED);

  const taintKeys = new Set(
    (cluster.spec?.taints ?? []).map((taint) => taint.key),
  );

  if (denied === "True") {
    return "critical";
  }

  if (
    joined === "False" ||
    available === "False" ||
    taintKeys.has(TAINT_UNAVAILABLE)
  ) {
    return "critical";
  }

  if (
    available === "Unknown" ||
    available === undefined ||
    joined === "Unknown" ||
    taintKeys.has(TAINT_UNREACHABLE)
  ) {
    return "unknown";
  }

  if (hubAccepted === "False" || clockSynced === "False") {
    return "warning";
  }

  if (
    joined === "True" &&
    available === "True" &&
    hubAccepted === "True"
  ) {
    return "healthy";
  }

  if (joined === "True" && available === "True") {
    return "warning";
  }

  return "unknown";
}

export function deriveHealthReason(
  cluster: ManagedCluster,
  health: HealthLevel,
): string {
  const conditions = cluster.status?.conditions ?? [];
  const failing = conditions.filter(
    (condition) =>
      condition.status === "False" || condition.status === "Unknown",
  );

  if (failing.length > 0) {
    const primary = failing[0];
    const parts = [primary.type, primary.status];
    if (primary.reason) {
      parts.push(primary.reason);
    }
    if (primary.message) {
      parts.push(primary.message);
    }
    return parts.join(": ");
  }

  const taints = cluster.spec?.taints ?? [];
  if (taints.length > 0) {
    return `Cluster taints: ${taints.map((taint) => taint.key).join(", ")}`;
  }

  if (health === "healthy") {
    return "All core conditions are healthy";
  }

  return "Insufficient condition data to determine cluster health";
}

export function toClusterHealthDetail(
  cluster: ManagedCluster,
): ClusterHealthDetail {
  const health = deriveHealthLevel(cluster);
  const conditions = (cluster.status?.conditions ?? []).map(toClusterCondition);

  return {
    clusterName: cluster.metadata.name,
    health,
    reason: deriveHealthReason(cluster, health),
    conditions,
    lastHeartbeat: getLastHeartbeat(cluster),
    hubAccepted: cluster.spec?.hubAcceptsClient,
    joined: conditionStatus(cluster, CONDITION_JOINED) === "True",
    kubernetesVersion: cluster.status?.version?.kubernetes,
    status: cluster.status as Record<string, unknown> | undefined,
  };
}

export function toClusterHealthExplanation(
  cluster: ManagedCluster,
): ClusterHealthExplanation {
  const health = deriveHealthLevel(cluster);
  const conditions = (cluster.status?.conditions ?? []).map(toClusterCondition);

  return {
    clusterName: cluster.metadata.name,
    health,
    summaryReason: deriveHealthReason(cluster, health),
    conditions,
    lastHeartbeat: getLastHeartbeat(cluster),
    metadata: {
      hubAccepted: cluster.spec?.hubAcceptsClient,
      joined: conditionStatus(cluster, CONDITION_JOINED) === "True",
      kubernetesVersion: cluster.status?.version?.kubernetes,
      creationTimestamp: cluster.metadata.creationTimestamp,
    },
    taints: cluster.spec?.taints?.map((taint) => ({
      key: taint.key,
      effect: taint.effect,
      timeAdded: taint.timeAdded,
    })),
  };
}

export function toUnhealthyClusterSummary(
  cluster: ManagedCluster,
): UnhealthyClusterSummary {
  const health = deriveHealthLevel(cluster);
  return {
    clusterName: cluster.metadata.name,
    health,
    reason: deriveHealthReason(cluster, health),
  };
}

export function toClusterSummary(cluster: ManagedCluster): ClusterSummary {
  return {
    clusterName: cluster.metadata.name,
    health: deriveHealthLevel(cluster),
  };
}

export function isUnhealthyHealthLevel(health: HealthLevel): boolean {
  return health !== "healthy";
}

export function countByHealthLevel(
  clusters: ManagedCluster[],
): Record<HealthLevel, number> {
  const counts: Record<HealthLevel, number> = {
    healthy: 0,
    warning: 0,
    critical: 0,
    unknown: 0,
  };

  for (const cluster of clusters) {
    const health = deriveHealthLevel(cluster);
    counts[health] += 1;
  }

  return counts;
}
