import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { HealthService } from "../services/healthService.js";
import { UnhealthyClusterSummarySchema } from "../types/health.js";
import { withToolLog } from "../utils/logger.js";
import { formatToolResult } from "../utils/mcp.js";

export function registerListUnhealthyClustersTool(
  server: McpServer,
  healthService: HealthService,
): void {
  server.tool(
    "list_unhealthy_clusters",
    "Lists clusters that are not healthy, including cluster name, health level, and reason.",
    {},
    async () =>
      withToolLog("list_unhealthy_clusters", undefined, async () => {
        const clusters = await healthService.listUnhealthyClusters();
        const validated = z.array(UnhealthyClusterSummarySchema).parse(clusters);
        return formatToolResult(validated);
      }),
  );
}
