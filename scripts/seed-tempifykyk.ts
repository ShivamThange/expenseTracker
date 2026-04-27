/**
 * Seed script for tempifykyk@gmail.com
 *
 * Creates companion users, groups, expenses, and settlements
 * to showcase all website features.
 *
 * Usage: npx tsx scripts/seed-tempifykyk.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

import '../lib/models/User';
import '../lib/models/Group';
import '../lib/models/Expense';
import '../lib/models/Settlement';

const User = mongoose.model('User');
const Group = mongoose.model('Group');
const Expense = mongoose.model('Expense');
const Settlement = mongoose.model('Settlement');

const TARGET_EMAIL = 'tempifykyk@gmail.com';
const COMPANION_PASSWORD = 'password123';

const companions = [
  { name: 'Riya Sharma',   email: 'riya.sharma.seed@example.com' },
  { name: 'Arjun Mehta',   email: 'arjun.mehta.seed@example.com' },
  { name: 'Priya Nair',    email: 'priya.nair.seed@example.com' },
  { name: 'Karan Patel',   email: 'karan.patel.seed@example.com' },
  { name: 'Sneha Reddy',   email: 'sneha.reddy.seed@example.com' },
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function equalSplits(memberIds: any[], amount: number) {
  const perPerson = amount / memberIds.length;
  return memberIds.map((uid, i) => {
    let a = Math.round(perPerson * 100) / 100;
    if (i === 0) {
      const roundedTotal = a * memberIds.length;
      a = Math.round((a + Math.round((amount - roundedTotal) * 100) / 100) * 100) / 100;
    }
    return { userId: uid, amount: a };
  });
}

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!, { bufferCommands: false, tls: true });
  console.log('✅ Connected!\n');

  // ── Find target user ──────────────────────────────────────────────────────
  const targetUser = await User.findOne({ email: TARGET_EMAIL });
  if (!targetUser) {
    console.error(`❌ User ${TARGET_EMAIL} not found. Register first.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`✅ Found target user: ${targetUser.name} (${TARGET_EMAIL})\n`);

  // Set a monthly budget
  await User.updateOne({ _id: targetUser._id }, { monthlyBudget: 25000 });
  console.log('💰 Set monthly budget: ₹25,000\n');

  // ── Clean previous seed data ───────────────────────────────────────────────
  console.log('🧹 Cleaning previous seed data...');
  const seedEmails = companions.map((c) => c.email);
  const oldCompanions = await User.find({ email: { $in: seedEmails } }).lean() as any[];
  const allUserIds = [targetUser._id, ...oldCompanions.map((u: any) => u._id)];
  const oldGroups = await Group.find({ ownerId: targetUser._id }).lean() as any[];
  const oldGroupIds = oldGroups.map((g: any) => g._id);
  await Expense.deleteMany({ groupId: { $in: oldGroupIds } });
  await Settlement.deleteMany({ groupId: { $in: oldGroupIds } });
  await Group.deleteMany({ _id: { $in: oldGroupIds } });
  await User.deleteMany({ email: { $in: seedEmails } });
  console.log('✅ Clean!\n');

  // ── Create companion users ─────────────────────────────────────────────────
  console.log('👤 Creating companion users...');
  const hash = await bcrypt.hash(COMPANION_PASSWORD, 12);
  const createdCompanions: any[] = [];
  for (const c of companions) {
    const u = await User.create({ name: c.name, email: c.email, passwordHash: hash, emailVerified: new Date() });
    createdCompanions.push(u);
    console.log(`   ✅ ${c.name}`);
  }

  // Alias indices
  const me = targetUser;           // 0
  const riya = createdCompanions[0];   // 1
  const arjun = createdCompanions[1];  // 2
  const priya = createdCompanions[2];  // 3
  const karan = createdCompanions[3];  // 4
  const sneha = createdCompanions[4];  // 5

  // ── Create groups ──────────────────────────────────────────────────────────
  console.log('\n👥 Creating groups...');

  const goaTrip = await Group.create({
    name: 'Goa Trip 2025',
    description: '5-day beach trip with the whole squad 🏖️',
    currency: 'INR',
    ownerId: me._id,
    memberIds: [me._id, riya._id, arjun._id, karan._id],
  });

  const flatmates = await Group.create({
    name: 'Flat 4B – Roommates',
    description: 'Monthly shared living expenses',
    currency: 'INR',
    ownerId: me._id,
    memberIds: [me._id, riya._id, priya._id],
  });

  const lunchClub = await Group.create({
    name: 'Office Lunch Club',
    description: 'Weekday lunch orders at work',
    currency: 'INR',
    ownerId: me._id,
    memberIds: [me._id, arjun._id, sneha._id, karan._id],
  });

  const weekenders = await Group.create({
    name: 'Weekend Warriors',
    description: 'Treks, movies, and weekend adventures 🏕️',
    currency: 'INR',
    ownerId: me._id,
    memberIds: [me._id, priya._id, sneha._id],
  });

  const europeTour = await Group.create({
    name: 'Europe Tour – Summer',
    description: 'Paris, Amsterdam, Rome itinerary 🗺️',
    currency: 'EUR',
    ownerId: me._id,
    memberIds: [me._id, riya._id, arjun._id, priya._id, karan._id],
  });

  console.log(`   ✅ ${goaTrip.name}`);
  console.log(`   ✅ ${flatmates.name}`);
  console.log(`   ✅ ${lunchClub.name}`);
  console.log(`   ✅ ${weekenders.name}`);
  console.log(`   ✅ ${europeTour.name}`);

  // ── Expenses helper ────────────────────────────────────────────────────────
  let expenseCount = 0;
  async function addExpense(
    groupId: any,
    memberIds: any[],
    desc: string,
    amount: number,
    category: string,
    payer: any,
    daysAgoN: number,
    splitType: 'equal' | 'custom' = 'equal',
    customSplits?: { userId: any; amount: number }[]
  ) {
    const splits = splitType === 'custom' && customSplits ? customSplits : equalSplits(memberIds, amount);
    const date = daysAgo(daysAgoN);
    await Expense.create({ groupId, description: desc, amount, category, payerId: payer, splits, splitType, createdBy: payer, date });
    expenseCount++;
  }

  // ── Goa Trip expenses (members: me, riya, arjun, karan) ──────────────────
  console.log('\n💸 Creating Goa Trip expenses...');
  const goaM = [me._id, riya._id, arjun._id, karan._id];

  await addExpense(goaTrip._id, goaM, 'Return flights – Indigo', 23600, 'Transport', me._id, 62);
  await addExpense(goaTrip._id, goaM, 'Hotel The Leela – 4 nights', 32000, 'Accommodation', riya._id, 60);
  await addExpense(goaTrip._id, goaM, 'Airport cab (to airport)', 2200, 'Transport', arjun._id, 62);
  await addExpense(goaTrip._id, goaM, 'Airport cab (from airport)', 2400, 'Transport', karan._id, 58);
  await addExpense(goaTrip._id, goaM, 'Scooter rental – 4 days', 3200, 'Transport', me._id, 60);
  await addExpense(goaTrip._id, goaM, 'Baga Beach shack dinner', 4800, 'Food', riya._id, 59);
  await addExpense(goaTrip._id, goaM, 'Breakfast at Brittos', 1800, 'Food', arjun._id, 59);
  await addExpense(goaTrip._id, goaM, 'Parasailing & banana boat', 7200, 'Entertainment', me._id, 58);
  await addExpense(goaTrip._id, goaM, 'Lunch at Fisherman\'s Wharf', 3600, 'Food', karan._id, 58);
  await addExpense(goaTrip._id, goaM, 'Sunset cruise tickets', 5600, 'Entertainment', riya._id, 57);
  await addExpense(goaTrip._id, goaM, 'Grocery run for villa BBQ', 2400, 'Groceries', me._id, 57);
  await addExpense(goaTrip._id, goaM, 'Spice plantation tour', 2000, 'Entertainment', arjun._id, 56);
  await addExpense(goaTrip._id, goaM, 'Beachside cocktails', 3200, 'Entertainment', karan._id, 56);
  await addExpense(goaTrip._id, goaM, 'Souvenirs shopping', 2800, 'Shopping', me._id, 55);
  await addExpense(goaTrip._id, goaM, 'Final dinner – Thai restaurant', 6400, 'Food', riya._id, 55);
  console.log(`   ✅ ${goaTrip.name}: 15 expenses`);

  // ── Flatmates expenses (members: me, riya, priya) ─────────────────────────
  console.log('💸 Creating Flat 4B expenses...');
  const flatM = [me._id, riya._id, priya._id];

  await addExpense(flatmates._id, flatM, 'Electricity bill – January', 3400, 'Utilities', me._id, 90);
  await addExpense(flatmates._id, flatM, 'WiFi – January', 1200, 'Utilities', riya._id, 89);
  await addExpense(flatmates._id, flatM, 'Groceries – Week 1 Jan', 4200, 'Groceries', priya._id, 88);
  await addExpense(flatmates._id, flatM, 'Netflix + Prime bundle', 799, 'Subscriptions', me._id, 85);
  await addExpense(flatmates._id, flatM, 'Water + maintenance', 1600, 'Utilities', riya._id, 80);
  await addExpense(flatmates._id, flatM, 'Groceries – Week 3 Jan', 3800, 'Groceries', me._id, 74);
  await addExpense(flatmates._id, flatM, 'Electricity bill – February', 3100, 'Utilities', priya._id, 60);
  await addExpense(flatmates._id, flatM, 'WiFi – February', 1200, 'Utilities', me._id, 58);
  await addExpense(flatmates._id, flatM, 'House cleaning service', 2000, 'General', riya._id, 55);
  await addExpense(flatmates._id, flatM, 'Groceries – Week 1 Feb', 4600, 'Groceries', priya._id, 53);
  await addExpense(flatmates._id, flatM, 'Gas cylinder refill', 950, 'Utilities', me._id, 50);
  await addExpense(flatmates._id, flatM, 'Spotify family plan', 179, 'Subscriptions', riya._id, 48);
  await addExpense(flatmates._id, flatM, 'Groceries – Week 3 Feb', 3500, 'Groceries', priya._id, 39);
  await addExpense(flatmates._id, flatM, 'Electricity bill – March', 3600, 'Utilities', me._id, 30);
  await addExpense(flatmates._id, flatM, 'WiFi – March', 1200, 'Utilities', priya._id, 28);
  await addExpense(flatmates._id, flatM, 'Groceries – Week 1 Mar', 4900, 'Groceries', riya._id, 25);
  await addExpense(flatmates._id, flatM, 'New vacuum cleaner', 3999, 'General', me._id, 20);
  await addExpense(flatmates._id, flatM, 'Plumber visit', 800, 'General', riya._id, 15);
  await addExpense(flatmates._id, flatM, 'Groceries – Week 3 Mar', 4100, 'Groceries', priya._id, 11);
  await addExpense(flatmates._id, flatM, 'Electricity bill – April', 2900, 'Utilities', me._id, 5);
  await addExpense(flatmates._id, flatM, 'WiFi – April', 1200, 'Utilities', riya._id, 3);
  await addExpense(flatmates._id, flatM, 'Groceries – this week', 4700, 'Groceries', priya._id, 1);
  console.log(`   ✅ ${flatmates.name}: 22 expenses`);

  // ── Office Lunch Club (members: me, arjun, sneha, karan) ──────────────────
  console.log('💸 Creating Office Lunch Club expenses...');
  const lunchM = [me._id, arjun._id, sneha._id, karan._id];

  await addExpense(lunchClub._id, lunchM, 'Biryani Palace – Monday', 1600, 'Food', me._id, 28);
  await addExpense(lunchClub._id, lunchM, 'Pizza Hut delivery', 2400, 'Food', arjun._id, 26);
  await addExpense(lunchClub._id, lunchM, 'Subway sandwiches', 1200, 'Food', sneha._id, 24);
  await addExpense(lunchClub._id, lunchM, 'Starbucks coffee run', 1800, 'Food', karan._id, 22);
  await addExpense(lunchClub._id, lunchM, 'Thai curry buffet', 2800, 'Food', me._id, 20);
  await addExpense(lunchClub._id, lunchM, 'Dominos Friday special', 3200, 'Food', arjun._id, 18);
  await addExpense(lunchClub._id, lunchM, 'South Indian thali', 1000, 'Food', sneha._id, 16);
  await addExpense(lunchClub._id, lunchM, 'Chinese takeaway', 2000, 'Food', karan._id, 14);
  await addExpense(lunchClub._id, lunchM, 'Burger King combo', 1600, 'Food', me._id, 12);
  await addExpense(lunchClub._id, lunchM, 'Team lunch celebration', 5200, 'Food', arjun._id, 10);
  await addExpense(lunchClub._id, lunchM, 'Pav bhaji street lunch', 600, 'Food', sneha._id, 8);
  await addExpense(lunchClub._id, lunchM, 'KFC bucket Friday', 2800, 'Food', karan._id, 6);
  await addExpense(lunchClub._id, lunchM, 'Chaat and snacks', 800, 'Food', me._id, 4);
  await addExpense(lunchClub._id, lunchM, 'Barbeque Nation team dinner', 6400, 'Food', arjun._id, 2);
  await addExpense(lunchClub._id, lunchM, 'Morning chai & samosa', 400, 'Food', sneha._id, 1);
  console.log(`   ✅ ${lunchClub.name}: 15 expenses`);

  // ── Weekend Warriors (members: me, priya, sneha) ──────────────────────────
  console.log('💸 Creating Weekend Warriors expenses...');
  const wwM = [me._id, priya._id, sneha._id];

  await addExpense(weekenders._id, wwM, 'Lonavala trek transport', 2400, 'Transport', me._id, 56);
  await addExpense(weekenders._id, wwM, 'Camping gear rental', 1800, 'Entertainment', priya._id, 55);
  await addExpense(weekenders._id, wwM, 'Food & supplies for camp', 1600, 'Groceries', sneha._id, 55);
  await addExpense(weekenders._id, wwM, 'INOX movie tickets', 1350, 'Entertainment', me._id, 42);
  await addExpense(weekenders._id, wwM, 'Popcorn and drinks', 600, 'Food', priya._id, 42);
  await addExpense(weekenders._id, wwM, 'Mumbai pub night', 3600, 'Entertainment', sneha._id, 35);
  await addExpense(weekenders._id, wwM, 'Imagica theme park tickets', 4800, 'Entertainment', me._id, 28);
  await addExpense(weekenders._id, wwM, 'Imagica food & snacks', 1400, 'Food', priya._id, 28);
  await addExpense(weekenders._id, wwM, 'Karjat river rafting', 3000, 'Entertainment', sneha._id, 21);
  await addExpense(weekenders._id, wwM, 'Post-trek biryani lunch', 900, 'Food', me._id, 21);
  await addExpense(weekenders._id, wwM, 'Bowling night', 1500, 'Entertainment', priya._id, 14);
  await addExpense(weekenders._id, wwM, 'Art exhibition tickets', 900, 'Entertainment', sneha._id, 7);
  await addExpense(weekenders._id, wwM, 'Café brunch this Sunday', 2100, 'Food', me._id, 2);
  console.log(`   ✅ ${weekenders.name}: 13 expenses`);

  // ── Europe Tour (members: me, riya, arjun, priya, karan) – EUR ─────────────
  console.log('💸 Creating Europe Tour expenses...');
  const euroM = [me._id, riya._id, arjun._id, priya._id, karan._id];

  await addExpense(europeTour._id, euroM, 'Return flights – Air France', 580, 'Transport', me._id, 14);
  await addExpense(europeTour._id, euroM, 'Travel insurance (group)', 120, 'General', riya._id, 14);
  await addExpense(europeTour._id, euroM, 'Paris Airbnb – 3 nights', 450, 'Accommodation', arjun._id, 12);
  await addExpense(europeTour._id, euroM, 'Eiffel Tower tickets', 95, 'Entertainment', priya._id, 11);
  await addExpense(europeTour._id, euroM, 'Paris metro passes', 75, 'Transport', karan._id, 11);
  await addExpense(europeTour._id, euroM, 'Dinner at Le Comptoir', 180, 'Food', me._id, 10);
  await addExpense(europeTour._id, euroM, 'Amsterdam hostel – 2 nights', 280, 'Accommodation', riya._id, 9);
  await addExpense(europeTour._id, euroM, 'Canal boat tour', 85, 'Entertainment', arjun._id, 8);
  await addExpense(europeTour._id, euroM, 'Van Gogh Museum', 100, 'Entertainment', priya._id, 8);
  await addExpense(europeTour._id, euroM, 'Supermarket groceries', 65, 'Groceries', karan._id, 7);
  await addExpense(europeTour._id, euroM, 'Train Paris→Amsterdam', 165, 'Transport', me._id, 9);
  await addExpense(europeTour._id, euroM, 'Train Amsterdam→Rome', 210, 'Transport', riya._id, 6);
  await addExpense(europeTour._id, euroM, 'Rome B&B – 3 nights', 390, 'Accommodation', arjun._id, 5);
  await addExpense(europeTour._id, euroM, 'Colosseum + Vatican tour', 140, 'Entertainment', priya._id, 4);
  await addExpense(europeTour._id, euroM, 'Trattoria dinner Rome', 145, 'Food', karan._id, 3);
  await addExpense(europeTour._id, euroM, 'Gelato & street food', 40, 'Food', me._id, 2);
  await addExpense(europeTour._id, euroM, 'Taxi to Rome airport', 55, 'Transport', riya._id, 1);
  console.log(`   ✅ ${europeTour.name}: 17 expenses`);

  // ── Settlements ────────────────────────────────────────────────────────────
  console.log('\n🤝 Creating settlements...');

  // Goa Trip: Riya owes me, Arjun owes me, Karan owes Riya (confirmed history)
  await Settlement.create({ groupId: goaTrip._id, fromUserId: riya._id, toUserId: me._id, amount: 4200, status: 'confirmed', confirmedAt: daysAgo(50), note: 'Goa partial settle', createdAt: daysAgo(52) });
  await Settlement.create({ groupId: goaTrip._id, fromUserId: arjun._id, toUserId: me._id, amount: 3800, status: 'confirmed', confirmedAt: daysAgo(48), note: 'Flight share', createdAt: daysAgo(50) });
  await Settlement.create({ groupId: goaTrip._id, fromUserId: karan._id, toUserId: riya._id, amount: 2600, status: 'confirmed', confirmedAt: daysAgo(45), createdAt: daysAgo(47) });

  // Flatmates: ongoing pending settlements
  await Settlement.create({ groupId: flatmates._id, fromUserId: riya._id, toUserId: me._id, amount: 7200, status: 'pending', note: 'Jan–Feb catch-up', createdAt: daysAgo(10) });
  await Settlement.create({ groupId: flatmates._id, fromUserId: priya._id, toUserId: me._id, amount: 3400, status: 'pending', createdAt: daysAgo(5) });

  // Office lunch: settled last month
  await Settlement.create({ groupId: lunchClub._id, fromUserId: karan._id, toUserId: arjun._id, amount: 1200, status: 'confirmed', confirmedAt: daysAgo(15), createdAt: daysAgo(16) });
  await Settlement.create({ groupId: lunchClub._id, fromUserId: sneha._id, toUserId: me._id, amount: 950, status: 'pending', createdAt: daysAgo(3) });

  // Weekend warriors: pending
  await Settlement.create({ groupId: weekenders._id, fromUserId: priya._id, toUserId: sneha._id, amount: 1100, status: 'pending', createdAt: daysAgo(7) });

  // Europe: pending (recent trip)
  await Settlement.create({ groupId: europeTour._id, fromUserId: arjun._id, toUserId: me._id, amount: 145, status: 'pending', note: 'Flights share EUR', createdAt: daysAgo(2) });
  await Settlement.create({ groupId: europeTour._id, fromUserId: karan._id, toUserId: riya._id, amount: 118, status: 'pending', createdAt: daysAgo(1) });

  console.log('   ✅ 10 settlements (6 pending, 4 confirmed)');

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(55));
  console.log('🎉 Seed complete!\n');
  console.log(`   Target user:  ${TARGET_EMAIL}`);
  console.log(`   Companions:   ${companions.length}`);
  console.log(`   Groups:       5`);
  console.log(`   Expenses:     ${expenseCount}`);
  console.log(`   Settlements:  10 (6 pending, 4 confirmed)`);
  console.log(`   Budget set:   ₹25,000 / month`);
  console.log('\n' + '═'.repeat(55));
  console.log('\nGroups created:');
  console.log('  • Goa Trip 2025          (INR, 4 members, 15 expenses)');
  console.log('  • Flat 4B – Roommates    (INR, 3 members, 22 expenses)');
  console.log('  • Office Lunch Club      (INR, 4 members, 15 expenses)');
  console.log('  • Weekend Warriors       (INR, 3 members, 13 expenses)');
  console.log('  • Europe Tour – Summer   (EUR, 5 members, 17 expenses)');
  console.log('');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
