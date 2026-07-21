import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Rental from './models/Rental.js';

async function seed() {
  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/';

  console.log('Connecting to MongoDB at:', dbUri);
  await mongoose.connect(dbUri);
  console.log('Connected to DB');

  // Clean existing users
  await User.deleteMany({ email: { $in: ['landlord_test@example.com', 'customer_test@example.com'] } });
  console.log('Cleared existing test users');

  // Create landlord
  const landlord = await User.create({
    name: 'Landlord User',
    email: 'landlord_test@example.com',
    password: 'password123', // Mongoose model hook handles hashing
    phone: '+254700000100',
    role: 'landlord',
    onboardingCompleted: true,
    setupCompleted: true,
    isVerified: true,
    emailVerified: true,
  });
  console.log('Created Landlord:', landlord.email);

  // Create customer
  const customer = await User.create({
    name: 'Customer User',
    email: 'customer_test@example.com',
    password: 'password123',
    phone: '+254700000200',
    role: 'customer',
    onboardingCompleted: true,
    setupCompleted: true,
    isVerified: true,
    emailVerified: true,
  });
  console.log('Created Customer:', customer.email);

  // Clear existing rentals for this landlord
  await Rental.deleteMany({ landlord: landlord._id });

  // Create rental property
  const rental = await Rental.create({
    landlord: landlord._id,
    rentalName: 'verification luxury bedsitter',
    rentalType: 'bedsitter',
    monthlyPrice: 5000,
    location: 'cheba',
    amenities: ['wifi', 'security'],
    description: 'A beautiful luxury bedsitter near Chebaiywa campus area.',
    images: [{ url: 'https://via.placeholder.com/400x300?text=Bedsitter+Luxury', publicId: 'some-id' }],
    isAvailable: true,
  });
  console.log('Created Rental Property:', rental.rentalName);

  await mongoose.disconnect();
  console.log('Done seeding!');
}

seed().catch(err => {
  console.error('Error seeding data:', err);
  process.exit(1);
});
