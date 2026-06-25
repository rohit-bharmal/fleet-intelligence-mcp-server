import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ObservabilityService } from "../services/observabilityService.js";
import { ActiveAlertSchema } from "../types/observability.js";
import { withToolLog } from "../utils/logger.js";
import { formatToolResult } from "../utils/mcp.js";

export function registerListActiveAlertsTool(
  server: McpServer,
  observabilityService: ObservabilityService,
): void {
  server.tool(
    "list_active_alerts",
    "Lists firing alerts from Prometheus Alertmanager (fleet-wide or per cluster).",
    {
      clusterName: z.string().optional(),
    },
    async ({ clusterName }) =>
      withToolLog("list_active_alerts", { clusterName }, async () => {
        const alerts = await observabilityService.listActiveAlerts(clusterName);
        const validated = z.array(ActiveAlertSchema).parse(alerts);
        return formatToolResult(validated);
      }),
  );
}
