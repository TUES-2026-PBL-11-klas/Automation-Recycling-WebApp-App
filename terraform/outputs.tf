output "argocd_ui" {
  description = "ArgoCD UI — open in browser after k3s is running"
  value       = "http://localhost:30080"
}

output "grafana_ui" {
  description = "Grafana UI — default login: admin / prom-operator"
  value       = "http://localhost:30300"
}

output "argocd_initial_password_cmd" {
  description = "Command to retrieve the initial ArgoCD admin password"
  value       = "kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"
}
