import type { Request, Response } from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig } from "./config.js";
import { createAcmMcpServer } from "./server.js";
import { logError, logInfo } from "./utils/logger.js";

const config = loadConfig();
const app = createMcpExpressApp({ host: config.host });

app.post("/mcp", async (req: Request, res: Response) => {
  const method = (req.body as { method?: string })?.method ?? "unknown";
  logInfo("mcp request", { method });

  const server = createAcmMcpServer({ config });

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    logInfo("mcp request done", { method });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError("mcp request failed", { method, error: message });

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  } finally {
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
  }
});

app.listen(config.port, config.host, () => {
  logInfo("server started", {
    url: `http://${config.host}:${config.port}/mcp`,
    source: config.source,
    dataUrl: config.url || "default",
  });
});
