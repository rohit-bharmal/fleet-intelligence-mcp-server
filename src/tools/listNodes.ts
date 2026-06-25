import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ObservabilityService } from "../services/observabilityService.js";
import { NodeHealthSummarySchema } from "../types/observability.js";
import { withToolLog } from "../utils/logger.js";
import { formatToolError, formatToolResult } from "../utils/mcp.js";

const listNodesInput = {
  clusterName: z.string().min(1, "clusterName is required"),
};

export function registerListNodesTool(
  server: McpServer,
  observabilityService: ObservabilityService,
): void {
  server.tool(
    "list_nodes",
    "Lists all nodes in a managed cluster with Ready status, conditions, and resource metrics.",
    listNodesInput,
    async ({ clusterName }) =>
      withToolLog("list_nodes", { clusterName }, async () => {
        try {
          const nodes = await observabilityService.listNodes(clusterName);
          const validated = z.array(NodeHealthSummarySchema).parse(nodes);
          return formatToolResult(validated);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return formatToolError(message);
        }
      }),
  );
}
