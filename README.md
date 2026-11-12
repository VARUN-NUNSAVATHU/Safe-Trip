# SafeTrip 🛡️

> **Smart travel reminder and family safety application.**
> *Never forget to inform your parents and loved ones when you start travelling.*

---

## 🎯 The Core Problem
Users often leave home in a hurry and forget to inform their parents or trusted contacts that they have departed. Parents worry unnecessarily, and manual check-in messages are forgotten when rushing to catch a train, cab, or bus.

## 🚀 The SafeTrip Solution & MVP Flow
1. **Home Safe Zone**: SafeTrip monitors your virtual home perimeter (e.g. 150m radius).
2. **Boundary Exit Detected**: When you step outside the perimeter, SafeTrip triggers an alarm-like notification with audio/vibration.
3. **One-Tap Confirmation**: You confirm *"Start Trip & Notify Family"* in one tap.
4. **Live Family Alert**: Parents receive instant automated departure notification and expected ETA.
5. **Safe Arrival**: When you arrive at college, work, or gym, one tap sends the safe arrival confirmation to your parents.

---

## 🎨 Consistent Color System
- **Deep Navy**: `#0B192C` / `#0F172A` (Backgrounds, primary headers, dark surfaces)
- **Blue**: `#2563EB` / `#3B82F6` (Action accents, route visualizer, transport indicators)
- **Teal**: `#0D9488` / `#00A896` / `#14B8A6` (Primary safety brand color, shields, arrival badges, CTAs)
- **White**: `#FFFFFF` (Card surfaces, clean contrast)
- **Light Gray**: `#F8FAFC` / `#F1F5F9` / `#E2E8F0` (Screen backgrounds, borders, chips)
- **Orange (Strictly for Warnings)**: `#F97316` / `#EA580C` (Geofence exit alarm notification, emergency SOS alerts)

---

## 📱 The 12 Application Screens
1. **Splash Screen**: Brand shield animation, tagline, and instant onboarding access.
2. **Onboarding**: 3-step startup value tour highlighting auto-departure detection, smart geofencing, and parental peace of mind.
3. **Login Screen**: Clean, startup-style authentication with quick demo access mode.
4. **Register Screen**: New traveler onboarding with phone number capture for safety SMS alerts.
5. **Home Dashboard**:
   - Greeting: *"Good Morning, Alex"*
   - Live Status Badge: **SAFE / NO ACTIVE TRIP**
   - Home Zone location card with 150m perimeter indicator
   - Today's trips summary
   - 4 Quick Actions: **Start Trip**, **Destinations**, **Family**, **Settings**
   - **Simulate Leaving Home Zone**: Interactive trigger for testing the geofence alarm modal instantly
6. **Set Home Location**: Visual map radius representation (100m, 150m, 250m, 500m), address editor, and GPS detection.
7. **Destinations**: Frequent commute places (Stanford Campus, Innovation Hub, Gym, Library) with one-tap trip activation and modal to add new spots.
8. **Start Trip**: Choose destination, transport mode (Metro, Car, Cycling, Walking), and select family contacts to alert with ETA.
9. **Active Trip**: Real-time progress bar, elapsed time, distance remaining, parent notification confirmation badge, **"I Reached Safely"** primary CTA, and **Emergency SOS** warning button.
10. **Trip Completed**: Celebratory safe arrival confirmation card, delivery receipt confirmation for parents, and trip statistics (duration, distance).
11. **Family Contacts**: List of trusted family members (Mom, Dad, Guardian) with individual toggles for departure alerts and arrival alerts.
12. **Settings**: User profile, geofence sensitivity, audible reminder alarms, haptic vibration preferences, and sign out.

---

## 📁 Production Directory Structure

```
tracker/
├── mobile/                           # React Native / Expo Mobile App
│   ├── assets/                       # App icons, splash screens, badges
│   ├── src/
│   │   ├── screens/                  # 12 Complete Screens
│   │   │   ├── SplashScreen.tsx
│   │   │   ├── OnboardingScreen.tsx
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── HomeZoneScreen.tsx
│   │   │   ├── DestinationsScreen.tsx
│   │   │   ├── StartTripScreen.tsx
│   │   │   ├── ActiveTripScreen.tsx
│   │   │   ├── TripCompletedScreen.tsx
│   │   │   ├── ContactsScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   ├── components/               # Reusable UI Elements
│   │   │   ├── GeofenceAlertModal.tsx # Alarm-like geofence prompt
│   │   │   ├── SafetyCard.tsx        # SAFE status & live trip widget
│   │   │   ├── QuickActionButton.tsx # Dashboard 2x2 grid action buttons
│   │   │   ├── ContactItem.tsx       # Family contact with notify switches
│   │   │   ├── DestinationCard.tsx   # Saved place card
│   │   │   ├── ScreenHeader.tsx      # Standardized header bar
│   │   │   └── SafeButton.tsx        # Reusable themed button
│   │   ├── navigation/               # Navigation Architecture
│   │   │   ├── RootNavigator.tsx     # Stack navigator for all flows
│   │   │   ├── TabNavigator.tsx      # Bottom tab bar (SafeHome, Destinations, Family, Settings)
│   │   │   └── types.ts              # Typed navigation parameters
│   │   ├── services/                 # Hardware & network services
│   │   │   ├── api.ts                # REST API client
│   │   │   └── storage.ts            # Persistent AsyncStorage client
│   │   ├── hooks/
│   │   │   └── useSafeRouteState.tsx # Central state provider & hooks
│   │   ├── utils/
│   │   │   ├── theme.ts              # Color tokens, spacing, typography, shadows
│   │   │   └── mockData.ts           # Realistic startup initial dataset
│   │   └── types/
│   │       └── index.ts              # Core TypeScript interfaces
│   ├── App.tsx
│   ├── app.json
│   ├── tsconfig.json
│   └── package.json
│
├── server/                           # Node.js + Express REST API Backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts                 # MongoDB Atlas / Mongoose connection
│   │   │   └── env.ts                # Environment variables
│   │   ├── controllers/
│   │   │   ├── authController.ts     # User register & login
│   │   │   ├── tripController.ts     # Trip start, finish, active, history
│   │   │   ├── contactController.ts  # Family contacts CRUD
│   │   │   └── userController.ts     # Profile & Home Zone update
│   │   ├── models/
│   │   │   ├── User.ts               # User schema with Home Zone
│   │   │   ├── Trip.ts               # Trip schema with notification logs
│   │   │   └── Contact.ts            # Family contact schema with alert flags
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT authentication verification
│   │   │   └── errorHandler.ts       # Error handling middleware
│   │   ├── services/
│   │   │   ├── alertService.ts       # Family notification dispatcher
│   │   │   └── tripService.ts        # Business logic for trips
│   │   ├── routes/
│   │   │   ├── authRoutes.ts         # /api/auth
│   │   │   ├── tripRoutes.ts         # /api/trips
│   │   │   ├── contactRoutes.ts      # /api/contacts
│   │   │   ├── userRoutes.ts         # /api/users
│   │   │   └── index.ts              # Main router & /api/health
│   │   └── index.ts                  # Server entry point
│   ├── tsconfig.json
│   └── package.json
│
└── package.json                      # Root workspace scripts
```

---

## 🛠️ How to Run (Web, Mobile & Backend API)

> **Important Note on Port `8081` (Unified Expo Server):**  
> Expo serves **both** the Mobile app (Expo Go QR code) and the full Desktop Website (**`http://localhost:8081`**) from **one single dev server on port `8081`**.
> - If `npm run mobile` is already running in a terminal, you do **not** need a second server—simply press **`w`** inside that terminal (or open **`http://localhost:8081`** in Chrome/Edge).
> - If you want a fresh restart of the Web server while keeping the Backend API running on port `5000`, run **`npm run web:fresh`**.

### 1. Launch Backend API (Terminal 1)
```bash
npm run server
# Backend API boots on http://localhost:5000
# Health check: http://localhost:5000/api/health
```

### 2. Launch Web & Mobile App (Terminal 2)
```bash
# Start full SafeTrip website + Expo server (opens http://localhost:8081)
npm run web

# Or if a mobile server is already occupying port 8081 and you want a clean Web restart:
npm run web:fresh
```

### Adaptive Layout Behavior
- **Desktop Browser (`http://localhost:8081` on `width >= 768px`)**: Renders the full responsive SafeTrip website with the top navigation bar and multi-column desktop layout (no bottom mobile tab bar).
- **Phone (`Expo Go` on iOS/Android or narrow mobile screen)**: Renders the native mobile app with the bottom tab bar (`SafeHome`, `Places`, `Family`, `Settings`).
