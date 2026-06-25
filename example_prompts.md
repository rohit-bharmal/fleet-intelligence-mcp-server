# Example prompts

Natural-language questions to try when Fleet Intelligence MCP is connected in Cursor or MCP Inspector.

Replace `cluster1` with a cluster name from your fleet.

## Fleet overview

| Prompt | Tool |
|--------|------|
| How healthy is my fleet? | `fleet_health` |
| List all clusters in my ACM fleet. | `list_clusters` |
| Which clusters are unhealthy right now? | `list_unhealthy_clusters` |

## Registration health

| Prompt | Tool |
|--------|------|
| Is cluster1 healthy? | `cluster_health` |
| Why is cluster1 unhealthy? Explain the conditions. | `explain_cluster_health` |

## Observability

Requires Prometheus and Alertmanager port-forwards (see README).

| Prompt | Tool |
|--------|------|
| List active nodes in cluster1. | `list_nodes` |
| What alerts are firing for cluster1? | `list_active_alerts` |
| Show observability for cluster1 — nodes, CPU, memory, and alerts. | `cluster_observability` |

## Combined (LLM picks tools)

| Prompt | Tools |
|--------|-------|
| Give me a fleet status summary: registration health plus any firing alerts. | `fleet_health`, `list_active_alerts` |
| cluster1 looks off — is it registered with the hub, and are any nodes NotReady? | `explain_cluster_health`, `list_nodes` |
