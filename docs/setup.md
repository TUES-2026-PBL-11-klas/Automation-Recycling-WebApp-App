# Setup Guide — Local Infrastructure

## Running it day to day

Two scripts cover the normal cycle. From the repository root in PowerShell:

```powershell
.\scripts\start-cluster.ps1          # Docker + minikube + a window per tunnel
.\scripts\start-cluster.ps1 -ForwardsOnly   # cluster already up, tunnels died
.\scripts\stop-cluster.ps1           # close tunnels, stop minikube, free the RAM
```

`start-cluster.ps1` prints each URL and the ArgoCD admin password, and skips any
port already in use rather than opening a window that immediately fails.
Port-forwards break whenever the cluster restarts or a pod is replaced — that is
normal, and `-ForwardsOnly` reopens them.

**The application does not need any of this.** The cluster is only for the
deployment, monitoring and GitOps side. To run the app itself:

```powershell
cd backend  ; npm run start:dev     # http://localhost:4000
cd frontend ; npm run dev           # http://localhost:3000
```

The database is a native Windows PostgreSQL service, so nothing needs
containerising to develop against it. Note the local database and the one inside
the cluster are entirely separate and share no data.

---

## First-time cluster setup (WSL2 + k3s)

> The sections below describe the original k3s-in-WSL2 build. The working local
> environment is **minikube with the Docker driver on Windows**, which the
> scripts above assume. Treat the rest of this file as reference for a fresh
> build rather than a description of the current setup.

Run all commands inside **WSL2 (Ubuntu)**.

---

## 1. Install k3s

```bash
curl -sfL https://get.k3s.io | sh -

# Copy kubeconfig for Terraform and kubectl
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config

# Verify
kubectl get nodes
```

---

## 2. Install Terraform

```bash
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" \
  | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform -y

terraform version
```

---

## 3. Provision Infrastructure with Terraform

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

This installs:
- **ArgoCD** in namespace `argocd` → UI at http://localhost:30080
- **kube-prometheus-stack** (Prometheus + Grafana + Alertmanager) in `monitoring` → Grafana at http://localhost:30300
- **Loki + Promtail** in `monitoring`

---

## 4. Get ArgoCD Admin Password

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d && echo
```

Login at http://localhost:30080 with `admin` / `<password above>`.

---

## 5. Create Kubernetes Secrets (must be done manually — never stored in git)

```bash
# PostgreSQL credentials
kubectl create secret generic postgres-secret \
  --namespace recycling-app \
  --from-literal=username=postgres \
  --from-literal=password=CHANGE_THIS_PASSWORD

# Backend runtime secrets
kubectl create secret generic backend-secret \
  --namespace recycling-app \
  --from-literal=database-url="postgresql://postgres:CHANGE_THIS_PASSWORD@postgres:5432/recycling" \
  --from-literal=jwt-secret="CHANGE_THIS_JWT_SECRET_MIN_32_CHARS"
```

---

## 6. Apply ArgoCD Application

```bash
kubectl apply -f k8s/argocd/application.yaml
```

ArgoCD will now watch `k8s/base/` in the GitHub repo and automatically sync the cluster on every push to `main`.

---

## 7. Install Pre-commit Hooks

```bash
pip install pre-commit detect-secrets

# Generate the secrets baseline (run once)
detect-secrets scan > .secrets.baseline

# Install hooks into .git
pre-commit install

# Test all hooks on existing files
pre-commit run --all-files
```

---

## 8. Add GitHub Secrets

In GitHub → your repo → **Settings → Secrets and variables → Actions**, add:

| Secret name | Value |
|---|---|
| `DOCKER_USERNAME` | `boqnbabanin` |
| `DOCKER_PASSWORD` | Your Docker Hub access token |

To create a Docker Hub token: hub.docker.com → Account Settings → Security → New Access Token.

---

## 9. Add host entry for local ingress

In WSL2:
```bash
echo "127.0.0.1 recycling.local" | sudo tee -a /etc/hosts
```

On Windows (as Administrator), also edit `C:\Windows\System32\drivers\etc\hosts`:
```
127.0.0.1 recycling.local
```

App will be available at http://recycling.local.

---

## Full CI/CD Flow Summary

```
git push → GitHub Actions CI
  → backend: lint + test
  → frontend: lint + build
  → Docker build + push to Docker Hub (boqnbabanin/recycling-*)
  → update image tag in k8s/base/*/deployment.yaml [skip ci]
  → ArgoCD detects manifest change → rolls out new pods in k3s
```

## Grafana Access

- URL: http://localhost:30300
- Username: `admin`
- Password: `admin` (change after first login)
- Loki datasource is pre-configured for log exploration
