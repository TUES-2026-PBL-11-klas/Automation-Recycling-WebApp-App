# EcoRecycle — Automation Recycling WebApp

A full-stack web application for automating the collection and recycling of electronic waste . Built as a school project-based learning assignment.

## What it does

- Users register and submit pickup requests for their old electronics
- The system automatically groups requests by district, calculates truck capacity, and schedules optimal pickup routes
- Admins manage all requests, assign dates/times, and trigger the scheduling algorithm
- Email notifications are sent to users 24 hours before pickup

## Tech Stack

 Next.js 14, React, TypeScript, Tailwind CSS, TanStack Query 
 Backend | NestJS, TypeScript, REST API, Passport JWT |
 Database | PostgreSQL, Prisma ORM |
 Infrastructure | Docker, Kubernetes (k8s), GitHub Actions CI/CD, ArgoCD |

## Getting Started

### With Docker
```bash
docker-compose up -d
```
- Frontend: http://localhost:3000
- Backend: http://localhost:4000

### Without Docker
```bash
# Start only the database
docker-compose up -d postgres

# Backend
cd backend
npm install
npx prisma db push
npx prisma db seed
npm run start:dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Project Structure

```
├── backend/        # NestJS API
├── frontend/       # Next.js web app
├── k8s/            # Kubernetes manifests
├── terraform/      # Cloud infrastructure
├── monitoring/     # Prometheus / Grafana
└── docker-compose.yml
```

## Team

Alek Alekov · Boyan Babanin · Georgi Simeonov · Martin Stoyanov


