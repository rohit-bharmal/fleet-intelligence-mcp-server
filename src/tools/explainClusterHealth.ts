import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ClusterNotFoundError, type HealthService } from "../services/healthService.js";
import { ClusterHealthExplanationSchema } from "../types/health.js";
import { formatToolError, formatToolResult } from "../utils/mcp.js";

const explainClusterHealthInputSchema = {
  clusterName: z.string().min(1, "clusterName is required"),
};

export function registerExplainClusterHealthTool(
  server: McpServer,
  healthService: HealthService,
): void {
  server.tool(
    "explain_cluster_health",
    "Collects all available ManagedCluster conditions and metadata so an LLM can explain why a cluster is unhealthy.",
    explainClusterHealthInputSchema,
    async ({ clusterName }) => {
      try {
        const explanation = await healthService.explainClusterHealth(clusterName);
        const validated = ClusterHealthExplanationSchema.parse(explanation);
        return formatToolResult(validated);
      } catch (error) {
        if (error instanceof ClusterNotFoundError) {
          return formatToolError(error.message);
        }
        throw error;
      }
    },
  );
}
