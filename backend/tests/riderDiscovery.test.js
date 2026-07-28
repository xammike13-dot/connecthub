import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from '../models/User.js';
import connectDB from '../config/db.js';
import { getNearbyRiders } from '../controllers/riderController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

test('ConnectHub Rider Discovery Flow Test Suite', async (t) => {
  let mongoServer;

  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;

    await connectDB();

    // Ensure 2dsphere indexes are built
    await User.ensureIndexes();

    let rider1, rider2;

    await t.test('Seed multiple test riders', async () => {
      // Clear users collection
      await User.deleteMany({});

      // Create Rider 1: Online, Kesses, Eldoret Campus, Service Radius 10km
      rider1 = await User.create({
        name: 'John Kesses',
        email: 'john@connecthub.test',
        password: 'password123',
        phone: '254711111111',
        role: 'rider',
        emailVerified: true,
        isActive: true,
        isVerified: true,
        riderProfile: {
          isOnline: true,
          status: 'online',
          currentLocation: {
            type: 'Point',
            coordinates: [35.314167, 0.292415], // [lng, lat] (near Kesses)
          },
          workingArea: {
            county: 'Uasin Gishu',
            town: 'Eldoret',
            serviceRadius: '10km',
            selectedWorkingAreas: ['Kesses'],
          },
          workingHours: {
            start: '05:00',
            end: '23:00',
          },
          dayRatePerKm: 50,
          nightRatePerKm: 75,
        },
      });

      // Create Rider 2: Online, Stage, Eldoret Campus, Service Radius 2km (Small service radius)
      rider2 = await User.create({
        name: 'James Stage',
        email: 'james@connecthub.test',
        password: 'password123',
        phone: '254722222222',
        role: 'rider',
        emailVerified: true,
        isActive: true,
        isVerified: true,
        riderProfile: {
          isOnline: true,
          status: 'online',
          currentLocation: {
            type: 'Point',
            coordinates: [35.290000, 0.285000], // [lng, lat] (near Stage)
          },
          workingArea: {
            county: 'Uasin Gishu',
            town: 'Eldoret',
            serviceRadius: '2km', // Small radius
            selectedWorkingAreas: ['Stage'],
          },
          workingHours: {
            start: '06:00',
            end: '22:00',
          },
          dayRatePerKm: 50,
          nightRatePerKm: 75,
        },
      });

      assert.ok(rider1);
      assert.ok(rider2);
    });

    await t.test('Test Rider 1 appears when online, and disappears when offline', async () => {
      // Step A: When online
      const req = {
        query: {
          latitude: '0.292415',
          longitude: '35.314167',
          maxDistance: '10000',
        },
        user: { _id: 'customer_id', role: 'customer' },
        app: { get: () => null },
      };

      const res = {
        status: function (code) { this.statusCode = code; return this; },
        json: function (data) { this.data = data; return this; },
      };

      await getNearbyRiders(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      // Both rider1 and rider2 are within 10km and matching criteria
      assert.ok(res.data.data.some(r => r.name === 'John Kesses'));

      // Step B: Set rider1 offline
      rider1.riderProfile.isOnline = false;
      rider1.riderProfile.status = 'offline';
      await rider1.save();

      // Query again
      const res2 = {
        status: function (code) { this.statusCode = code; return this; },
        json: function (data) { this.data = data; return this; },
      };
      await getNearbyRiders(req, res2, (err) => { if (err) throw err; });

      assert.equal(res2.statusCode, 200);
      assert.equal(res2.data.success, true);
      // rider1 is now offline, should not be included
      assert.equal(res2.data.data.some(r => r.name === 'John Kesses'), false);

      // Restore rider1 online
      rider1.riderProfile.isOnline = true;
      rider1.riderProfile.status = 'online';
      await rider1.save();
    });

    await t.test('Test service radius filtering works correctly', async () => {
      // Rider 2 is at [35.290, 0.285] (Stage).
      // Customer at [35.314167, 0.292415] (Kesses).
      // Distance is ~2.8km.
      // Rider 2 has a service radius of 2km, so Rider 2 should be excluded because 2.8km > 2km.
      const req = {
        query: {
          latitude: '0.292415',
          longitude: '35.314167',
          maxDistance: '10000',
        },
        user: { _id: 'customer_id', role: 'customer' },
        app: { get: () => null },
      };

      const res = {
        status: function (code) { this.statusCode = code; return this; },
        json: function (data) { this.data = data; return this; },
      };

      await getNearbyRiders(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      // John Kesses has 10km service radius, so he should be included (distance ~0km)
      assert.ok(res.data.data.some(r => r.name === 'John Kesses'));
      // James Stage has 2km service radius, so he should be excluded (distance ~2.8km > 2km)
      assert.equal(res.data.data.some(r => r.name === 'James Stage'), false);
    });

    await t.test('Test working hours filtering works correctly', async () => {
      // Set rider1 working hours to a time range that is definitely closed (e.g. 01:00 to 02:00)
      rider1.riderProfile.workingHours = {
        start: '01:00',
        end: '02:00',
      };
      await rider1.save();

      const req = {
        query: {
          latitude: '0.292415',
          longitude: '35.314167',
          maxDistance: '10000',
        },
        user: { _id: 'customer_id', role: 'customer' },
        app: { get: () => null },
      };

      const res = {
        status: function (code) { this.statusCode = code; return this; },
        json: function (data) { this.data = data; return this; },
      };

      await getNearbyRiders(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      // John Kesses should now be excluded because working hours don't match current time
      assert.equal(res.data.data.some(r => r.name === 'John Kesses'), false);

      // Restore working hours
      rider1.riderProfile.workingHours = {
        start: '00:00',
        end: '23:59',
      };
      await rider1.save();
    });

    await t.test('Test geo search returns multiple riders when they match all criteria', async () => {
      // Modify Rider 2 service radius to 5km, and add Kesses to working area so he is included
      rider2.riderProfile.workingArea.serviceRadius = '5km';
      rider2.riderProfile.workingArea.selectedWorkingAreas = ['Stage', 'Kesses'];
      await rider2.save();

      const req = {
        query: {
          latitude: '0.292415',
          longitude: '35.314167',
          maxDistance: '10000',
        },
        user: { _id: 'customer_id', role: 'customer' },
        app: { get: () => null },
      };

      const res = {
        status: function (code) { this.statusCode = code; return this; },
        json: function (data) { this.data = data; return this; },
      };

      await getNearbyRiders(req, res, (err) => { if (err) throw err; });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      // Both should now be included
      assert.ok(res.data.data.some(r => r.name === 'John Kesses'));
      assert.ok(res.data.data.some(r => r.name === 'James Stage'));
      assert.equal(res.data.count, 2);
    });

  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
});
