import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createDataClient } from "./clients/kubernetes.js";
import { loadConfig, type AppConfig } from "./config.js";
import { HealthService } from "./services/healthService.js";
import { createObservabilityService } from "./services/observabilityService.js";
import { registerClusterHealthTool } from "./tools/clusterHealth.js";
import { registerClusterObservabilityTool } from "./tools/clusterObservability.js";
import { registerExplainClusterHealthTool } from "./tools/explainClusterHealth.js";
import { registerFleetHealthTool } from "./tools/fleetHealth.js";
import { registerListActiveAlertsTool } from "./tools/listActiveAlerts.js";
import { registerListClustersTool } from "./tools/listClusters.js";
import { registerListNodesTool } from "./tools/listNodes.js";
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

  const dataClient = createDataClient(config);
  const healthService = new HealthService(dataClient);
  const observabilityService = createObservabilityService(
    dataClient,
    config.observability ?? {},
    config.url,
  );

  registerListClustersTool(server, healthService);
  registerListActiveAlertsTool(server, observabilityService);
  registerListNodesTool(server, observabilityService);
  registerClusterObservabilityTool(server, observabilityService);
  registerFleetHealthTool(server, healthService);
  registerListUnhealthyClustersTool(server, healthService);
  registerClusterHealthTool(server, healthService);
  registerExplainClusterHealthTool(server, healthService);

  return server;
}
