import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createDataClient } from "./clients/kubernetes.js";
import { loadConfig, type AppConfig } from "./config.js";
import { HealthService } from "./services/healthService.js";
import { registerClusterHealthTool } from "./tools/clusterHealth.js";
import { registerExplainClusterHealthTool } from "./tools/explainClusterHealth.js";
import { registerFleetHealthTool } from "./tools/fleetHealth.js";
import { registerListUnhealthyClustersTool } from "./tools/listUnhealthyClusters.js";

export interface AcmMcpServerOptions {
  config?: AppConfig;
}

export function createAcmMcpServer(
  options: AcmMcpServerOptions = {},
): McpServer {
  const config = options.config ?? loadConfig();

  const server = new McpServer({
    name: config.name,
    version: "1.0.0",
  });

  const healthService = new HealthService(createDataClient(config));

  registerFleetHealthTool(server, healthService);
  registerListUnhealthyClustersTool(server, healthService);
  registerClusterHealthTool(server, healthService);
  registerExplainClusterHealthTool(server, healthService);

  return server;
}
