# SafeTrip — Product Requirements Document (PRD)

---

## 1. Document Control & Metadata
- **Product Name**: SafeTrip (formerly SafeRoute)
- **Version**: 1.0.0
- **Document Status**: Approved / Baseline
- **Author**: SafeTrip Engineering & Product Team
- **Target Audience**: Students, Commuters, Solo Travelers, Families & Guardians

---

## 2. Executive Summary & Problem Statement

### 2.1 The Problem
Millions of college students, night-shift employees, and solo travelers commute daily between home, campus, coaching centers, gyms, and workplaces. However:
1. **Forgetfulness & Distraction**: Travelers frequently forget to inform their parents or guardians when departing or arriving safely.
2. **Safety Anxiety**: Parents and families experience acute anxiety when loved ones do not respond during commutes or when battery drains unexpectedly.
3. **Manual Check-ins are Ineffective**: Traditional phone calls or messaging apps require conscious manual effort at high-stress moments (stepping out in rain, catching buses, rushing to lectures).
4. **Battery Drain of Traditional Trackers**: Existing location trackers poll continuous high-frequency GPS indefinitely, rapidly draining phone batteries and causing users to disable location permissions.

### 2.2 The Solution
SafeTrip is an intelligent, privacy-first travel safety and automatic departure reminder ecosystem designed for Web and Mobile platforms (iOS, Android, Responsive Web). SafeTrip automates traveler safety through:
- **Zero-Touch Automated Geofence Monitoring**: Detects when a user exits their configurable "Home Safe Zone" (100m–500m radius) and prompts an instant 1-tap journey activation.
- **Multi-Modal Real-Time Route Telemetry**: Dynamic ETA calculation across 4 transport modes (Car, Transit, Walking, Bicycle) powered by OpenStreetMap / OSRM routing engine.
- **Automated Multi-Channel Family Protection**: Automatically dispatches real-time departure and arrival alerts to designated family members via SMS (Twilio), Push Notifications (Expo), and Webhooks without manual texting.
- **Battery-Optimized Dynamic Polling**: GPS polling dynamically adjusts between low-power sleep (inside geofence) and intelligent interval tracking (8-second / 15-meter delta during active transit).
- **Embedded AI Safety Copilot**: Context-aware AI assistant providing route risk assessments, weather hazard advisories, and emergency protocols.

---

## 3. User Personas

| Persona | Demographics | Key Goals | Pain Points | SafeTrip Value Proposition |
| :--- | :--- | :--- | :--- | :--- |
| **Priya (The Student)** | 20 yrs, University Student, commutes 18 km | Reach university on time; keep parents informed without constant calls. | Rushes out in morning; forgets to message; battery drains quickly. | Automatic geofence exit alert triggers 1-tap journey start with ETA to campus. |
| **Rajesh (The Parent)** | 48 yrs, Working Father | Peace of mind regarding daughter's commute; prompt alerts on unexpected delays. | Constant worry; calls go unanswered during lectures or bus transit. | Automated SMS/push arrival alert received immediately upon daughter reaching university. |
| **Ananya (Night Shift Professional)** | 26 yrs, Software Engineer commuting late | Safe late-night return commute; quick access to SOS. | Traveling alone at 11 PM; fear of vehicle breakdown in dark stretches. | Live journey share link with real-time GPS telemetry; 1-tap Emergency SOS broadcast. |

---

## 4. Key Product Goals & Success Metrics (KPIs)

### 4.1 Product Objectives
- **Zero-Friction Adoption**: Allow guest exploration on web and mobile with frictionless onboarding, requiring authentication only when arming family safety alerts and active trips.
- **Sub-Second Geofence Response**: Detect geofence boundary departure within < 5 seconds of leaving the configured perimeter.
- **Multi-Platform Consistency**: 100% feature parity and fluid responsive UI across mobile touchscreens and desktop monitors.
- **Zero Metered API Costs**: Rely on unmetered, high-reliability map tile servers (Esri World Street Map, OpenStreetMap) eliminating proprietary map key watermarks or outages.

### 4.2 Key Performance Indicators (KPIs)
- **Check-in Compliance Rate**: Increase parent check-in rate from baseline 35% (manual calls) to > 94% (SafeTrip automated flow).
- **Battery Consumption**: < 2.5% battery drain per 1 hour of active transit tracking.
- **API Availability**: 99.9% uptime for backend REST API and WebSocket telemetry gateway.
- **Alert Dispatch Latency**: < 2.0 seconds from geofence crossing / trip completion to SMS delivery.

---

## 5. Functional Requirements (FR)

### Module 1: Authentication & User Profile Management
- **FR-1.1**: User registration with Name, Email, Password, and Role-Based Access Control (`user`, `admin`).
- **FR-1.2**: Password security using Argon2/Bcrypt with minimum 8-character complexity.
- **FR-1.3**: Stateless session management via JWT (JSON Web Tokens) with 7-day expiration.
- **FR-1.4**: Third-Party OAuth authentication integration (Google OAuth 2.0 / GitHub SSO).
- **FR-1.5**: Guest Mode: Allows users to explore maps, route estimations, and UI; gracefully prompts Sign-In modal when saving home zone, adding contacts, or starting trips.
- **FR-1.6**: Multi-device Push Token registration for push notification dispatches.

### Module 2: Home Safe Zone & Geofencing Perimeter
- **FR-2.1**: Interactive visual map centered on user's current GPS location or searchable address.
- **FR-2.2**: Configurable geofence radius options: `100m` (Apartment), `200m` (Default), `300m` (Suburban), `500m` (Wide).
- **FR-2.3**: Real-time Geofence monitoring via background location services with state tracking (`isInside`, `lastInsideTime`).
- **FR-2.4**: Geofence Departure Alarm: When the device transitions from inside to outside the geofence, triggers a visual modal, audio reminder chime, and haptic vibration prompting the user to confirm trip destination.
- **FR-2.5**: Manual Geofence Exit Simulation: "Test Exit" button allowing users and QA to verify alarm and notification triggers without physically traveling.

### Module 3: Destination Catalog & Live Route Telemetry
- **FR-3.1**: Saved Destinations CRUD: Users can save, edit, and categorize frequent commute spots (College, Work, Gym, Transit Hub, Shopping).
- **FR-3.2**: Real-Time Place Search Autocomplete powered by OpenStreetMap Nominatim with debounced typing (300ms).
- **FR-3.3**: Multi-Modal Routing Engine: Computes exact road route geometry, road distance, and travel duration across:
  - **Car**: Average road speed 45 km/h.
  - **Transit (Bus/Metro)**: Average schedule speed 32 km/h.
  - **Bicycle**: Average riding speed 16 km/h.
  - **Walking**: Average pedestrian speed 4.5 km/h.
- **FR-3.4**: Fallback Road Geometry: In offline scenarios, computes curved Bezier arc interpolation with 1.26x Haversine road compensation factor.

### Module 4: Active Journey & Real-Time Tracking
- **FR-4.1**: Active Journey Dashboard displaying:
  - Departure Point with red badge pin.
  - Destination Point with green badge pin.
  - Live animated vehicle puck moving dynamically along route coordinates.
  - Progress bar (0% to 100%), remaining distance (km), and real-time countdown ETA (minutes).
- **FR-4.2**: Real-Time Location Updates: Device publishes live GPS coordinates `(lat, lon, accuracy, speed, timestamp)` to backend every 8 seconds / 15 meters.
- **FR-4.3**: Live Ride Sharing: Generates a shareable URL (`https://safetrip.app/live/:tripId`) allowing family members to view live vehicle progress on web browsers without installing the app.
- **FR-4.4**: Emergency SOS: 1-tap panic button broadcasting high-priority distress alerts with current GPS coordinates to all family contacts.
- **FR-4.5**: Reached Safely Action: Stops active tracking, marks trip as `COMPLETED`, records arrival timestamp, and dispatches arrival confirmation to family.

### Module 5: Family Contacts & Multi-Channel Alert Gateway
- **FR-5.1**: Family Contacts CRUD: Save trusted contacts with Name, Phone number, Email, and Relationship (Mother, Father, Guardian, Spouse, Friend).
- **FR-5.2**: Automated Alert Channels:
  - **SMS**: Dispatches departure and arrival messages via Twilio API.
  - **Push Notification**: Dispatches rich notifications via Expo Push Notification service.
  - **Webhook**: External safety endpoints / enterprise alert monitors.
  - **Simulation Fallback**: If external API credentials are unconfigured, logs comprehensive formatted alert summaries to console and database without throwing runtime errors.
- **FR-5.3**: Per-User Data Isolation: Complete sandbox isolation ensuring contacts, trips, and geofences belonging to User A are never accessible or visible to User B.

### Module 6: AI Safety Copilot (AI App Engineering)
- **FR-6.1**: Real-Time Safety Risk Analysis: Evaluates destination coordinates, time of day, and weather hazards to provide actionable travel advice.
- **FR-6.2**: Tool Calling / Function Execution: AI copilot can invoke internal tools such as `getWeatherAlerts`, `findNearbyPoliceStations`, and `calculateSafetyScore`.
- **FR-6.3**: Structured Output: Returns strict JSON schema conforming to `SafetyReportSchema`.
- **FR-6.4**: Streaming Responses: Server-Sent Events (SSE) streaming safety briefings in real-time.
- **FR-6.5**: Prompt Injection Defense: System prompt isolation, input sanitization, and output validation to prevent adversarial prompt overrides.

---

## 6. Non-Functional Requirements (NFR)

### 6.1 Performance
- **Map Render Time**: Initial Leaflet map render within < 600ms on 4G mobile networks.
- **API Response Time**: 95th percentile latency < 120ms for all read/write REST endpoints.
- **Client Frame Rate**: 60 fps smooth transitions across modal overlays and Leaflet marker animations.

### 6.2 Security & Privacy
- **Transport Layer Security**: HTTPS / TLS 1.3 encryption on all external network communication.
- **Data Protection at Rest**: Passwords hashed with salt rounds = 10; authentication tokens signed with HMAC-SHA256.
- **Location Privacy**: GPS location data is retained strictly for active trip monitoring and personal trip history; no third-party ad tracking or broker monetization.
- **Input Sanitization**: All incoming payload fields sanitized against SQL Injection (SQLi), NoSQL Injection, and Cross-Site Scripting (XSS).

### 6.3 Reliability & Availability
- **Offline Resiliency**: Client falls back seamlessly to `AsyncStorage` when internet connectivity drops; synchronizes pending trip logs upon reconnection.
- **Dual Database Architecture**: Fully functional with local persistent JSON datastore, Cloud MongoDB Atlas, and PostgreSQL/Prisma relational persistence.
- **Zero Uncaught Exceptions**: Global error boundary middleware catching all unhandled rejections with standardized error format.

### 6.4 Usability & Accessibility
- **WCAG 2.1 AA Compliance**: High-contrast brand green (`#42B83F`) and navy typography (`#0F172A`) ensuring readability in bright sunlight.
- **Responsive Layout**: Fluid breakpoints supporting Mobile (< 768px), Tablet (768px–1024px), Desktop (1024px–1440px), and Ultra-wide (> 1440px).

---

## 7. Out of Scope (Future Roadmap)
- Public transit real-time bus beacon hardware integration (Phase 2).
- Native CarPlay / Android Auto in-dash integration (Phase 2).
- Group family live geofence mesh (Phase 3).
