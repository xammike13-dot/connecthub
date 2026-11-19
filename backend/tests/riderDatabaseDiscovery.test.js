import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from '../models/User.js';
import RideRequest from '../models/RideRequest.js';
import { getNearbyRiders, updateOnlineStatus } from '../controllers/riderController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

test('Boda Riders Database Fetching and Availability Test Suite', async (t) => {
  let mongoServer;

  try {
    mongoServer = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    let riderOnline, riderOffline, riderBusy;

    await t.test('Seed test riders with various availability states', async () => {
      await User.deleteMany({});
      await RideRequest.deleteMany({});

      // Rider 1: Online and Available
      riderOnline = await User.create({
        name: 'Kamau Online',
        email: 'kamau@test.com',
        password: 'password123',
        phone: '0711111111',
        role: 'rider',
        isActive: true,
        riderProfile: {
          isOnline: true,
          status: 'online',
          isAvailable: true,
          rating: 4.8,
          totalRides: 42,
          workingArea: {
            selectedWorkingAreas: ['Stage', 'Kesses'],
          },
          motorcycle: {
            brand: 'Boxer',
            model: 'BM 150',
            plateNumber: 'KMD 123A',
          },
        },
      });

      // Rider 2: Offline
      riderOffline = await User.create({
        name: 'Otieno Offline',
        email: 'otieno@test.com',
        password: 'password123',
        phone: '0722222222',
        role: 'rider',
        isActive: true,
        riderProfile: {
          isOnline: false,
          status: 'offline',
          isAvailable: false,
          rating: 4.5,
          totalRides: 20,
        },
      });

      // Rider 3: Busy
      riderBusy = await User.create({
        name: 'Wanjiku Busy',
        email: 'wanjiku@test.com',
        password: 'password123',
        phone: '0733333333',
        role: 'rider',
        isActive: true,
        riderProfile: {
          isOnline: true,
          status: 'busy',
          isAvailable: false,
          rating: 4.9,
          totalRides: 88,
        },
      });

      assert.ok(riderOnline);
      assert.ok(riderOffline);
      assert.ok(riderBusy);
    });

    await t.test('Requirement 1 & 2: Fetch only ONLINE & AVAILABLE riders from database', async () => {
      const req = {
        query: { pickup: 'Stage' },
        app: { get: () => null },
      };

      const res = {
        statusCode: null,
        data: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          this.data = payload;
          return this;
        },
      };

      await getNearbyRiders(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.count, 1);
      assert.equal(res.data.data[0].name, 'Kamau Online');
      assert.equal(res.data.data[0].availabilityStatus, 'available');
      assert.equal(res.data.data[0].isOnline, true);
    });

    await t.test('Requirement 4 & 5: Toggle rider status syncs DB and updates availability', async () => {
      // Toggle riderOffline to online
      const toggleReq = {
        body: { isOnline: true, status: 'online' },
        user: riderOffline,
        app: { get: () => null },
      };

      const toggleRes = {
        statusCode: null,
        data: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          this.data = payload;
          return this;
        },
      };

      await updateOnlineStatus(toggleReq, toggleRes, (err) => { if (err) throw err; });
      assert.equal(toggleRes.statusCode, 200);
      assert.equal(toggleRes.data.data.riderProfile.status, 'online');
      assert.equal(toggleRes.data.data.riderProfile.isOnline, true);

      // Now query riders again - should return 2 riders (Kamau and Otieno)
      const req = {
        query: { pickup: 'Stage' },
        app: { get: () => null },
      };

      const res = {
        statusCode: null,
        data: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          this.data = payload;
          return this;
        },
      };

      await getNearbyRiders(req, res, (err) => { if (err) throw err; });
      assert.equal(res.data.count, 2);
      const names = res.data.data.map(r => r.name);
      assert.ok(names.includes('Kamau Online'));
      assert.ok(names.includes('Otieno Offline'));
    });

    await t.test('Requirement 6: Returns 0 riders when all are offline or busy', async () => {
      // Set all riders offline
      await User.updateMany(
        { role: 'rider' },
        {
          $set: {
            'riderProfile.isOnline': false,
            'riderProfile.status': 'offline',
            'riderProfile.isAvailable': false,
          },
        }
      );

      const req = {
        query: { pickup: 'Stage' },
        app: { get: () => null },
      };

      const res = {
        statusCode: null,
        data: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          this.data = payload;
          return this;
        },
      };

      await getNearbyRiders(req, res, (err) => { if (err) throw err; });
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.count, 0);
      assert.deepEqual(res.data.data, []);
    });

  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
});
