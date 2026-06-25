import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HealthService } from "../services/healthService.js";
import { FleetHealthSummarySchema } from "../types/health.js";
import { withToolLog } from "../utils/logger.js";
import { formatToolResult } from "../utils/mcp.js";

export function registerFleetHealthTool(
  server: McpServer,
  healthService: HealthService,
): void {
  server.tool(
    "fleet_health",
    "Returns fleet-wide cluster health counts (total, healthy, warning, critical, unknown). Use this tool to get a quick overview of the health of your fleet.",
    {},
    async () =>
      withToolLog("fleet_health", undefined, async () => {
        const summary = await healthService.getFleetHealth();
        const validated = FleetHealthSummarySchema.parse(summary);
        return formatToolResult(validated);
      }),
  );
}
