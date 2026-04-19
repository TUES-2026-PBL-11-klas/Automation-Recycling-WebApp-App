variable "kubeconfig_path" {
  description = "Path to the kubeconfig file (k3s exports to ~/.kube/config)"
  type        = string
  default     = "~/.kube/config"
}

variable "argocd_version" {
  description = "ArgoCD Helm chart version"
  type        = string
  default     = "7.3.11"
}

variable "prometheus_stack_version" {
  description = "kube-prometheus-stack Helm chart version"
  type        = string
  default     = "61.3.2"
}

variable "loki_stack_version" {
  description = "Loki stack Helm chart version"
  type        = string
  default     = "2.10.2"
}
