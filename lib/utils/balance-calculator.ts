/**
 * Balance Calculator — Pure, side-effect-free debt settlement engine.
 *
 * This module is intentionally NOT marked `server-only` so it can be used in
 * both server-side DAL code and client-side components if needed (e.g., for
 * optimistic UI calculations). No DB calls are ever made here.
 */

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface ExpenseSplit {
  userId: string;
  amount: number;
}

export interface ExpenseRecord {
  payerId: string;
  amount: number;
  splits: ExpenseSplit[];
}

/**
 * Net balance for a single member.
 *  positive → they are owed money (creditor)
 *  negative → they owe money (debtor)
 */
export interface MemberBalance {
  userId: string;
  balance: number;
}

/**
 * A single recommended settlement transaction.
 */
export interface Settlement {
  /** The person who owes money */
  from: string;
  /** The person who is owed money */
  to: string;
  /** How much `from` should pay `to` */
  amount: number;
}

export interface BalanceResult {
  /**
   * Map of userId → net balance.
   * Positive = owed to this person; negative = this person owes others.
   */
  balances: Map<string, number>;
  /**
   * Minimum-transaction settlement plan using the greedy algorithm.
   */
  settlements: Settlement[];
}

// ---------------------------------------------------------------------------
// Core algorithm
// ---------------------------------------------------------------------------

/**
 * Calculate balances and the optimal settlement plan for a list of expenses.
 *
 * Algorithm:
 *   1. Accumulate net balance per user:
 *      - Payer receives +amount (they paid on behalf of the group)
 *      - Each split user receives -splitAmount (they consumed that value)
 *   2. Split users into creditors (balance > 0) and debtors (balance < 0).
 *   3. Greedy two-pointer settlement: always pair the largest creditor with
 *      the largest debtor, settling as much as possible in one transaction.
 *      This minimises the number of transactions.
 */
export function calculateBalances(expenses: ExpenseRecord[]): BalanceResult {
  const balances = new Map<string, number>();

  const adjust = (userId: string, delta: number) => {
    balances.set(userId, (balances.get(userId) ?? 0) + delta);
  };

  for (const expense of expenses) {
    // Payer fronted the full amount → credited
    adjust(expense.payerId, expense.amount);

    // Each person in the split owes their share → debited
    for (const split of expense.splits) {
      adjust(split.userId, -split.amount);
    }
  }

  const settlements = settleDebts(balances);

  return { balances, settlements };
}

/**
 * Given a balance map, return a minimum-set list of settlement transactions
 * using the greedy approach.
 */
function settleDebts(balances: Map<string, number>): Settlement[] {
  const EPSILON = 0.005; // ignore balances below half a cent
  const settlements: Settlement[] = [];

  // Separate into creditors and debtors, ignoring near-zero balances
  const creditors: { userId: string; amount: number }[] = [];
  const debtors: { userId: string; amount: number }[] = [];

  for (const [userId, balance] of balances.entries()) {
    if (balance > EPSILON) {
      creditors.push({ userId, amount: balance });
    } else if (balance < -EPSILON) {
      debtors.push({ userId, amount: -balance }); // store as positive
    }
  }

  // Sort descending by amount for greedy pairing
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  let ci = 0; // creditor pointer
  let di = 0; // debtor pointer

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    const settled = Math.min(creditor.amount, debtor.amount);
    const roundedAmount = Math.round(settled * 100) / 100; // round to cents

    if (roundedAmount > EPSILON) {
      settlements.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: roundedAmount,
      });
    }

    creditor.amount -= settled;
    debtor.amount -= settled;

    // Advance pointers when a party's balance is fully resolved
    if (creditor.amount < EPSILON) ci++;
    if (debtor.amount < EPSILON) di++;
  }

  return settlements;
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/**
 * Get the net balance for a specific user across a list of expenses.
 * Positive = owed money; negative = owes money.
 */
export function getUserBalance(
  userId: string,
  expenses: ExpenseRecord[]
): number {
  let balance = 0;

  for (const expense of expenses) {
    if (expense.payerId === userId) {
      balance += expense.amount;
    }
    for (const split of expense.splits) {
      if (split.userId === userId) {
        balance -= split.amount;
      }
    }
  }

  return Math.round(balance * 100) / 100;
}

/**
 * Get only the settlements that involve a specific user (either as payer or receiver).
 */
export function getSettlementsForUser(
  userId: string,
  settlements: Settlement[]
): Settlement[] {
  return settlements.filter((s) => s.from === userId || s.to === userId);
}

/**
 * Summarise each member's balance relative to the current user.
 * Returns a list of { userId, owes } where:
 *  - owes > 0  → this member owes the current user that amount
 *  - owes < 0  → the current user owes this member that amount
 */
export function getBalanceSummary(
  currentUserId: string,
  settlements: Settlement[]
): { userId: string; owes: number }[] {
  const summaryMap = new Map<string, number>();

  for (const s of settlements) {
    if (s.from === currentUserId) {
      // Current user owes `to`
      summaryMap.set(s.to, (summaryMap.get(s.to) ?? 0) - s.amount);
    } else if (s.to === currentUserId) {
      // `from` owes current user
      summaryMap.set(s.from, (summaryMap.get(s.from) ?? 0) + s.amount);
    }
  }

  return Array.from(summaryMap.entries())
    .map(([userId, owes]) => ({ userId, owes: Math.round(owes * 100) / 100 }))
    .filter((entry) => Math.abs(entry.owes) > 0.005);
}
