# CI/CD, Docker & Kubernetes — Full Explanation
### EcoRecycle Project

---

## TABLE OF CONTENTS

1. [The Big Picture](#the-big-picture)
2. [Docker](#part-1-docker)
3. [GitHub Actions (CI)](#part-2-github-actions-ci)
4. [Kubernetes](#part-3-kubernetes)
5. [ArgoCD — GitOps](#part-4-argocd--gitops)
6. [Complete Flow End to End](#the-complete-flow-end-to-end)
7. [Quick Reference Commands](#quick-reference--useful-commands)

---

## THE BIG PICTURE

```
You push code → GitHub Actions runs CI → builds Docker images →
pushes to Docker Hub → updates k8s manifests → ArgoCD detects
the change → deploys to Kubernetes cluster
```

---

## PART 1: DOCKER

### What Docker Actually Is

Without Docker, to run your app someone needs to:
- Install Node.js (exact version)
- Install PostgreSQL (exact version)
- Set environment variables
- Hope their OS behaves the same as yours

Docker solves this by packaging the app **and its entire environment** into an image —
a snapshot of everything needed to run it. That image runs identically on any machine.

---

### Images vs Containers

|          | Image                          | Container                              |
|----------|--------------------------------|----------------------------------------|
| What it is | A blueprint (read-only)      | A running instance of an image         |
| Analogy  | A class in OOP                 | An object/instance                     |
| Stored   | Docker Hub or locally          | Only on your machine while running     |

```bash
docker pull postgres:16-alpine     # downloads the image
docker run postgres:16-alpine      # creates and starts a container from it
```

---

### Dockerfile — How Your Image Is Built

Your backend has a Dockerfile. A typical NestJS one looks like this:

```dockerfile
# Stage 1 — "builder"
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (Docker caches this layer)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Stage 2 — "production" (smaller final image)
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# Copy only the built output from stage 1
COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/main.js"]
```

**Why two stages?**
- Stage 1 (`builder`) has all dev tools (TypeScript compiler, etc.) — it's big
- Stage 2 (`production`) only has what's needed to RUN the app — much smaller
- The final image doesn't include source code, only compiled JS

**Docker layer caching:**
```dockerfile
COPY package*.json ./    # this layer is cached
RUN npm ci               # only re-runs if package.json changed
COPY . .                 # re-runs on every code change
```

Docker caches each line. If `package.json` didn't change, it skips `npm ci` on rebuild — saves minutes.

In your `docker-compose.yml`:
```yaml
backend:
  build:
    context: ./backend   # look for Dockerfile in ./backend
    target: builder      # use the "builder" stage (dev mode with hot reload)
```

---

### Docker Networking

When you run `docker-compose up`, Docker creates a **private network** for all services.
They can reach each other by service name:

```
Your machine
│
├── localhost:3000  ──→  [frontend container]
│                              │ calls http://api:4000  (service name!)
├── localhost:4000  ──→  [backend container]
│                              │ connects to postgres:5432
└── localhost:5432  ──→  [postgres container]
```

From **outside** Docker (your browser, DBeaver) you use `localhost:PORT`.
From **inside** Docker (container to container) you use the service name.

That's why:
```yaml
# docker-compose.yml — backend talks to postgres by service name
DATABASE_URL: postgresql://postgres:postgres@postgres:5432/recycling
#                                                      ^^^^^^^^ service name, not localhost

# frontend .env — browser talks to backend via localhost (browser is outside Docker)
NEXT_PUBLIC_API_URL: http://localhost:4000
```

---

### Volumes — Persistent Data

Containers are **ephemeral** — when they stop, all data inside is gone. Volumes solve this.

```yaml
# Named volume — Docker manages this disk
volumes:
  postgres_data:

services:
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data
#       ^^^^^^^^^^^^^ volume name
#                     ^^^^^^^^^^^^^^^^^^^^^^^^^ where inside the container
```

```yaml
# Bind mount — maps your local folder into the container
volumes:
  - ./backend/src:/app/src
# local path ↑    ↑ container path
```

- **Bind mounts** are used in dev so the container sees your code changes live (hot reload)
- **Named volumes** are used for databases so data survives container restarts

---

### Healthcheck

```yaml
postgres:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 5s    # check every 5 seconds
    timeout: 5s     # fail if no response in 5s
    retries: 5      # mark as unhealthy after 5 failures
```

`pg_isready` is a Postgres tool that returns success if the DB is accepting connections.
Docker runs this every 5 seconds and marks the container healthy/unhealthy.

The backend waits for it:
```yaml
backend:
  depends_on:
    postgres:
      condition: service_healthy   # don't start until postgres is healthy
```

Without this, the backend would start, try to connect to Postgres before it's ready,
crash, and Docker would restart it in a loop.

---

## PART 2: GITHUB ACTIONS (CI)

### What CI Means

CI = Continuous Integration. Every time code is pushed, automatically:
1. Run tests
2. Check code quality
3. Build the app
4. If everything passes → deploy

The goal: catch bugs before they reach production.

---

### How GitHub Actions Works

```
.github/
└── workflows/
    └── ci.yml   ← GitHub reads this file automatically
```

The file defines **when** to run and **what** to run.

```yaml
on:
  push:
    branches: [main, dev]      # run when pushing to main or dev
  pull_request:
    branches: [main, dev]      # run when opening a PR targeting main or dev
```

---

### Jobs and Steps

```yaml
jobs:
  backend-ci:              # job name (can be anything)
    runs-on: ubuntu-latest # GitHub spins up a fresh Ubuntu VM for this

    steps:
      - uses: actions/checkout@v4        # downloads your repo code onto the VM
      - uses: actions/setup-node@v4      # installs Node.js
        with:
          node-version: "20"
          cache: npm                     # caches node_modules between runs
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: npm ci                      # clean install (faster than npm install)
        working-directory: backend       # run this command inside ./backend

      - name: Lint
        run: npm run lint
        working-directory: backend

      - name: Unit tests
        run: npm test
        working-directory: backend
```

Each step runs in sequence. If any step exits with an error, the job fails and
remaining steps are skipped.

`backend-ci` and `frontend-ci` run **in parallel** because they're separate jobs
with no dependency — saves time.

---

### Secrets

You never hardcode passwords in CI files. GitHub Secrets are encrypted environment variables:

```yaml
- name: Log in to Docker Hub
  uses: docker/login-action@v3
  with:
    username: ${{ secrets.DOCKER_USERNAME }}   # set in repo Settings → Secrets
    password: ${{ secrets.DOCKER_PASSWORD }}
```

Set in: GitHub repo → Settings → Secrets and variables → Actions

---

### Docker Build and Push

```yaml
- name: Build and push backend
  uses: docker/build-push-action@v5
  with:
    context: ./backend      # where the Dockerfile is
    push: true              # actually push to Docker Hub
    tags: |
      boqnbabanin/recycling-backend:${{ github.sha }}   # e.g. :a3f9c12
      boqnbabanin/recycling-backend:latest
    cache-from: type=gha    # use GitHub Actions cache for Docker layers
    cache-to: type=gha,mode=max
```

`github.sha` is the commit hash. Every push to main creates a uniquely tagged image.
You can always roll back to any previous version by deploying an older tag.

---

### The GitOps Commit

After pushing the Docker image, CI edits the k8s deployment file directly in the repo:

```bash
# Replace the old image tag with the new commit SHA
sed -i "s|boqnbabanin/recycling-backend:.*|boqnbabanin/recycling-backend:${{ github.sha }}|g" \
  k8s/base/backend/deployment.yaml

# Commit and push back to main
git config user.name "github-actions[bot]"
git add k8s/base/backend/deployment.yaml
git commit -m "ci: update image tags to ${{ github.sha }} [skip ci]"
git push
```

`[skip ci]` in the commit message tells GitHub Actions not to trigger the pipeline
again for this commit — otherwise it would loop forever.

This commit is what ArgoCD watches for. When the image tag in `deployment.yaml` changes,
ArgoCD deploys the new version.

---

## PART 3: KUBERNETES

### What Kubernetes Actually Does

Docker runs one container on one machine.
Kubernetes runs many containers across many machines and manages:

- **Scheduling** — which machine runs which container
- **Scaling** — automatically add more containers under load
- **Self-healing** — restart crashed containers
- **Rolling updates** — deploy new versions with zero downtime
- **Networking** — containers find each other by name
- **Secrets** — encrypted storage for passwords

---

### Namespace

An isolated virtual cluster inside your cluster:

```yaml
# k8s/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: recycling-app
```

All your resources live in `recycling-app`. This keeps them separate from other apps
(like ArgoCD which lives in the `argocd` namespace).

---

### Deployment

Tells Kubernetes: "run this container, keep N copies alive":

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: recycling-app
spec:
  replicas: 1                    # keep 1 copy running at all times
  selector:
    matchLabels:
      app: backend               # manages pods with this label
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: boqnbabanin/recycling-backend:latest
          ports:
            - containerPort: 4000
```

If the container crashes, Kubernetes immediately starts a new one.
If you update the image tag, Kubernetes does a **rolling update** — starts the new container,
waits for it to be healthy, then stops the old one. Zero downtime.

---

### Service

Pods have IPs that change every restart. A Service gives a **stable internal DNS name**:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: recycling-app
spec:
  selector:
    app: backend          # route traffic to pods with this label
  ports:
    - port: 4000
      targetPort: 4000
  type: ClusterIP         # only accessible inside the cluster
```

Any other pod in the cluster can reach the backend at `http://backend:4000`.
The Service automatically load-balances if there are multiple replicas.

---

### PersistentVolumeClaim (PVC)

Requests a real disk from Kubernetes for Postgres:

```yaml
# k8s/base/postgres/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: recycling-app
spec:
  accessModes:
    - ReadWriteOnce          # only one pod can write at a time
  resources:
    requests:
      storage: 5Gi           # request 5 gigabytes
```

The Deployment uses it:
```yaml
volumes:
  - name: postgres-storage
    persistentVolumeClaim:
      claimName: postgres-pvc

containers:
  - volumeMounts:
      - name: postgres-storage
        mountPath: /var/lib/postgresql/data   # mount at this path inside container
```

Postgres data lives on a real disk, not inside the container.
Pod can restart, data survives.

---

### Secrets

Never put passwords in deployment YAML files (they go to git). Use Secrets:

```bash
# Create once manually (never committed to git)
kubectl create secret generic backend-secret \
  --from-literal=database-url="postgresql://postgres:secret@postgres:5432/recycling" \
  --from-literal=jwt-secret="super-secret-jwt-key" \
  -n recycling-app
```

Reference in deployment:
```yaml
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: backend-secret    # secret name
        key: database-url       # key inside the secret
```

Kubernetes injects the value as an environment variable at runtime.
The actual value is never in any file.

---

### Health Probes

```yaml
readinessProbe:               # is the app ready to receive traffic?
  httpGet:
    path: /health
    port: 4000
  initialDelaySeconds: 10     # wait 10s after start before first check
  periodSeconds: 10           # check every 10s

livenessProbe:                # is the app still alive?
  httpGet:
    path: /health
    port: 4000
  initialDelaySeconds: 30
  periodSeconds: 30
```

- **Readiness** — Kubernetes won't send traffic to the pod until this passes.
  During a rolling update, new pod gets traffic only after it's ready.
- **Liveness** — if this fails, Kubernetes kills and restarts the pod.
  Handles cases like memory leaks that freeze the app without crashing it.

---

### Resource Limits

```yaml
resources:
  requests:
    memory: "128Mi"    # guaranteed minimum
    cpu: "100m"        # 100 millicores = 0.1 CPU core
  limits:
    memory: "512Mi"    # hard maximum — pod is killed if exceeded
    cpu: "500m"        # hard maximum — throttled if exceeded
```

`requests` is what Kubernetes uses to decide which node to schedule the pod on.
`limits` prevents one pod from eating all resources on a node.

---

### Ingress

The single entry point for outside traffic into the cluster:

```yaml
spec:
  rules:
    - host: recycling.local
      http:
        paths:
          - path: /api        # requests to recycling.local/api → backend:4000
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 4000
          - path: /           # everything else → frontend:3000
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 3000
```

Your ingress uses **Traefik** as the ingress controller (set via annotation).
Traefik runs inside the cluster and handles the actual routing.

---

### Kustomization

Instead of running `kubectl apply -f file1.yaml -f file2.yaml...` for every file,
Kustomize groups them:

```yaml
# kustomization.yaml
resources:
  - namespace.yaml
  - postgres/pvc.yaml
  - postgres/deployment.yaml
  - postgres/service.yaml
  - backend/deployment.yaml
  - backend/service.yaml
  - backend/servicemonitor.yaml
  - frontend/deployment.yaml
  - frontend/service.yaml
  - ingress.yaml
```

Apply everything at once:
```bash
kubectl apply -k k8s/base/
```

ArgoCD also uses this — it reads `kustomization.yaml` to know what to apply.

---

### ServiceMonitor

The `servicemonitor.yaml` file tells **Prometheus** (a monitoring tool) to scrape
metrics from the backend. Your backend deployment has these annotations:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "4000"
  prometheus.io/path: "/metrics"
```

Prometheus collects CPU usage, memory, request counts, error rates — you can
visualize all of this in a Grafana dashboard.

---

## PART 4: ARGOCD — GitOps

### What GitOps Means

**Traditional deployment:** you run `kubectl apply` manually or from CI.

**GitOps:** git is the single source of truth. The cluster watches the repo and
applies whatever is there. You never touch the cluster directly.

Benefits:
- Full audit trail (every deployment is a git commit)
- Roll back = `git revert`
- Disaster recovery = point a new cluster at the same repo
- No one can make undocumented changes to the cluster

---

### How ArgoCD Works

ArgoCD runs as pods inside your Kubernetes cluster. It:
1. Watches your git repo every 3 minutes (or via webhook)
2. Compares what's in `k8s/base/` with what's running in the cluster
3. If they differ → applies the git version to the cluster

```yaml
# k8s/argocd/application.yaml
spec:
  source:
    repoURL: https://github.com/Uspeshniq/Automation-Recycling-WebApp-App.git
    targetRevision: main      # watch the main branch
    path: k8s/base            # only watch this folder

  destination:
    server: https://kubernetes.default.svc   # deploy to this cluster
    namespace: recycling-app

  syncPolicy:
    automated:
      prune: true       # delete k8s resources removed from git
      selfHeal: true    # if someone runs kubectl manually, revert it
```

`selfHeal: true` means if someone runs `kubectl edit deployment backend` and changes
something, ArgoCD will revert it within minutes. Git is always the truth.

---

## THE COMPLETE FLOW END TO END

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Developer pushes code to main branch                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. GitHub Actions triggers                                     │
│                                                                 │
│   Job 1 (ubuntu VM):           Job 2 (ubuntu VM):              │
│   ├── checkout code            ├── checkout code               │
│   ├── install node 20          ├── install node 20             │
│   ├── npm ci (cached)          ├── npm ci (cached)             │
│   ├── npm run lint             ├── npm run lint                 │
│   └── npm test                 └── npm run build               │
│                                                                 │
│   Both run in parallel. If either fails → pipeline stops.      │
└────────────────────────────┬────────────────────────────────────┘
                             │ both passed
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Build & Push Docker images (Job 3)                          │
│                                                                 │
│   ├── docker buildx (multi-platform builder)                   │
│   ├── login to Docker Hub                                       │
│   ├── build ./backend → boqnbabanin/recycling-backend:abc123   │
│   ├── build ./frontend → boqnbabanin/recycling-frontend:abc123 │
│   └── push both images to Docker Hub                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Update k8s manifests (still Job 3)                          │
│                                                                 │
│   sed replaces image tag in deployment.yaml:                    │
│   "recycling-backend:old" → "recycling-backend:abc123"          │
│                                                                 │
│   git commit + push back to main [skip ci]                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. ArgoCD detects change in k8s/base/                          │
│                                                                 │
│   Compares git state vs cluster state                           │
│   Sees: deployment.yaml has new image tag                       │
│   Runs: kubectl apply -k k8s/base/                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. Kubernetes does rolling update                              │
│                                                                 │
│   ├── pulls boqnbabanin/recycling-backend:abc123 from Hub      │
│   ├── starts new pod                                            │
│   ├── waits for readinessProbe to pass (/health returns 200)    │
│   ├── sends traffic to new pod                                  │
│   └── terminates old pod                                        │
│                                                                 │
│   Zero downtime. Users never see an error.                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## QUICK REFERENCE — Useful Commands

### Docker
```bash
docker-compose up -d                    # start all services detached
docker-compose up -d postgres           # start only postgres
docker-compose logs -f backend          # stream backend logs
docker-compose down                     # stop everything
docker-compose down -v                  # stop + delete volumes (wipes DB!)
docker ps                               # list running containers
docker exec -it <container> bash        # open a shell inside a container
```

### Kubernetes
```bash
kubectl get pods -n recycling-app                        # list running pods
kubectl get all -n recycling-app                         # list everything
kubectl logs -f deployment/backend -n recycling-app      # stream logs
kubectl describe pod <name> -n recycling-app             # debug a pod
kubectl apply -k k8s/base/                               # apply all manifests
kubectl rollout restart deployment/backend -n recycling-app  # restart backend
kubectl get secret backend-secret -n recycling-app       # check secret exists
```

### ArgoCD
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443  # open UI at localhost:8080
argocd app sync recycling-app           # force sync now
argocd app history recycling-app        # see deployment history
argocd app rollback recycling-app <id>  # roll back to a previous version
argocd app get recycling-app            # check current status
```

### Get ArgoCD admin password
```bash
# Linux/Mac
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Windows PowerShell
$enc = kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}"
[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($enc))
```
