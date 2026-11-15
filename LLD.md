# SafeTrip — Low-Level Design (LLD)

---

## 1. Document Overview & Code-Level Architecture

The Low-Level Design (LLD) document provides exhaustive code-level specifications for SafeTrip. It details data models, database indexing, exact API request/response contracts, class interfaces, algorithms, and middleware execution chains.

---

## 2. Database Schema Specifications

### 2.1 MongoDB (NoSQL) Mongoose Schemas & Indexing

#### User Schema (`users`)
```typescript
interface IUser {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  phone?: string;
  pushToken?: string;
  homeZone: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    isInside: boolean;
    lastInsideTime: Date;
  };
  settings: {
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    highAccuracyGPS: boolean;
    emergencyAutoSMS: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Compound Indexes for High-Performance Queries
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ "homeZone.latitude": 1, "homeZone.longitude": 1 });
```

#### Destination Schema (`destinations`)
```typescript
interface IDestination {
  _id: ObjectId;
  userId: ObjectId; // Reference to User
  name: string;
  address: string;
  category: 'College' | 'Work' | 'Gym' | 'Transit' | 'Shopping' | 'Other';
  icon: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  estimatedMinutes: number;
  createdAt: Date;
}

// Compound Index: Enforces fast retrieval per user
DestinationSchema.index({ userId: 1, name: 1 });
```

#### Trip Schema (`trips`)
```typescript
interface ITrip {
  _id: ObjectId;
  userId: ObjectId; // Reference to User
  destination: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  origin: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  transportMode: 'Car' | 'Transit' | 'Walking' | 'Bicycle';
  distanceKm: number;
  estimatedMinutes: number;
  elapsedMinutes: number;
  startTime: Date;
  endTime?: Date;
  currentLocation?: {
    latitude: number;
    longitude: number;
    speed?: number;
    accuracy?: number;
    timestamp: Date;
  };
  routePath: Array<[number, number]>; // Array of [lat, lon] tuples
  breadcrumbs: Array<{
    latitude: number;
    longitude: number;
    timestamp: Date;
  }>;
  notifiedContacts: string[];
  createdAt: Date;
}

// Indexes for Real-time Dashboard and History Lookups
TripSchema.index({ userId: 1, status: 1 });
TripSchema.index({ startTime: -1 });
```

#### Family Contact Schema (`contacts`)
```typescript
interface IContact {
  _id: ObjectId;
  userId: ObjectId; // Reference to User
  name: string;
  phone: string;
  email?: string;
  relationship: 'Mother' | 'Father' | 'Guardian' | 'Spouse' | 'Sibling' | 'Friend';
  notifyOnDeparture: boolean;
  notifyOnArrival: boolean;
  notifyOnEmergency: boolean;
  createdAt: Date;
}

ContactSchema.index({ userId: 1 });
```

---

### 2.2 PostgreSQL Relational Schema (Prisma DDL)

SafeTrip provides enterprise-grade relational schema parity for PostgreSQL environments:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  ADMIN
}

enum TripStatus {
  SCHEDULED
  ACTIVE
  COMPLETED
  CANCELLED
}

enum TransportMode {
  CAR
  TRANSIT
  WALKING
  BICYCLE
}

model User {
  id           String        @id @default(uuid())
  name         String
  email        String        @unique
  passwordHash String
  role         Role          @default(USER)
  phone        String?
  pushToken    String?
  homeLat      Float?
  homeLon      Float?
  homeRadius   Int           @default(200)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  destinations Destination[]
  contacts     Contact[]
  trips        Trip[]

  @@index([email])
}

model Destination {
  id               String   @id @default(uuid())
  userId           String
  name             String
  address          String
  category         String
  latitude         Float
  longitude        Float
  distanceKm       Float    @default(0)
  estimatedMinutes Int      @default(0)
  createdAt        DateTime @default(now())

  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Contact {
  id                 String   @id @default(uuid())
  userId             String
  name               String
  phone              String
  relationship       String
  notifyOnDeparture  Boolean  @default(true)
  notifyOnArrival    Boolean  @default(true)
  notifyOnEmergency  Boolean  @default(true)
  createdAt          DateTime @default(now())

  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Trip {
  id               String        @id @default(uuid())
  userId           String
  destName         String
  destAddress      String
  destLat          Float
  destLon          Float
  originName       String
  originLat        Float
  originLon        Float
  status           TripStatus    @default(ACTIVE)
  transportMode    TransportMode @default(CAR)
  distanceKm       Float
  estimatedMinutes Int
  elapsedMinutes   Int           @default(0)
  startTime        DateTime      @default(now())
  endTime          DateTime?

  user             User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  alertLogs        AlertLog[]

  @@index([userId, status])
}

model AlertLog {
  id          String   @id @default(uuid())
  tripId      String
  alertType   String   // DEPARTURE, ARRIVAL, SOS
  recipient   String
  channel     String   // SMS, PUSH, WEBHOOK
  status      String   // SENT, FAILED, SIMULATED
  payload     String
  createdAt   DateTime @default(now())

  trip        Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@index([tripId])
}
```

---

## 3. RESTful API Endpoint Specifications

### 3.1 Authentication Endpoints

#### `POST /api/auth/register`
- **Description**: Registers a new user account with hashed password and generates an initial JWT token.
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "name": "Alex Johnson",
    "email": "alex@example.com",
    "password": "Password123!"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_783421",
      "name": "Alex Johnson",
      "email": "alex@example.com",
      "role": "user"
    }
  }
  ```
- **Error Codes**: `400 Bad Request` (Validation error), `409 Conflict` (Email already registered).

#### `POST /api/auth/login`
- **Description**: Verifies credentials and issues a signed JWT token.
- **Response (200 OK)**: Returns JWT token and sanitized user profile.
- **Error Codes**: `401 Unauthorized` (Invalid email or password).

---

### 3.2 Geofence & Home Location Endpoints

#### `PUT /api/users/home-zone`
- **Authentication**: Required (`Bearer <JWT>`)
- **Request Body**:
  ```json
  {
    "name": "Home Sanctuary",
    "address": "742 Evergreen Terrace, Springfield",
    "latitude": 16.4614,
    "longitude": 80.5069,
    "radiusMeters": 200
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Home safe perimeter updated successfully",
    "homeZone": {
      "latitude": 16.4614,
      "longitude": 80.5069,
      "radiusMeters": 200,
      "isInside": true
    }
  }
  ```

---

### 3.3 Trip Lifecycle Endpoints

#### `POST /api/trips/start`
- **Authentication**: Required (`Bearer <JWT>`)
- **Request Body**:
  ```json
  {
    "destination": {
      "name": "Campus Lecture Hall",
      "address": "KL University Campus, Vaddeswaram",
      "latitude": 16.5062,
      "longitude": 80.6480,
      "distanceKm": 5.4,
      "estimatedMinutes": 18
    },
    "transportMode": "Car",
    "startLocation": {
      "name": "Home Zone",
      "latitude": 16.4614,
      "longitude": 80.5069
    }
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "trip": {
      "id": "trip_99214",
      "status": "ACTIVE",
      "distanceKm": 5.4,
      "estimatedMinutes": 18,
      "notifiedContacts": ["Mom (+1-555-0199)"]
    }
  }
  ```

#### `POST /api/trips/:id/location`
- **Authentication**: Required (`Bearer <JWT>`)
- **Request Body**:
  ```json
  {
    "latitude": 16.4820,
    "longitude": 80.5510,
    "speed": 42.5,
    "accuracy": 4.2
  }
  ```
- **Response (200 OK)**: `{ "status": "TRACKING_UPDATED" }`

#### `POST /api/trips/:id/complete`
- **Authentication**: Required (`Bearer <JWT>`)
- **Response (200 OK)**:
  ```json
  {
    "status": "COMPLETED",
    "elapsedMinutes": 16,
    "distanceKm": 5.4,
    "arrivalAlertDispatched": true
  }
  ```

---

### 3.4 AI Safety Copilot Endpoints

#### `POST /api/ai/safety-advice`
- **Request Body**:
  ```json
  {
    "origin": { "lat": 16.4614, "lon": 80.5069 },
    "destination": { "lat": 16.5062, "lon": 80.6480 },
    "transportMode": "Car",
    "timeOfDay": "21:30"
  }
  ```
- **Response (200 OK)**: Structured JSON output complying with schema:
  ```json
  {
    "safetyScore": 92,
    "riskLevel": "LOW",
    "advisories": [
      "Highway stretch well-lit with active patrol.",
      "Light rain expected near destination; reduce speed."
    ],
    "emergencyStationsCount": 4
  }
  ```

#### `GET /api/ai/stream-briefing`
- **Response**: `text/event-stream` delivering token-by-token travel briefing.

---

## 4. Algorithmic Specifications

### 4.1 Haversine Great-Circle Distance Algorithm
Calculates the great-circle distance between two spherical coordinates $(lat_1, lon_1)$ and $(lat_2, lon_2)$ with earth radius $R = 6371.0\text{ km}$:

$$\Delta lat = (lat_2 - lat_1) \cdot \frac{\pi}{180}$$
$$\Delta lon = (lon_2 - lon_1) \cdot \frac{\pi}{180}$$
$$a = \sin^2\left(\frac{\Delta lat}{2}\right) + \cos\left(lat_1 \cdot \frac{\pi}{180}\right) \cdot \cos\left(lat_2 \cdot \frac{\pi}{180}\right) \cdot \sin^2\left(\frac{\Delta lon}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$
$$d = R \cdot c$$

- **Time Complexity**: $\mathcal{O}(1)$ constant time.
- **Space Complexity**: $\mathcal{O}(1)$ auxiliary space.

### 4.2 Geofence Departure State Machine
```
              [ INSIDE GEOFENCE ]
              Distance <= Radius
                      |
                      | Device moves (Distance > Radius)
                      v
             [ DEPARTURE TRIGGER ]
      Triggers Sound Chime + Haptic Pulse
      Displays Departure Confirmation Modal
                      |
         +------------+------------+
         |                         |
         v                         v
 [ Confirm Journey ]       [ Dismiss / Return ]
 Transition to ACTIVE      Reset to INSIDE state
 Dispatch Family Alert
```

### 4.3 Redis Cache-Aside Pattern
```
Client Request -> Check Redis Cache (Key: `route:${origin}:${dest}`)
                   |
     +-------------+-------------+
     | Hit                       | Miss
     v                           v
Return cached route        Query OSRM API / Haversine
(Response < 2ms)           Set Redis Cache (TTL = 3600s)
                           Return fresh route response
```

---

## 5. Middleware Architecture

SafeTrip's Express request pipeline executes in strict chronological order:

```
[ Ingress Request ]
        |
        v
1. Request Logger (Morgan / Winston)
        |
        v
2. Security Headers (Helmet.js)
        |
        v
3. Cross-Origin Resource Sharing (CORS)
        |
        v
4. JSON & URL-Encoded Body Parsers
        |
        v
5. Rate Limiter (express-rate-limit)
        |
        v
6. Input Sanitization & XSS Filter
        |
        v
7. JWT Authentication Guard (`authenticateToken`)
        |
        v
8. Role-Based Authorization Guard (`requireRole('admin')`)
        |
        v
9. Controller Route Handler
        |
        v
10. Global Error Boundary Handler (`errorHandler`)
        |
        v
[ Egress Response ]
```
