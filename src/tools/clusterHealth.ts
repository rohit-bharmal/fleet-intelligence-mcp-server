import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ClusterNotFoundError, type HealthService } from "../services/healthService.js";
import { ClusterHealthDetailSchema } from "../types/health.js";
import { withToolLog } from "../utils/logger.js";
import { formatToolError, formatToolResult } from "../utils/mcp.js";

const clusterHealthInputSchema = {
  clusterName: z.string().min(1, "clusterName is required"),
};

export function registerClusterHealthTool(
  server: McpServer,
  healthService: HealthService,
): void {
  server.tool(
    "cluster_health",
    "Returns detailed health information for a single managed cluster.",
    clusterHealthInputSchema,
    async ({ clusterName }) =>
      withToolLog("cluster_health", { clusterName }, async () => {
        try {
          const detail = await healthService.getClusterHealth(clusterName);
          const validated = ClusterHealthDetailSchema.parse(detail);
          return formatToolResult(validated);
        } catch (error) {
          if (error instanceof ClusterNotFoundError) {
            return formatToolError(error.message);
          }
          throw error;
        }
      }),
  );
}
