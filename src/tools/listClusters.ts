import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { HealthService } from "../services/healthService.js";
import { ClusterSummarySchema } from "../types/health.js";
import { withToolLog } from "../utils/logger.js";
import { formatToolResult } from "../utils/mcp.js";

export function registerListClustersTool(
  server: McpServer,
  healthService: HealthService,
): void {
  server.tool(
    "list_clusters",
    "Lists all managed clusters in the fleet with their health status. Call this first to discover cluster names.",
    {},
    async () =>
      withToolLog("list_clusters", undefined, async () => {
        const clusters = await healthService.listClusters();
        const validated = z.array(ClusterSummarySchema).parse(clusters);
        return formatToolResult(validated);
      }),
  );
}
