---
name: fleet-mcp-tools
description: >-
  Add or modify MCP tools in the Fleet Intelligence MCP server. Use when creating
  a new tool, registering tools in server.ts, adding service methods, Zod schemas,
  Prometheus/Alertmanager clients, or extending fleet health and observability.
---

# Fleet Intelligence MCP — Tool Development

## Architecture

```
src/tools/<name>.ts          → register*Tool() — MCP entry point
src/services/<name>Service.ts → business logic
src/types/<domain>.ts        → Zod schemas + TypeScript types
src/clients/                 → Kubernetes, Postgres, Prometheus, Alertmanager
src/utils/mcp.ts             → formatToolResult / formatToolError
src/server.ts                → wire all register*Tool() calls
```

**Pick the right service:**
- **HealthService** — ACM `ManagedCluster` CRs (registration, conditions, fleet counts)
- **ObservabilityService** — Prometheus metrics, Alertmanager alerts, node health
- **ClusterInventoryProvider** — only when adding a new data source (kubernetes.ts)

## Add a New Tool (Checklist)

```
- [ ] 1. Define Zod schema + type in src/types/
- [ ] 2. Add service method in HealthService or ObservabilityService
- [ ] 3. Create src/tools/<toolName>.ts with register*Tool()
- [ ] 4. Register in src/server.ts
- [ ] 5. npm run typecheck
- [ ] 6. npm run build && npm start — test via Cursor or MCP Inspector
```

## Tool File Template

Create `src/tools/my_tool.ts`:

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { HealthService } from "../services/healthService.js";
import { MyOutputSchema } from "../types/health.js"; // or observability.ts
import { withToolLog } from "../utils/logger.js";
import { formatToolError, formatToolResult } from "../utils/mcp.js";

const inputSchema = {
  clusterName: z.string().min(1, "clusterName is required"),
};

export function registerMyTool(
  server: McpServer,
  healthService: HealthService,
): void {
  server.tool(
    "my_tool",                    // snake_case — becomes MCP tool name
    "One-line description for the LLM. Say when to use this tool.",
    inputSchema,                  // {} for no args
    async ({ clusterName }) =>
      withToolLog("my_tool", { clusterName }, async () => {
        try {
          const data = await healthService.myMethod(clusterName);
          const validated = MyOutputSchema.parse(data);
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
```

**No-input tool** — use `{}` as the schema (see `fleetHealth.ts`).

**Optional param** — use `z.string().optional()` (see `listActiveAlerts.ts`).

## Register in server.ts

```typescript
import { registerMyTool } from "./tools/myTool.js";

// inside createAcmMcpServer():
registerMyTool(server, healthService);
```

## Type + Schema Pattern

In `src/types/health.ts` or `src/types/observability.ts`:

```typescript
export const MyOutputSchema = z.object({
  clusterName: z.string(),
  health: HealthLevelSchema,
});
export type MyOutput = z.infer<typeof MyOutputSchema>;
```

Reuse `HealthLevelSchema`, `ClusterConditionSchema` from `health.ts` where possible.

## Service Method Pattern

Add logic to the service, not the tool file. Tools only validate I/O and handle errors.

```typescript
// src/services/healthService.ts
async myMethod(clusterName: string): Promise<MyOutput> {
  const cluster = await this.clusterProvider.getManagedCluster(clusterName);
  if (!cluster) throw new ClusterNotFoundError(clusterName);
  return toMyOutput(cluster); // transform in src/utils/health.ts
}
```

For observability, add to `ObservabilityService` and use `PrometheusClient` / `AlertmanagerClient` via `src/clients/`.

## Conventions

| Item | Rule |
|------|------|
| Tool name | `snake_case` (e.g. `fleet_health`, `list_nodes`) |
| Register fn | `register<Name>Tool` exported from `src/tools/` |
| Description | Tell the LLM **what** it returns and **when** to call it |
| Output | Always `formatToolResult()` — JSON via `JSON.stringify` |
| User errors | `formatToolError(message)` with `isError: true` |
| Not found | Catch `ClusterNotFoundError`, return `formatToolError` |
| Unexpected errors | Re-throw — `withToolLog` logs and MCP returns 500 |
| Validation | Parse service output with Zod before returning |
| Logging | Wrap handler in `withToolLog(toolName, args, fn)` |
| Imports | Use `.js` extension (ESM): `"../services/healthService.js"` |

## Observability Tools

Require `config.yaml` observability URLs. Service methods should degrade gracefully:

- `listActiveAlerts` returns `[]` if Alertmanager is down
- `fetchNodes` / metrics throw if Prometheus is unreachable

Prometheus queries live in `observabilityService.ts`. Use `clusterSelector()` to scope by cluster.

## Data Sources

`config.yaml` → `createDataClient()` in `kubernetes.ts`:

- `source: kubernetes` — ACM hub via kubeconfig (`ManagedCluster` CRs)
- `source: globalhub` — Postgres (`status.managed_clusters`)

New inventory sources implement `ClusterInventoryProvider` interface.

## Verify

```bash
npm run typecheck
npm run build && npm start
```

Test prompts in `example_prompts.md`. Add a row when the tool is user-facing.

## Do Not

- Put business logic in `src/tools/` — keep tools thin
- Skip Zod validation on tool output
- Use camelCase MCP tool names
- Add write/mutating operations without explicit user request (fleet tools are read-only)
- Create skills in `~/.cursor/skills-cursor/` (reserved for Cursor built-ins)

## Reference

For a full walkthrough with a concrete example, see [examples.md](examples.md).
