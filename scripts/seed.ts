/**
 * Seed Script — Populates the database with test data.
 *
 * Creates:
 *   - 1 primary test user (you log in as this one)
 *   - 4 friend users
 *   - 3 groups with realistic names
 *   - 25+ expenses across groups with varied categories and dates
 *
 * Usage:  npx tsx scripts/seed.ts
 *
 * Login credentials after seeding:
 *   Email:    test@example.com
 *   Password: password123
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Import models (inline to avoid server-only guard)
// ---------------------------------------------------------------------------
import '../lib/models/User';
import '../lib/models/Group';
import '../lib/models/Expense';

const User = mongoose.model('User');
const Group = mongoose.model('Group');
const Expense = mongoose.model('Expense');

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const TEST_PASSWORD = 'password123';

const users = [
  { name: 'Test User', email: 'test@example.com' },
  { name: 'Alice Johnson', email: 'alice@example.com' },
  { name: 'Bob Smith', email: 'bob@example.com' },
  { name: 'Charlie Brown', email: 'charlie@example.com' },
  { name: 'Diana Prince', email: 'diana@example.com' },
];

const groups = [
  {
    name: 'Goa Trip 2025',
    description: 'Beach vacation with the gang 🏖️',
    currency: 'INR',
    memberIndices: [0, 1, 2, 3], // Test User, Alice, Bob, Charlie
  },
  {
    name: 'Apartment Roommates',
    description: 'Monthly shared expenses for our apartment',
    currency: 'INR',
    memberIndices: [0, 1, 4], // Test User, Alice, Diana
  },
  {
    name: 'Office Lunch Club',
    description: 'Daily lunch splits with work friends',
    currency: 'INR',
    memberIndices: [0, 2, 3, 4], // Test User, Bob, Charlie, Diana
  },
];

// Expenses per group — [description, amount, category, payerIndex (within group members), daysAgo]
const expensesData: Record<number, [string, number, string, number, number][]> = {
  0: [
    // Goa Trip
    ['Flight tickets', 24000, 'Transport', 0, 30],
    ['Hotel Booking - 3 nights', 18000, 'Accommodation', 1, 28],
    ['Dinner at Fisherman\'s Wharf', 4200, 'Food', 2, 27],
    ['Scooter rental - 2 days', 1600, 'Transport', 0, 26],
    ['Beach shack drinks', 2800, 'Entertainment', 3, 26],
    ['Parasailing adventure', 6000, 'Entertainment', 1, 25],
    ['Grocery run for villa', 1500, 'Groceries', 0, 25],
    ['Breakfast at cafe', 1200, 'Food', 2, 24],
    ['Taxi to airport', 3500, 'Transport', 3, 23],
    ['Souvenirs and gifts', 2200, 'Shopping', 0, 23],
  ],
  1: [
    // Apartment Roommates
    ['Electricity bill - March', 3200, 'Utilities', 0, 15],
    ['WiFi monthly plan', 1200, 'Utilities', 1, 14],
    ['Groceries - weekly haul', 4500, 'Groceries', 0, 12],
    ['Netflix subscription', 649, 'Subscriptions', 2, 10],
    ['Water bill', 800, 'Utilities', 1, 8],
    ['House cleaning service', 2000, 'General', 0, 6],
    ['Groceries - midweek top up', 1800, 'Groceries', 2, 4],
    ['Gas cylinder refill', 950, 'Utilities', 0, 2],
    ['Spotify family plan', 179, 'Subscriptions', 1, 1],
  ],
  2: [
    // Office Lunch Club
    ['Biryani Palace order', 1600, 'Food', 0, 14],
    ['Pizza Hut delivery', 2400, 'Food', 1, 12],
    ['Subway sandwiches', 1200, 'Food', 2, 10],
    ['Coffee run - Starbucks', 1800, 'Food', 3, 8],
    ['Thai curry lunch', 2000, 'Food', 0, 6],
    ['Dominos Friday treat', 2800, 'Food', 1, 4],
    ['Samosa and chai party', 600, 'Food', 2, 2],
    ['Team dinner at Italian place', 5200, 'Food', 0, 1],
  ],
};

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!, { bufferCommands: false, tls: true });
  console.log('✅ Connected!\n');

  // ---- Clean existing test data ----
  console.log('🧹 Cleaning existing test data...');
  const existingTestUser = (await User.findOne({ email: 'test@example.com' }).lean()) as any;
  if (existingTestUser) {
    // Remove groups owned by test user
    const testGroups = await Group.find({ ownerId: existingTestUser._id }).lean();
    const groupIds = testGroups.map((g: any) => (g as any)._id);
    await Expense.deleteMany({ groupId: { $in: groupIds } });
    await Group.deleteMany({ _id: { $in: groupIds } });
  }
  // Remove all test users
  for (const u of users) {
    await User.deleteOne({ email: u.email });
  }
  console.log('✅ Clean!\n');

  // ---- Create users ----
  console.log('👤 Creating users...');
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  const createdUsers: any[] = [];

  for (const u of users) {
    const user = await User.create({
      name: u.name,
      email: u.email,
      passwordHash,
      emailVerified: new Date(), // Pre-verified so we can log in immediately
    });
    createdUsers.push(user);
    console.log(`   ✅ ${u.name} (${u.email})`);
  }

  // ---- Create groups ----
  console.log('\n👥 Creating groups...');
  const createdGroups: any[] = [];

  for (const g of groups) {
    const memberIds = g.memberIndices.map((i) => createdUsers[i]._id);
    const group = await Group.create({
      name: g.name,
      description: g.description,
      currency: g.currency,
      ownerId: createdUsers[0]._id, // Test user owns all groups
      memberIds,
    });
    createdGroups.push(group);
    console.log(`   ✅ ${g.name} (${memberIds.length} members, ${g.currency})`);
  }

  // ---- Create expenses ----
  console.log('\n💸 Creating expenses...');
  let totalExpenses = 0;

  for (let gi = 0; gi < createdGroups.length; gi++) {
    const group = createdGroups[gi];
    const groupMemberIds = groups[gi].memberIndices.map((i) => createdUsers[i]._id);
    const expenses = expensesData[gi] || [];

    for (const [description, amount, category, payerIdx, daysAgo] of expenses) {
      const payerId = groupMemberIds[payerIdx];
      const perPerson = amount / groupMemberIds.length;

      // Build splits (equal split)
      const splits = groupMemberIds.map((uid, i) => {
        let splitAmount = Math.round(perPerson * 100) / 100;
        // Adjust first person for rounding
        if (i === 0) {
          const total = Math.round(perPerson * 100) / 100 * groupMemberIds.length;
          const diff = Math.round((amount - total) * 100) / 100;
          splitAmount = Math.round((splitAmount + diff) * 100) / 100;
        }
        return { userId: uid, amount: splitAmount };
      });

      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      await Expense.create({
        groupId: group._id,
        description,
        amount,
        category,
        payerId,
        splits,
        createdBy: payerId,
        date,
      });

      totalExpenses++;
    }

    console.log(`   ✅ ${group.name}: ${expenses.length} expenses`);
  }

  // ---- Summary ----
  console.log('\n' + '═'.repeat(50));
  console.log('🎉 Seed complete!\n');
  console.log(`   Users:    ${createdUsers.length}`);
  console.log(`   Groups:   ${createdGroups.length}`);
  console.log(`   Expenses: ${totalExpenses}`);
  console.log('\n' + '═'.repeat(50));
  console.log('\n🔑 Login credentials:');
  console.log('   Email:    test@example.com');
  console.log('   Password: password123');
  console.log('');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
