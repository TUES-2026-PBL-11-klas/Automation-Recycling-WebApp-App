# Infrastructure Diagram

```mermaid
graph TB
    DEV([Developer<br/>Windows + WSL2])

    subgraph HOOKS["Pre-commit Hooks (local)"]
        H1[detect-secrets]
        H2[ESLint]
        H3[check-yaml / check-json]
    end

    subgraph GITHUB["GitHub — Uspeshniq/Automation-Recycling-WebApp-App"]
        REPO[Repository<br/>src/ + k8s/ manifests]
        GSECRETS[GitHub Secrets<br/>DOCKER_USERNAME<br/>DOCKER_PASSWORD]

        subgraph CI["GitHub Actions — CI Pipeline"]
            CI1[Backend: Lint + Test]
            CI2[Frontend: Lint + Build]
            CI3[Docker Build + Push]
            CI4[Update k8s image tags]
            CI1 & CI2 --> CI3 --> CI4
        end

        REPO --> CI
    end

    subgraph DOCKERHUB["Docker Hub — boqnbabanin"]
        IMG1[recycling-backend:sha]
        IMG2[recycling-frontend:sha]
    end

    subgraph WSL["WSL2 — Ubuntu"]
        TF[Terraform<br/>IaC — provisions everything]

        subgraph K3S["k3s Cluster"]
            subgraph NS_APP["namespace: recycling-app"]
                FE[Frontend<br/>Next.js :3000]
                BE[Backend<br/>NestJS :4000]
                DB[(PostgreSQL<br/>:5432)]
                PVC[PersistentVolumeClaim<br/>postgres-pvc]
                FE -->|REST API| BE
                BE -->|Prisma ORM| DB
                DB --- PVC
            end

            subgraph NS_ARGOCD["namespace: argocd"]
                ARGOCD[ArgoCD<br/>GitOps Controller]
            end

            subgraph NS_MON["namespace: monitoring"]
                PROM[Prometheus<br/>Metrics Scraper]
                GRAF[Grafana<br/>Dashboards + Alerts]
                LOKI[Loki<br/>Log Aggregation]
                ALERT[Alertmanager<br/>Alert Routing]
                PROM --> GRAF
                LOKI --> GRAF
                PROM --> ALERT
            end

            INGRESS[Traefik Ingress<br/>:80 / :443]
            INGRESS --> FE
            INGRESS --> BE
        end

        TF -->|helm install| NS_ARGOCD
        TF -->|helm install| NS_MON
        TF -->|create| NS_APP
    end

    DEV -->|git commit triggers| HOOKS
    DEV -->|git push| REPO
    GSECRETS -.->|inject at runtime| CI
    CI3 -->|push images| DOCKERHUB
    ARGOCD -->|watches k8s/ folder| REPO
    ARGOCD -->|pulls images| DOCKERHUB
    ARGOCD -->|deploys & syncs| NS_APP
    PROM -->|scrapes /metrics| BE

    style HOOKS fill:#fff3cd,stroke:#ffc107
    style CI fill:#d1ecf1,stroke:#17a2b8
    style NS_APP fill:#d4edda,stroke:#28a745
    style NS_ARGOCD fill:#cce5ff,stroke:#004085
    style NS_MON fill:#f8d7da,stroke:#dc3545
```

## Component Roles

| Component | Role | Requirement Covered |
|---|---|---|
| GitHub Actions | CI Pipeline — lint, test, build, push | CI Pipeline |
| ArgoCD | CD — GitOps, auto-sync k8s manifests | CD |
| k3s | Kubernetes orchestrator (local) | Orchestrator |
| Terraform | Provisions namespaces + Helm charts | IaC |
| detect-secrets + ESLint | Block secrets and bad code before commit | Pre-commit hooks |
| Prometheus + Grafana | Metrics + Dashboards + Alerting | Observability + Alerting |
| Loki + Promtail | Log aggregation | Observability (logs) |
| GitHub Secrets | CI secrets (Docker Hub creds) | Secrets Management |
| Kubernetes Secrets | Runtime secrets (DB URL, JWT) | Secrets Management |

## Data Flow

1. Developer pushes code → pre-commit hooks run (secrets scan, lint)
2. GitHub Actions CI: lint → test → build Docker image → push to Docker Hub
3. CI updates image tag in `k8s/base/*/deployment.yaml` and commits `[skip ci]`
4. ArgoCD detects the manifest change → pulls new image → rolls out to k3s
5. Prometheus scrapes `/metrics` from backend every 15s
6. Grafana displays dashboards; Alertmanager fires alerts on anomalies
