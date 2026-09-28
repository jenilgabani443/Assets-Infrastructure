# Infrastructure Asset Inventory System - Specification (SPEC.md)

## 1. System Overview

**Infrastructure Asset Inventory** is an enterprise-grade full-stack platform designed to track, inspect, maintain, and manage large-scale municipal, utility, institutional, and corporate physical infrastructure assets across their complete lifecycle.

### Core Objectives
- Real-time cataloging of critical infrastructure across diverse domain categories.
- Lifecycle stage progression governance with strict transition validation.
- Dynamic category-level schema definitions for domain-specific attributes.
- Comprehensive preventive and corrective maintenance dispatch and tracking.
- Immutable audit logging and historical lifecycle tracking for compliance and accountability.
- Fast multi-criteria search, spatial positioning (coordinates and physical addresses), and analytics dashboards.

---

## 2. Domain & Key Concepts

### 2.1 Asset Categories & Dynamic Custom Fields
Assets are grouped into six core categories, each containing domain-specific subcategories and dynamic custom field specifications:

1. **Civil and Public Works**
   - Subcategories: Roads, Bridges, Drainage Systems, Streetlights, Water Pipelines, Public Buildings.
   - Dynamic Attributes: Material grade, load capacity (tons), pipe diameter (mm), roadway lane count, structural rating.
2. **Utilities**
   - Subcategories: Electrical Poles, Transformers, Substations, Water Tanks, Pumps, Sewage Lines.
   - Dynamic Attributes: Voltage rating (kV), capacity (kVA / Litres), flow rate (m³/hr), pressure rating (bar), phase type.
3. **Telecom and Network**
   - Subcategories: Cell Towers, Fiber Optics Cables, Core Routers, Edge Switches, Data Center Racks & Equipment.
   - Dynamic Attributes: Height (meters), fiber core count, bandwidth throughput (Gbps), rack unit (U) position, frequency band.
4. **Building Facilities**
   - Subcategories: HVAC Chillers & Air Handlers, Elevators, Backup Diesel Generators, CCTV Surveillance, Fire Safety Systems.
   - Dynamic Attributes: Cooling capacity (tons/BTU), generator output (kVA), fuel tank capacity (L), inspection certification date.
5. **Transport**
   - Subcategories: Fleet Vehicles, Bus Terminals / Stops, Railway Tracks, Metro Rolling Stock & Signal Equipment.
   - Dynamic Attributes: VIN/Registration number, fuel/propulsion type, seating capacity, axle weight, mileage/engine hours.
6. **IT Assets**
   - Subcategories: Enterprise Laptops, Rack Servers, Network Attached Storage, Software & Hypervisor Licenses.
   - Dynamic Attributes: CPU architecture, RAM (GB), storage capacity (TB), operating system, license key / seat count.

### 2.2 Lifecycle Stages & Transition State Machine
Assets progress through 6 formal stages governed by deterministic state machine transitions:

```
 [Planned]
     │
     ▼
 [Procured]
     │
     ▼
 [Installed]
     │
     ▼
 [In Service] ◄──────────────► [Under Maintenance]
     │                                 │
     └────────────────► ◄──────────────┘
                        │
                        ▼
                 [Decommissioned]
```

#### Allowed State Transitions:
1. `Planned` ➔ `Procured`
2. `Procured` ➔ `Installed`
3. `Installed` ➔ `In Service`
4. `In Service` ➔ `Under Maintenance`
5. `Under Maintenance` ➔ `In Service`
6. `In Service` ➔ `Decommissioned`
7. `Under Maintenance` ➔ `Decommissioned`

*Any other transition (e.g. `Planned` ➔ `In Service` or `Decommissioned` ➔ `Planned`) is strictly rejected with a validation error.*

### 2.3 Asset Tag Identifiers
- Every asset receives an auto-generated, collision-free asset tag in the format `AST-0001`, `AST-0002`, `AST-0003`, etc.
- Managed atomically using a dedicated MongoDB `Counter` sequence document with `$inc` operations to guarantee uniqueness across concurrent operations.

---

## 3. Roles and Permissions Matrix

The system provides role-based access control (RBAC) with three distinct user roles:

| Module / Operation | Admin | Manager | Technician | Unauthenticated |
| :--- | :---: | :---: | :---: | :---: |
| **Authentication** (Login / Refresh / Me) | ✅ | ✅ | ✅ | Public |
| **User Management** (List, Create, Update Role/Status) | ✅ Full | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden |
| **Asset Categories** (Read / List) | ✅ | ✅ | ✅ | ❌ Forbidden |
| **Asset Categories** (Create / Edit) | ✅ | ✅ | ❌ Forbidden | ❌ Forbidden |
| **Asset Categories** (Delete) | ✅ | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden |
| **Assets** (Read / Search / Filter / Export) | ✅ | ✅ | ✅ Read-only | ❌ Forbidden |
| **Assets** (Create / Update Metadata / Custom Fields) | ✅ | ✅ | ❌ Forbidden | ❌ Forbidden |
| **Assets** (Lifecycle Stage Transition) | ✅ | ✅ | ❌ Forbidden | ❌ Forbidden |
| **Assets** (Delete / Purge) | ✅ | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden |
| **Maintenance Logs** (Read All) | ✅ | ✅ | ✅ (All read) | ❌ Forbidden |
| **Maintenance Logs** (Create / Schedule / Assign) | ✅ | ✅ | ❌ Forbidden | ❌ Forbidden |
| **Maintenance Logs** (Update Assigned Task: Notes/Status/Complete) | ✅ | ✅ | ✅ (Own tasks only) | ❌ Forbidden |
| **Maintenance Logs** (Delete) | ✅ | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden |
| **Lifecycle Events History** (Read) | ✅ | ✅ | ✅ Read-only | ❌ Forbidden |
| **Audit Logs** (Read / Filter) | ✅ | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden |
| **Dashboard Analytics & KPIs** | ✅ Full | ✅ Full | ✅ Limited/Tech | ❌ Forbidden |

---

## 4. Data Models & Schemas

### 4.1 User (`User.js`)
- `name`: String, required, trim
- `email`: String, required, unique, lowercase, trim, regex validated
- `password`: String, required, select: false, hashed via bcryptjs (salt factor 10) in pre-save hook
- `role`: String enum (`['admin', 'manager', 'technician']`), default `'technician'`
- `isActive`: Boolean, default `true`
- `timestamps`: `createdAt`, `updatedAt`
- *Methods*: `comparePassword(candidatePassword)`

### 4.2 AssetCategory (`AssetCategory.js`)
- `name`: String, required, unique, trim
- `description`: String, trim
- `icon`: String (Lucide icon identifier name)
- `fieldDefinitions`: Array of Subdocuments:
  - `key`: String, required, trim
  - `label`: String, required, trim
  - `type`: String enum (`['text', 'number', 'date', 'select', 'boolean']`), required
  - `options`: [String] (applicable if type is `'select'`)
  - `required`: Boolean, default `false`
  - `unit`: String, optional (e.g. `'kV'`, `'m'`, `'tons'`, `'psi'`, `'litres'`)
- `timestamps`: `createdAt`, `updatedAt`

### 4.3 Asset (`Asset.js`)
- `assetTag`: String, required, unique, indexed (`AST-0001` format generated via Counter model)
- `name`: String, required, trim
- `category`: ObjectId ref to `AssetCategory`, required, indexed
- `subcategory`: String, trim
- `status`: String enum (`['active', 'inactive', 'retired']`), default `'active'`
- `lifecycleStage`: String enum (`['Planned', 'Procured', 'Installed', 'In Service', 'Under Maintenance', 'Decommissioned']`), default `'Planned'`, indexed
- `location`:
  - `address`: String, trim
  - `lat`: Number
  - `lng`: Number
- `purchaseDate`: Date
- `installationDate`: Date
- `cost`: Number, min: 0, default: 0
- `expectedLifespanYears`: Number, min: 0
- `warrantyExpiry`: Date
- `department`: String, trim, indexed
- `imageUrl`: String, default `''`
- `customFields`: Schema.Types.Mixed (keyed dynamic values corresponding to category fieldDefinitions)
- `createdBy`: ObjectId ref to `User`
- `timestamps`: `createdAt`, `updatedAt`
- *Indexes*:
  - Text index: `{ name: "text", assetTag: "text", subcategory: "text" }`
  - Single indexes: `category`, `lifecycleStage`, `department`, `status`

### 4.4 MaintenanceLog (`MaintenanceLog.js`)
- `asset`: ObjectId ref to `Asset`, required, indexed
- `title`: String, required, trim
- `type`: String enum (`['preventive', 'corrective', 'inspection']`), required
- `status`: String enum (`['scheduled', 'in_progress', 'completed', 'overdue']`), default `'scheduled'`, indexed
- `scheduledDate`: Date, required, indexed
- `completedDate`: Date
- `cost`: Number, default: 0, min: 0
- `technician`: ObjectId ref to `User`, indexed
- `notes`: String, trim
- `timestamps`: `createdAt`, `updatedAt`

### 4.5 LifecycleEvent (`LifecycleEvent.js`)
- `asset`: ObjectId ref to `Asset`, required, indexed
- `fromStage`: String enum (`['Planned', 'Procured', 'Installed', 'In Service', 'Under Maintenance', 'Decommissioned']`)
- `toStage`: String enum (`['Planned', 'Procured', 'Installed', 'In Service', 'Under Maintenance', 'Decommissioned']`), required
- `changedBy`: ObjectId ref to `User`, required
- `remarks`: String, trim
- `date`: Date, default `Date.now`, indexed

### 4.6 AuditLog (`AuditLog.js`)
- `user`: ObjectId ref to `User`, indexed
- `action`: String enum (`['create', 'update', 'delete', 'stage_change', 'login']`), required, indexed
- `entity`: String, required, indexed (e.g. `'Asset'`, `'AssetCategory'`, `'MaintenanceLog'`, `'User'`)
- `entityId`: Schema.Types.Mixed, indexed
- `summary`: String, required
- `changes`: Schema.Types.Mixed (captures `before` and `after` snapshots or field deltas)
- `timestamp`: Date, default `Date.now`, indexed

### 4.7 Counter (`Counter.js`)
- `name`: String, required, unique
- `seq`: Number, default: 0

---

## 5. REST API Endpoints Specification

### 5.1 System & Health
- `GET /api/health` — System status, uptime, MongoDB connectivity state (Public)

### 5.2 Authentication (`/api/auth`)
*Rate limited by stricter authLimiter (20 requests per 15 minutes)*
- `POST /api/auth/register` — Allowed without token only if zero users exist (first user automatically becomes `admin`); otherwise requires authenticated `admin`.
- `POST /api/auth/login` — Authenticate email + password, returns JWT token + user profile; rejects inactive accounts; logs an `AuditLog` entry.
- `GET /api/auth/me` — Return authenticated user session info (JWT required).
- `PATCH /api/auth/change-password` & `PUT /api/auth/update-password` — Change password for authenticated user with bcrypt hashing.

### 5.3 User Management (`/api/users`)
*Admin role required for all endpoints*
- `GET /api/users` — List users with pagination, text search (`search`), role filter (`role`), and status filter (`isActive`).
- `GET /api/users/:id` — Get single user profile.
- `POST /api/users` — Create new user account with assigned role.
- `PUT /api/users/:id` — Update user details or role. Blocks self-demotion (`role !== 'admin'`) and self-deactivation.
- `PATCH /api/users/:id/status` & `PATCH /api/users/:id/deactivate` — Toggle or deactivate user account status. Blocks admin self-deactivation.

### 5.4 Asset Categories (`/api/categories`)
- `GET /api/categories` — List all asset categories and custom field definitions (Authenticated).
- `GET /api/categories/:id` — Get specific category (Authenticated).
- `POST /api/categories` — Create category with field definitions validation (Admin, Manager).
- `PUT /api/categories/:id` — Update category metadata and dynamic fields (Admin, Manager).
- `DELETE /api/categories/:id` — Delete category (Admin only; blocked with 400 if existing assets are assigned).

### 5.5 Infrastructure Assets (`/api/assets`)
- `GET /api/assets` — Query assets with filtering (`category`, `lifecycleStage`, `department`, `status`, `warrantyExpiringInDays`, `endOfLife`), text search (`search`), pagination (`page`, `limit`), sorting (`sort`).
- `GET /api/assets/meta/departments` — Returns distinct list of department strings.
- `GET /api/assets/export/csv` — Streams filtered inventory as a CSV file with dynamic custom fields flattened as `cf_<key>`.
- `POST /api/assets/import` — Batch JSON import of asset records with category resolution and dynamic custom field validation. Supports `{ dryRun: true }`.
- `POST /api/assets` — Create new asset; auto-generates `AST-XXXX` tag atomically, validates dynamic fields against category schema, logs initial `LifecycleEvent` & `AuditLog` (Admin, Manager).
- `GET /api/assets/:id` — Get single asset with populated category and creator references.
- `PUT /api/assets/:id` — Update asset attributes and dynamic fields. Rejects direct modifications of `lifecycleStage` or `assetTag` (Admin, Manager).
- `DELETE /api/assets/:id` — Permanently delete asset and log audit trail (Admin only).
- `PATCH /api/assets/:id/lifecycle` — Transition lifecycle stage governed by state machine. Setting `Installed` automatically sets `installationDate` if empty; records a `LifecycleEvent` and `stage_change` audit log (Admin, Manager).
- `GET /api/assets/:id/timeline` — Returns chronological unified timeline merging lifecycle state changes and maintenance logs tagged with `kind`.
- `GET /api/assets/:id/qr` — Generates a PNG Base64 Data URL encoding `${CLIENT_URL}/assets/:id`.
- `GET /api/assets/:id/audit` — Retrieves complete chronological audit trail with before/after diffs for the asset.

### 5.6 Maintenance Management (`/api/maintenance`)
- `GET /api/maintenance` — List maintenance logs with filters (`asset`, `status`, `type`, `technician`, `from`/`to`, `overdue=true`) and pagination. Technicians are restricted to tasks assigned to them. Auto-marks overdue tasks.
- `GET /api/maintenance/:id` — Get maintenance log details.
- `POST /api/maintenance` — Create & schedule maintenance item (Admin, Manager).
- `PUT /api/maintenance/:id` — Full update of maintenance record (Admin, Manager).
- `PATCH /api/maintenance/:id` — Partial update (`status`, `notes`, `cost`). Allowed for Admin, Manager, and Assigned Technician.
- `PATCH /api/maintenance/:id/start` — Sets status `in_progress`. Transitions asset from `In Service` to `Under Maintenance` and records a `LifecycleEvent` (Admin, Manager, Technician).
- `PATCH /api/maintenance/:id/complete` — Sets status `completed` and `completedDate`. Restores asset to `In Service` if no other in-progress maintenance exists, and records a `LifecycleEvent` (Admin, Manager, Technician).
- `DELETE /api/maintenance/:id` — Delete maintenance record (Admin, Manager).

### 5.7 Dashboard & Analytics (`/api/dashboard`)
- `GET /api/dashboard/stats` — High-performance aggregation pipeline returning:
  - Inventory totals (`totalAssets`, `totalValue`, `totalCategories`, `totalMaintenanceLogs`)
  - Asset count grouped by category (with names and icons)
  - Asset count grouped by `lifecycleStage` and by `status`
  - Lifespan health alerts: assets past expected lifespan or within 10% remaining lifespan
  - Warranties expiring within 30 days
  - Overdue maintenance count and upcoming tasks (next 14 days)
  - 6-month monthly maintenance expenditure breakdown
  - 10 most recent activities from `AuditLog`

### 5.8 Real-Time Notifications (`/api/notifications`)
- `GET /api/notifications` — Real-time computed alert counts for the in-app notification bell (overdue maintenance, expiring warranties, and past lifespan assets).

### 5.9 Media Uploads (`/api/uploads`)
- `POST /api/uploads/image` — Multer memory buffer upload to Cloudinary (max 5 MB, image mime-types only). Returns `{ url }`. If Cloudinary credentials are missing, returns a 503 error without crashing (Admin, Manager).

### 5.10 Scheduled Background Jobs
- `node-cron` job running daily at 08:00 AM (`0 8 * * *`):
  - Automatically identifies and marks past scheduled maintenance as `overdue`.
  - Dispatches an HTML operational digest email via Nodemailer to active administrators and managers (gracefully skipped with a log line if SMTP is unconfigured).
  - Also exposes `runDailyDigestJob()` for on-demand execution.

---

## 6. Project Monorepo Folder Structure

```
asset-inventory/
├── client/                               # React (Vite) Frontend Application
│   ├── public/                           # Static assets & favicons
│   ├── src/
│   │   ├── assets/                       # Images, SVG icons, logos
│   │   ├── components/
│   │   │   ├── common/                   # Button, Input, Modal, Badge, Table, ConfirmDialog
│   │   │   ├── layout/                   # Sidebar, Navbar, PageHeader, AppLayout
│   │   │   ├── assets/                   # AssetCard, AssetTable, AssetFilters, CustomFieldsRenderer
│   │   │   ├── categories/               # CategoryCard, FieldDefinitionBuilder
│   │   │   └── maintenance/              # MaintenanceLogModal, StatusPill, TaskCard
│   │   ├── context/                      # AuthContext, ThemeContext
│   │   ├── hooks/                        # useAuth, useDebounce, usePagination
│   │   ├── pages/                        # Dashboard, Assets, AssetDetails, Categories, Maintenance, AuditLogs, Users, Login
│   │   ├── services/                     # Axios API clients (auth, assets, categories, maintenance, users)
│   │   ├── utils/                        # formatters, validators, stageColors, constants
│   │   ├── App.jsx                       # Routing setup & ProtectedRoute wrapper
│   │   ├── main.jsx                      # React 18 DOM mount point
│   │   └── index.css                     # Tailwind CSS directives & custom design tokens
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── package.json
│
├── server/                               # Node.js + Express Backend API
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                     # Mongoose connection with exponential backoff & retry
│   │   ├── controllers/                  # Route handlers (auth, assets, categories, maintenance, users, audit)
│   │   ├── middleware/
│   │   │   ├── auth.js                   # JWT authentication & verifyRoles guard
│   │   │   ├── errorHandler.js           # Central standardized JSON error responder
│   │   │   ├── notFoundHandler.js        # Catch-all 404 handler
│   │   │   └── rateLimiter.js            # General and strict auth express-rate-limiters
│   │   ├── models/
│   │   │   ├── User.js                   # User schema with bcrypt pre-save hook
│   │   │   ├── AssetCategory.js          # Categories with dynamic field definitions
│   │   │   ├── Asset.js                  # Asset with atomic auto-tag & text indexes
│   │   │   ├── MaintenanceLog.js         # Maintenance tasks & status tracking
│   │   │   ├── LifecycleEvent.js         # Immutable state change ledger
│   │   │   ├── AuditLog.js               # Comprehensive audit history
│   │   │   ├── Counter.js                # Atomic counter for tag numbering
│   │   │   └── index.js                  # Models barrel export
│   │   ├── routes/                       # Express router definitions
│   │   ├── utils/
│   │   │   ├── apiResponse.js            # Standardized API response formatter
│   │   │   └── asyncHandler.js           # Async promise wrapper
│   │   ├── seed/
│   │   │   ├── seedData.js               # Initial categories, admin user, sample infrastructure
│   │   │   └── seeder.js                 # Database seed execution script
│   │   ├── jobs/                         # Background maintenance check & overdue alert tasks
│   │   └── server.js                     # Express app setup, middleware chain, listen bootstrap
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── .gitignore                            # Root gitignore (node_modules, .env, dist)
├── README.md                             # Monorepo setup guide
└── SPEC.md                               # This document
```

---

## 7. Security, Reliability & Error Handling Standards

1. **Standardized Responses**:
   - Success: `{ "success": true, "message": "...", "data": ... }`
   - Failure: `{ "success": false, "message": "...", "errors": [...] }`
2. **Security Headers & Protection**:
   - `helmet` security headers applied globally.
   - CORS origin enforcement strictly restricted to `CLIENT_URL` with credentials support.
   - Global rate limiter (100 req/15 min) + strict authentication limiter (20 req/15 min).
3. **Database Resilience**:
   - Mongoose connection implements reconnection retry logic and explicit error diagnostics.
   - If `MONGO_URI` is undefined, the server starts in standby mode with clear visual logs alerting the operator.
