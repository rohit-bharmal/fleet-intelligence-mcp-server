import { z } from "zod";
import { HealthLevelSchema } from "./health.js";

export const ActiveAlertSchema = z.object({
  alertname: z.string(),
  cluster: z.string().optional(),
  severity: z.string().optional(),
  state: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  startsAt: z.string().optional(),
});
export type ActiveAlert = z.infer<typeof ActiveAlertSchema>;

export const NodeConditionSchema = z.object({
  type: z.string(),
  status: z.string(),
  reason: z.string().optional(),
  message: z.string().optional(),
});
export type NodeCondition = z.infer<typeof NodeConditionSchema>;

export const NodeHealthSummarySchema = z.object({
  name: z.string(),
  health: HealthLevelSchema,
  ready: z.boolean(),
  conditions: z.array(NodeConditionSchema),
  cpuCapacity: z.string().optional(),
  memoryCapacity: z.string().optional(),
  cpuUsagePercent: z.number().optional(),
  memoryUsagePercent: z.number().optional(),
});
export type NodeHealthSummary = z.infer<typeof NodeHealthSummarySchema>;

export const ClusterObservabilitySchema = z.object({
  clusterName: z.string(),
  nodeCount: z.number(),
  nodesReady: z.number(),
  nodesNotReady: z.number(),
  cpuUsagePercent: z.number().optional(),
  memoryUsagePercent: z.number().optional(),
  activeAlerts: z.array(ActiveAlertSchema),
  nodes: z.array(NodeHealthSummarySchema),
});
export type ClusterObservability = z.infer<typeof ClusterObservabilitySchema>;
