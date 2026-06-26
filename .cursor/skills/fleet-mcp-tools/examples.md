# MCP Tool Examples

## Example: `list_policy_violations` (hypothetical)

### 1. Type — `src/types/health.ts`

```typescript
export const PolicyViolationSchema = z.object({
  policyName: z.string(),
  clusterName: z.string(),
  severity: z.string().optional(),
  message: z.string().optional(),
});
export type PolicyViolation = z.infer<typeof PolicyViolationSchema>;
```

### 2. Service — `src/services/healthService.ts`

```typescript
async listPolicyViolations(clusterName: string): Promise<PolicyViolation[]> {
  const cluster = await this.clusterProvider.getManagedCluster(clusterName);
  if (!cluster) throw new ClusterNotFoundError(clusterName);
  // fetch PolicyReport CRs or similar — transform and return
  return [];
}
```

### 3. Tool — `src/tools/listPolicyViolations.ts`

```typescript
export function registerListPolicyViolationsTool(
  server: McpServer,
  healthService: HealthService,
): void {
  server.tool(
    "list_policy_violations",
    "Lists governance policy violations for a managed cluster.",
    { clusterName: z.string().min(1) },
    async ({ clusterName }) =>
      withToolLog("list_policy_violations", { clusterName }, async () => {
        try {
          const violations = await healthService.listPolicyViolations(clusterName);
          return formatToolResult(z.array(PolicyViolationSchema).parse(violations));
        } catch (error) {
          if (error instanceof ClusterNotFoundError) {
            return formatToolError(error.message);
          }
          throw error;
        }
      }),
  );
}
```

### 4. Register — `src/server.ts`

```typescript
import { registerListPolicyViolationsTool } from "./tools/listPolicyViolations.js";

registerListPolicyViolationsTool(server, healthService);
```

---

## Existing Tools (copy from)

| Tool | File | Service | Has args |
|------|------|---------|----------|
| `fleet_health` | `tools/fleetHealth.ts` | HealthService | no |
| `list_clusters` | `tools/listClusters.ts` | HealthService | no |
| `list_unhealthy_clusters` | `tools/listUnhealthyClusters.ts` | HealthService | no |
| `cluster_health` | `tools/clusterHealth.ts` | HealthService | `clusterName` |
| `explain_cluster_health` | `tools/explainClusterHealth.ts` | HealthService | `clusterName` |
| `list_active_alerts` | `tools/listActiveAlerts.ts` | ObservabilityService | optional `clusterName` |
| `list_nodes` | `tools/listNodes.ts` | ObservabilityService | `clusterName` |
| `cluster_observability` | `tools/clusterObservability.ts` | ObservabilityService | `clusterName` |
