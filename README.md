# Infrastructure Asset Inventory

An enterprise-grade full-stack system to track, inspect, maintain, and manage infrastructure assets across their entire lifecycle—from planning and procurement through installation, active service, maintenance, and decommissioning.

## Monorepo Architecture

```
asset-inventory/
├── client/          # Vite + React + Tailwind CSS client application
├── server/          # Node.js + Express + MongoDB backend API
├── SPEC.md          # Technical specification, data models & API documentation
├── README.md        # Monorepo setup and developer guide
└── .gitignore       # Git ignore rules
```

## Tech Stack

- **Client**: React (Vite), Tailwind CSS, React Router, Axios, Recharts (JavaScript ES modules)
- **Server**: Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs (JavaScript ES modules)

## Quick Start

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (local community edition or MongoDB Atlas URI)

### 2. Backend Server Setup
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
Health Check: `http://localhost:5000/api/health`

### 3. Client Setup
```bash
cd client
npm install
npm run dev
```

For full system architecture, state machine rules, roles matrix, and API endpoints, review [SPEC.md](./SPEC.md).
