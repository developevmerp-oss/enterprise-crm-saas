# Enterprise Multi-Tenant CRM & Lead Generation SaaS

An enterprise-grade B2B CRM and Lead Generation platform built with Next.js 15, React, Node.js Express, and PostgreSQL.

## Features
- **Multi-Tenant SaaS Isolation**: Tenant scoping for multiple organizations and businesses.
- **Lead Generation & Scoring**: Automated scoring algorithms, CSV bulk ingestion, and inbound webhook forms.
- **Visual Sales Funnel**: Kanban board with dynamic probability stages.
- **Commercial Quotations & Invoicing**: Itemized product catalog, tax calculation, and proposal generator.
- **Email Outreach & Live Engagement Tracker**:
  - Outbound email composition with templates and proposal attachment.
  - Real-time **Email Open Tracking** via invisible 1x1 anti-cached tracking pixel.
  - Real-time **Proposal Link Click Tracking** with automatic lead engagement scoring.
  - **Public Client Proposal Portal** (`/proposal/[token]`) for client agreement review and online approval.
- **RBAC Security**: Granular role-based access control (Super Admin, Business Owner, Sales Manager, Executive, Viewer).

## Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
