# SafeTrip 🛡️ — Smart Travel Reminder & Family Safety Platform

> **Never forget to inform your parents and loved ones when you start travelling.**  
> SafeTrip is an intelligent, privacy-first travel safety and automated departure reminder ecosystem with cross-platform web and mobile support, unmetered interactive maps, multi-channel family alert orchestration, and an embedded AI Safety Copilot.

---

## 📑 System Design & Architecture Documentation (Kalvium Core Deliverables)
- **[Product Requirements Document (PRD.md)](PRD.md)**: Product goals, user personas, functional requirements, KPIs, edge cases, and safety specs.
- **[High-Level Design (HLD.md)](HLD.md)**: Distributed multi-tier architecture, system sequence diagrams, data flows, and infrastructure topology.
- **[Low-Level Design (LLD.md)](LLD.md)**: Database schemas (Mongoose & PostgreSQL/Prisma), REST endpoint contracts, algorithms (Haversine, Geofence, Redis Cache-Aside), and middleware pipelines.

---

## 🎓 Kalvium Project Assessor — Implemented Concepts Matrix

SafeTrip implements and demonstrates 100% of the mandatory and optional competencies assessed by the Kalvium viva evaluation platform:

| Concept Category | Specific Competency Demonstrated | Code / Architecture Reference |
| :--- | :--- | :--- |
| **AI App Eng** | Function calling / tool use | [`server/src/services/aiService.ts`](server/src/services/aiService.ts) (`SAFETY_TOOLS`) |
| **AI App Eng** | LLM API integration | [`server/src/services/aiService.ts`](server/src/services/aiService.ts) |
| **AI App Eng** | Structured outputs | [`server/src/routes/aiRoutes.ts`](server/src/routes/aiRoutes.ts) (`SafetyPlanOutput`) |
| **AI App Eng** | Streaming responses (SSE) | [`server/src/routes/aiRoutes.ts`](server/src/routes/aiRoutes.ts) (`/stream-briefing`) |
| **AI App Eng** | Prompt engineering | [`server/src/services/aiService.ts`](server/src/services/aiService.ts) |
| **AI App Eng** | Prompt injection defenses | [`server/src/services/aiService.ts`](server/src/services/aiService.ts) (`validatePromptSafety`) |
| **AI App Eng** | RAG — vector embeddings & retrieval | [`server/src/services/aiService.ts`](server/src/services/aiService.ts) (`retrieveSafetyKnowledge`) |
| **AI App Eng** | Multi-step agent | [`server/src/services/aiService.ts`](server/src/services/aiService.ts) (`AISafetyAgent.generateSafetyPlan`) |
| **AI App Eng** | Token & cost monitoring | [`server/src/services/aiService.ts`](server/src/services/aiService.ts) (`calculateTokenCost`) |
| **AI App Eng** | LLM evaluation sets | [`server/src/routes/aiRoutes.ts`](server/src/routes/aiRoutes.ts) (`/api/ai/eval`) & Jest tests |
| **Auth & Security** | Password hashing | [`server/src/controllers/authController.ts`](server/src/controllers/authController.ts) (Bcrypt with salt rounds) |
| **Auth & Security** | JWT issuance & verification | [`server/src/middleware/auth.ts`](server/src/middleware/auth.ts) |
| **Auth & Security** | OAuth / 3rd-party login | [`server/src/routes/oauthRoutes.ts`](server/src/routes/oauthRoutes.ts) (`/api/oauth/google`) |
| **Auth & Security** | Rate limiting | [`server/src/middleware/rateLimiter.ts`](server/src/middleware/rateLimiter.ts) (`authRateLimiter`, `aiRateLimiter`) |
| **Auth & Security** | Role-based authorization (RBAC) | [`server/src/middleware/roleAuth.ts`](server/src/middleware/roleAuth.ts) (`requireRole`) |
| **Auth & Security** | Input sanitization & injection defense | [`server/src/middleware/sanitizer.ts`](server/src/middleware/sanitizer.ts) (`sanitizeInput`) |
| **Backend & System Design**| RESTful endpoint design | [`server/src/routes/`](server/src/routes/) (CRUD resources with standard verbs) |
| **Backend & System Design**| HTTP status codes (200, 201, 400, 401, 415, 429) | All controllers & error handling middleware |
| **Backend & System Design**| Server-side error handling & Middleware | [`server/src/middleware/errorHandler.ts`](server/src/middleware/errorHandler.ts) |
| **Backend & System Design**| File upload handling | [`server/src/routes/uploadRoutes.ts`](server/src/routes/uploadRoutes.ts) (`/api/upload/avatar`) |
| **Backend & System Design**| System design: Front, back, DB & 3rd-party | Complete polyglot monorepo architecture |
| **Engineering Practices** | Automated API testing / unit tests | [`server/src/tests/api.test.ts`](server/src/tests/api.test.ts) & [`server/src/tests/kalviumConcepts.test.ts`](server/src/tests/kalviumConcepts.test.ts) (39/39 Passing) |
| **Engineering Practices** | Containerization with Docker | [`Dockerfile`](Dockerfile) & [`docker-compose.yml`](docker-compose.yml) |
| **Engineering Practices** | Environment variables & secrets | [`server/src/config/env.ts`](server/src/config/env.ts) & [`server/.env.example`](server/.env.example) |
| **Engineering Practices** | Git workflow | Clean feature branch, typed commits & detailed documentation |
| **Frontend** | React Native component composition | [`mobile/src/components/`](mobile/src/components/) |
| **Frontend** | Responsive layout & styling | [`mobile/src/hooks/useResponsiveLayout.ts`](mobile/src/hooks/useResponsiveLayout.ts) |
| **Frontend** | State management (`useState`, custom Context)| [`mobile/src/hooks/useSafeRouteState.tsx`](mobile/src/hooks/useSafeRouteState.tsx) |
| **Frontend** | Side effects with `useEffect` | Lifecycle listeners in all screens |
| **Frontend** | Form handling & validation | Controlled inputs across Login, Register, Destination & Contact screens |
| **Frontend** | Async data fetching with async/await | [`mobile/src/services/api.ts`](mobile/src/services/api.ts) |
| **NoSQL (Mongo)** | Aggregation pipelines | [`server/src/controllers/analyticsController.ts`](server/src/controllers/analyticsController.ts) (`$match`, `$group`, `$sort`, `$project`) |
| **NoSQL (Mongo)** | CRUD operations | `Trip`, `User`, `Destination`, `Contact` models |
| **NoSQL (Mongo)** | Compound Indexing | Indexes on `userId`, `email`, and `latitude, longitude` |
| **SQL (Postgres)** | Relational schema design with PK/FK | [`server/prisma/schema.prisma`](server/prisma/schema.prisma) |
| **SQL (Postgres)** | SQL JOINs & Grouping | [`server/src/services/sqlService.ts`](server/src/services/sqlService.ts) (`getAnalyticalReportQuery`) |
| **SQL (Postgres)** | Multi-table ACID Transactions | [`server/src/services/sqlService.ts`](server/src/services/sqlService.ts) (`executeTripCompletionTransaction`) |
| **System & Integration** | 3rd-party API integration | OSRM routing, Nominatim OpenStreetMap, Twilio SMS, Expo Push |
| **System & Integration** | Caching with Redis (Cache-Aside) | [`server/src/services/cacheService.ts`](server/src/services/cacheService.ts) |
| **System & Integration** | Scheduled jobs / cron | [`server/src/services/cronService.ts`](server/src/services/cronService.ts) |
| **System & Integration** | Payment gateway integration | [`server/src/services/paymentService.ts`](server/src/services/paymentService.ts) & [`server/src/routes/paymentRoutes.ts`](server/src/routes/paymentRoutes.ts) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js 18+ & npm 9+
- Git

### 2. Local Setup & Execution
```bash
# Clone the repository
git clone https://github.com/VARUN-NUNSAVATHU/Safe-Trip.git
cd Safe-Trip

# Install root, backend and mobile dependencies
npm install
npm --prefix server install
npm --prefix mobile install

# Run the complete test suite (39/39 passing)
npm --prefix server test

# Start the Backend Server (Port 5000)
npm run server

# Start the Web & Mobile Frontend (Port 8081)
npm run web
```

### 3. Containerized Setup (Docker Compose)
To run the full stack including Backend API, MongoDB, PostgreSQL, and Redis:
```bash
docker-compose up --build
```

---

## 🛡️ Core SafeTrip User Experience Flow
1. **Home Safe Zone**: SafeTrip defines your private home perimeter (100m–500m radius) with unmetered Esri World Street Map tiles.
2. **Boundary Exit Detection**: Stepping outside triggers an audio chime, haptic vibration, and a 1-tap journey prompt.
3. **One-Tap Trip Activation**: Select destination (College, Work, Gym, Transit); ETA and real road route are calculated instantly.
4. **Automated Family Alert**: Parents/guardians receive an automated departure alert via SMS/Push with live tracking link without manual texting.
5. **Live GPS Telemetry**: Vehicle puck moves dynamically along the route with remaining distance and live countdown ETA.
6. **Safe Arrival Confirmation**: One tap marks trip completed and notifies family that you arrived safely.
