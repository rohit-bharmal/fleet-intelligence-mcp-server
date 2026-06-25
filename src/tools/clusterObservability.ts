import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ObservabilityService } from "../services/observabilityService.js";
import { ClusterObservabilitySchema } from "../types/observability.js";
import { withToolLog } from "../utils/logger.js";
import { formatToolError, formatToolResult } from "../utils/mcp.js";

const clusterObservabilityInput = {
  clusterName: z.string().min(1, "clusterName is required"),
};

export function registerClusterObservabilityTool(
  server: McpServer,
  observabilityService: ObservabilityService,
): void {
  server.tool(
    "cluster_observability",
    "Returns concrete cluster health: nodes, CPU/memory usage from Prometheus, and active alerts.",
    clusterObservabilityInput,
    async ({ clusterName }) =>
      withToolLog("cluster_observability", { clusterName }, async () => {
        try {
          const summary = await observabilityService.getClusterObservability(clusterName);
          const validated = ClusterObservabilitySchema.parse(summary);
          return formatToolResult(validated);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return formatToolError(message);
        }
      }),
  );
}
