import request from 'supertest';
import { app } from '../index.js';
import { formatAlertMessage, sendFamilyAlert } from '../services/alertService.js';
import { dataStore } from '../services/dataStore.js';

describe('SafeTrip Backend API Test Suite', () => {
  let authToken: string = '';
  const testEmail = `tester_${Date.now()}@example.com`;
  let tokenA = '';
  let tokenB = '';
  const emailA = `user_alice_${Date.now()}@domain.com`;
  const emailB = `user_bob_${Date.now()}@domain.com`;

  describe('1. Health and Discovery Endpoints', () => {
    it('GET /api/health returns 200 OK and service status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('safetrip-backend');
      expect(res.body.app).toBe('SafeTrip API');
      expect(res.body.database).toBeDefined();
    });

    it('GET / returns welcome message or static bundle', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
    });
  });

  describe('2. Authentication Flow', () => {
    it('POST /api/auth/register creates a new user and returns JWT token', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Alex Johnson',
        email: testEmail,
        password: 'Password123!',
        phone: '+1-555-0144',
      });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);

      authToken = res.body.token;
    });

    it('POST /api/auth/login authenticates with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testEmail,
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('POST /api/auth/login rejects invalid password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testEmail,
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/auth/me returns authenticated user details', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('3. Destinations API', () => {
    it('GET /api/destinations returns user destinations list (clean zero-seed)', async () => {
      const res = await request(app).get('/api/destinations');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/destinations/search returns real live location suggestions', async () => {
      const res = await request(app).get('/api/destinations/search?query=Vijayawada');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].name).toBeDefined();
    });

    it('POST /api/destinations adds a new commute spot', async () => {
      const res = await request(app)
        .post('/api/destinations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Tech Campus Innovation Hub',
          latitude: 16.5062,
          longitude: 80.648,
          address: 'MG Road, Vijayawada',
          category: 'Work',
          typicalTransport: 'Car',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Tech Campus Innovation Hub');
    });
  });

  describe('4. Family Contacts API', () => {
    let createdContactId = '';

    it('POST /api/contacts creates a family contact with alert preferences', async () => {
      const res = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Sarah Johnson (Mom)',
          phone: '+1-555-0199',
          relationship: 'Mother',
          notifyOnDeparture: true,
          notifyOnArrival: true,
          isEmergencyContact: true,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Sarah Johnson (Mom)');

      createdContactId = res.body.data._id || res.body.data.id;
    });

    it('GET /api/contacts lists user family contacts', async () => {
      const res = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('DELETE /api/contacts/:id removes a contact', async () => {
      if (!createdContactId) return;

      const res = await request(app)
        .delete(`/api/contacts/${createdContactId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('5. Trips Lifecycle & Real-Time Tracking', () => {
    let activeTripId = '';

    it('POST /api/trips/start initiates a trip and triggers departure alerts', async () => {
      const res = await request(app)
        .post('/api/trips/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          destination: {
            name: 'PVP Square Mall',
            latitude: 16.5062,
            longitude: 80.648,
          },
          startLocation: {
            name: 'Home Zone',
            latitude: 16.4614,
            longitude: 80.5069,
          },
          transportMode: 'Car',
          estimatedMinutes: 20,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACTIVE');

      activeTripId = res.body.data._id || res.body.data.id;
    });

    it('POST /api/trips/:id/location updates live trip coordinates', async () => {
      if (!activeTripId) return;

      const res = await request(app)
        .post(`/api/trips/${activeTripId}/location`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          location: {
            latitude: 16.48,
            longitude: 80.58,
            address: 'En route on MG Road',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/trips/:id/complete marks trip COMPLETED and sends arrival alert', async () => {
      if (!activeTripId) return;

      const res = await request(app)
        .post(`/api/trips/${activeTripId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endLocation: {
            name: 'PVP Square Mall',
            latitude: 16.5062,
            longitude: 80.648,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/trips/history retrieves user trip records', async () => {
      const res = await request(app)
        .get('/api/trips/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('6. Device Push Token Registration', () => {
    it('POST /api/users/push-token saves Expo push token for notifications', async () => {
      const res = await request(app)
        .post('/api/users/push-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pushToken: 'ExponentPushToken[SampleTesterToken123456789]',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pushToken).toBe('ExponentPushToken[SampleTesterToken123456789]');
    });

    it('POST /api/users/push-token validates missing token', async () => {
      const res = await request(app)
        .post('/api/users/push-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('7. Multi-Channel Alert Service', () => {
    it('formatAlertMessage correctly formats departure, arrival, and emergency alerts', () => {
      const now = new Date();

      const dep = formatAlertMessage({
        userName: 'Alex',
        contactName: 'Dad',
        contactPhone: '+1-555-0100',
        type: 'DEPARTURE',
        destination: 'Campus Library',
        timestamp: now,
      });
      expect(dep.title).toContain('Departure');
      expect(dep.message).toContain('Alex has departed towards Campus Library');

      const arr = formatAlertMessage({
        userName: 'Alex',
        contactName: 'Dad',
        contactPhone: '+1-555-0100',
        type: 'ARRIVAL',
        destination: 'Campus Library',
        timestamp: now,
      });
      expect(arr.title).toContain('Arrival');
      expect(arr.message).toContain('safely reached Campus Library');

      const emg = formatAlertMessage({
        userName: 'Alex',
        contactName: 'Dad',
        contactPhone: '+1-555-0100',
        type: 'EMERGENCY',
        destination: 'Campus Library',
        timestamp: now,
      });
      expect(emg.title).toContain('EMERGENCY');
      expect(emg.message).toContain('Emergency Safety Alert');
    });

    it('sendFamilyAlert gracefully falls back to simulation mode when external credentials are blank', async () => {
      const result = await sendFamilyAlert({
        userName: 'Alex Johnson',
        contactName: 'Mom',
        contactPhone: '+1-555-0199',
        type: 'DEPARTURE',
        destination: 'Workplace Hub',
        timestamp: new Date(),
      });

      expect(result.message).toBeDefined();
      expect(typeof result.simulated).toBe('boolean');
    });
  });

  describe('8. Strict Per-Email Sandbox Data Isolation', () => {
    it('Registers User Alice and User Bob with separate tokens', async () => {
      const resA = await request(app).post('/api/auth/register').send({
        name: 'Alice Smith',
        email: emailA,
        password: 'Password123!',
      });
      expect(resA.status).toBe(201);
      tokenA = resA.body.token;

      const resB = await request(app).post('/api/auth/register').send({
        name: 'Bob Jones',
        email: emailB,
        password: 'Password123!',
      });
      expect(resB.status).toBe(201);
      tokenB = resB.body.token;

      expect(tokenA).not.toEqual(tokenB);
    });

    it('Confirms User B starts with 0 contacts and 0 trips (no crossover from User A)', async () => {
      const contactsB = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(contactsB.body.data.length).toBe(0);

      const tripsB = await request(app)
        .get('/api/trips/history')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(tripsB.body.data.length).toBe(0);
    });

    it('User A creates contact "Alice Mom", User B does NOT see it', async () => {
      await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Alice Mom', phone: '+1-555-1111' });

      const contactsA = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(contactsA.body.data.some((c: any) => c.name === 'Alice Mom')).toBe(true);

      const contactsB = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(contactsB.body.data.some((c: any) => c.name === 'Alice Mom')).toBe(false);
      expect(contactsB.body.data.length).toBe(0);
    });

    it('User A starts trip to "Alice Office", User B does NOT see it', async () => {
      await request(app)
        .post('/api/trips/start')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          destination: { name: 'Alice Office', latitude: 16.5, longitude: 80.6 },
          startLocation: { name: 'Alice Home', latitude: 16.4, longitude: 80.5 },
        });

      const tripsA = await request(app)
        .get('/api/trips/history')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(tripsA.body.data.some((t: any) => t.destination.name === 'Alice Office')).toBe(true);

      const tripsB = await request(app)
        .get('/api/trips/history')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(tripsB.body.data.some((t: any) => t.destination.name === 'Alice Office')).toBe(false);
      expect(tripsB.body.data.length).toBe(0);
    });

    it('User B updates Home Zone to "Amaravati Capital", User A Home Zone remains untouched', async () => {
      await request(app)
        .post('/api/users/home-zone')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          name: 'Bob Amaravati Flat',
          address: 'Secretariat Road, Amaravati',
          latitude: 16.5417,
          longitude: 80.5158,
          radius: 350,
        });

      const profileB = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(profileB.body.data.homeZone.name).toBe('Bob Amaravati Flat');

      const profileA = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(profileA.body.data.homeZone.name).not.toBe('Bob Amaravati Flat');
    });
  });

  describe('9. Persistent JSON File Storage and Reload Simulation', () => {
    it('Simulates server restart by reloading dataStore from disk file', async () => {
      // Force disk reload simulation
      dataStore.reloadFromDisk();

      // Alice can still login after reload using emailA
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: emailA, password: 'Password123!' });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();

      // Alice's contact 'Alice Mom' persists across reload
      const contactsRes = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${loginRes.body.token}`);
      expect(contactsRes.status).toBe(200);
      expect(contactsRes.body.data.some((c: any) => c.name === 'Alice Mom')).toBe(true);
    });
  });
});
