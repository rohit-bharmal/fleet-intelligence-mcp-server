import { z } from "zod";

export const HealthLevelSchema = z.enum([
  "healthy",
  "warning",
  "critical",
  "unknown",
]);
export type HealthLevel = z.infer<typeof HealthLevelSchema>;

export const ClusterConditionSchema = z.object({
  type: z.string(),
  status: z.enum(["True", "False", "Unknown"]),
  reason: z.string().optional(),
  message: z.string().optional(),
  lastTransitionTime: z.string().optional(),
  observedGeneration: z.number().optional(),
});
export type ClusterCondition = z.infer<typeof ClusterConditionSchema>;

export const FleetHealthSummarySchema = z.object({
  totalClusters: z.number(),
  healthy: z.number(),
  warning: z.number(),
  critical: z.number(),
  unknown: z.number(),
});
export type FleetHealthSummary = z.infer<typeof FleetHealthSummarySchema>;

export const UnhealthyClusterSummarySchema = z.object({
  clusterName: z.string(),
  health: HealthLevelSchema,
  reason: z.string(),
});
export type UnhealthyClusterSummary = z.infer<
  typeof UnhealthyClusterSummarySchema
>;

export const ClusterHealthDetailSchema = z.object({
  clusterName: z.string(),
  health: HealthLevelSchema,
  reason: z.string(),
  conditions: z.array(ClusterConditionSchema),
  lastHeartbeat: z.string().optional(),
  hubAccepted: z.boolean().optional(),
  joined: z.boolean().optional(),
  kubernetesVersion: z.string().optional(),
  status: z.record(z.unknown()).optional(),
});
export type ClusterHealthDetail = z.infer<typeof ClusterHealthDetailSchema>;

export const ClusterHealthExplanationSchema = z.object({
  clusterName: z.string(),
  health: HealthLevelSchema,
  summaryReason: z.string(),
  conditions: z.array(ClusterConditionSchema),
  lastHeartbeat: z.string().optional(),
  metadata: z.object({
    hubAccepted: z.boolean().optional(),
    joined: z.boolean().optional(),
    kubernetesVersion: z.string().optional(),
    creationTimestamp: z.string().optional(),
  }),
  taints: z
    .array(
      z.object({
        key: z.string(),
        effect: z.string().optional(),
        timeAdded: z.string().optional(),
      }),
    )
    .optional(),
});
export type ClusterHealthExplanation = z.infer<
  typeof ClusterHealthExplanationSchema
>;

export const ClusterNameInputSchema = z.object({
  clusterName: z.string().min(1, "clusterName is required"),
});
export type ClusterNameInput = z.infer<typeof ClusterNameInputSchema>;
