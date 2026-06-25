# Fleet Intelligence MCP Server

MCP server for ACM / Multicluster Global Hub. Connect an LLM to your fleet and ask things like:

- How healthy is my fleet?
- Which clusters are unhealthy?
- Why is cluster-east unhealthy?

Everything is configured in one file: `config.yaml`.

## Quick start

```bash
npm install
cp config.example.yaml config.yaml
npm run build
npm start
```

Server runs at `http://127.0.0.1:3000/mcp` (change `host` / `port` in config).

## Config (`config.yaml`)

```yaml
# Data source: kubernetes (ACM hub) or globalhub (Postgres)
source: kubernetes
url: ~/.kube/config

# MCP HTTP server
host: 127.0.0.1
port: 3000
name: fleet-intelligence-mcp-server
```

### ACM hub

```yaml
source: kubernetes
url: ~/.kube/config
```

Leave `url` empty for default kubeconfig or in-cluster config.

### Global Hub

```yaml
source: globalhub
url: postgres://readonly:password@host:5432/dbname
```

Get the postgres URL:

```bash
oc get secret multicluster-global-hub-storage \
  -n multicluster-global-hub \
  -o jsonpath='{.data.database_uri_with_readonlyuser}' | base64 -d
```

## Connect Cursor

```json
{
  "mcpServers": {
    "fleet-intelligence": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

## MCP tools

| Tool | What it returns |
|------|-----------------|
| `fleet_health` | Total / healthy / warning / critical / unknown counts |
| `list_unhealthy_clusters` | Unhealthy clusters with reasons |
| `cluster_health` | Detailed health for one cluster |
| `explain_cluster_health` | Full condition data for LLM summarization |

Sample outputs: [`examples/example-responses.json`](examples/example-responses.json)

## License

Apache-2.0
