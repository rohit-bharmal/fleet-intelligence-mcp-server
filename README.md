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

# Prometheus / Alertmanager — port-forward first (see config.example.yaml)
observability:
  prometheusUrl: http://127.0.0.1:9091
  alertmanagerUrl: http://127.0.0.1:9094
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
| `list_clusters` | All clusters with registration health |
| `list_active_alerts` | Firing alerts from Alertmanager |
| `list_nodes` | Nodes with Ready status, conditions, CPU/memory |
| `cluster_observability` | Full picture: nodes + metrics + alerts |
| `fleet_health` | Total / healthy / warning / critical / unknown counts |
| `list_unhealthy_clusters` | Unhealthy clusters with reasons |
| `cluster_health` | Registration health for one cluster |
| `explain_cluster_health` | Full condition data for LLM summarization |

### Prometheus port-forward (required for metrics)

```bash
kubectl port-forward -n openshift-monitoring svc/thanos-querier 9091:9091
kubectl port-forward -n openshift-monitoring svc/alertmanager-main 9094:9094
```

Then set `observability.prometheusUrl` and `alertmanagerUrl` in `config.yaml`.

Example prompts: [`example_prompts.md`](example_prompts.md)

## License

Apache-2.0
