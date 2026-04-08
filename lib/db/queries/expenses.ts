import 'server-only';

import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db/connection';
import { Expense, IExpense } from '@/lib/models/Expense';
import { Group } from '@/lib/models/Group';

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export interface SplitDTO {
  userId: string;
  amount: number;
}

export interface ExpenseDTO {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  category: string;
  payerId: string;
  splits: SplitDTO[];
  createdBy: string;
  date: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  groupId: string;
  description: string;
  amount: number;
  category?: string;
  payerId: string;
  splits: SplitDTO[];
  date?: Date;
  receiptUrl?: string;
}

export interface UpdateExpenseInput {
  description?: string;
  amount?: number;
  category?: string;
  payerId?: string;
  splits?: SplitDTO[];
  date?: Date;
  receiptUrl?: string;
}

export interface GetExpensesOptions {
  page?: number;
  limit?: number;
  category?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toExpenseDTO(doc: Record<string, unknown>): ExpenseDTO {
  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    groupId: (doc.groupId as mongoose.Types.ObjectId).toString(),
    description: doc.description as string,
    amount: doc.amount as number,
    category: doc.category as string,
    payerId: (doc.payerId as mongoose.Types.ObjectId).toString(),
    splits: (doc.splits as { userId: mongoose.Types.ObjectId; amount: number }[]).map(
      (s) => ({ userId: s.userId.toString(), amount: s.amount })
    ),
    createdBy: (doc.createdBy as mongoose.Types.ObjectId).toString(),
    date: (doc.date as Date).toISOString(),
    receiptUrl: doc.receiptUrl as string | undefined,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  };
}

/**
 * Verify user is a member of the group. Returns the memberIds array if they are, throws otherwise.
 */
async function assertGroupMember(
  groupId: string,
  userId: string
): Promise<string[]> {
  const group = await Group.findOne({
    _id: groupId,
    memberIds: new mongoose.Types.ObjectId(userId),
  })
    .select('memberIds')
    .lean();

  if (!group) {
    throw new Error('Forbidden: not a member of this group');
  }

  return (group.memberIds as mongoose.Types.ObjectId[]).map((id) => id.toString());
}

// ---------------------------------------------------------------------------
// AGENT_TASK_402: Expense queries — all user-scoped
// ---------------------------------------------------------------------------

/**
 * Get all expenses for a group the user belongs to, with optional pagination.
 */
export async function getExpensesByGroup(
  groupId: string,
  userId: string,
  options: GetExpensesOptions = {}
): Promise<{ expenses: ExpenseDTO[]; total: number; page: number; limit: number }> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new Error('Invalid group ID');
  }

  // Enforce membership
  await assertGroupMember(groupId, userId);

  const { page = 1, limit = 20, category } = options;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { groupId: new mongoose.Types.ObjectId(groupId) };
  if (category) query.category = category;

  const [expenses, total] = await Promise.all([
    Expense.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean(),
    Expense.countDocuments(query),
  ]);

  return {
    expenses: expenses.map((e) =>
      toExpenseDTO(e as unknown as Record<string, unknown>)
    ),
    total,
    page,
    limit,
  };
}

/**
 * Get a single expense by ID, verifying the user is a member of the associated group.
 */
export async function getExpenseById(
  expenseId: string,
  userId: string
): Promise<ExpenseDTO | null> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(expenseId)) return null;

  const expense = await Expense.findById(expenseId).lean();
  if (!expense) return null;

  // Verify membership on the expense's group
  const group = await Group.findOne({
    _id: expense.groupId,
    memberIds: new mongoose.Types.ObjectId(userId),
  })
    .select('_id')
    .lean();

  if (!group) return null; // user is not in this group

  return toExpenseDTO(expense as unknown as Record<string, unknown>);
}

/**
 * Create an expense.
 * Validates: user is group member, payer is member, all split users are members,
 * splits sum equals the total amount.
 */
export async function createExpense(
  data: CreateExpenseInput,
  userId: string
): Promise<ExpenseDTO> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(data.groupId)) {
    throw new Error('Invalid group ID');
  }

  const memberIds = await assertGroupMember(data.groupId, userId);

  // Validate payer is in group
  if (!memberIds.includes(data.payerId)) {
    throw new Error('Payer is not a member of this group');
  }

  // Validate all split users are in group
  for (const split of data.splits) {
    if (!memberIds.includes(split.userId)) {
      throw new Error(`Split user ${split.userId} is not a member of this group`);
    }
  }

  // Validate splits sum
  const splitTotal = data.splits.reduce((sum, s) => sum + s.amount, 0);
  if (Math.abs(splitTotal - data.amount) > 0.01) {
    throw new Error(
      `Split amounts (${splitTotal.toFixed(2)}) must equal the expense amount (${data.amount.toFixed(2)})`
    );
  }

  const expense = await Expense.create({
    groupId: new mongoose.Types.ObjectId(data.groupId),
    description: data.description,
    amount: data.amount,
    category: data.category ?? 'General',
    payerId: new mongoose.Types.ObjectId(data.payerId),
    splits: data.splits.map((s) => ({
      userId: new mongoose.Types.ObjectId(s.userId),
      amount: s.amount,
    })),
    createdBy: new mongoose.Types.ObjectId(userId),
    date: data.date ?? new Date(),
    receiptUrl: data.receiptUrl,
  });

  return toExpenseDTO(expense.toObject() as unknown as Record<string, unknown>);
}

/**
 * Update an expense.
 * Only the creator or the group owner may edit.
 * If amount or splits change, re-validates the split sum constraint.
 */
export async function updateExpense(
  expenseId: string,
  data: UpdateExpenseInput,
  userId: string
): Promise<ExpenseDTO | null> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(expenseId)) return null;

  const expense = await Expense.findById(expenseId);
  if (!expense) return null;

  // Verify user is in the group
  const group = await Group.findOne({
    _id: expense.groupId,
    memberIds: new mongoose.Types.ObjectId(userId),
  })
    .select('ownerId memberIds')
    .lean();

  if (!group) return null;

  const isCreator = expense.createdBy.toString() === userId;
  const isOwner = (group.ownerId as mongoose.Types.ObjectId).toString() === userId;

  if (!isCreator && !isOwner) {
    throw new Error('Forbidden: only the creator or group owner can edit this expense');
  }

  // If updating splits, validate amounts
  const newAmount = data.amount ?? expense.amount;
  const newSplits = data.splits ?? expense.splits.map((s) => ({
    userId: s.userId.toString(),
    amount: s.amount,
  }));

  const splitTotal = newSplits.reduce((sum, s) => sum + s.amount, 0);
  if (Math.abs(splitTotal - newAmount) > 0.01) {
    throw new Error(
      `Split amounts (${splitTotal.toFixed(2)}) must equal the expense amount (${newAmount.toFixed(2)})`
    );
  }

  // If payer changed, validate payer is in group
  if (data.payerId) {
    const memberIds = (group.memberIds as mongoose.Types.ObjectId[]).map((id) => id.toString());
    if (!memberIds.includes(data.payerId)) {
      throw new Error('Payer is not a member of this group');
    }
  }

  Object.assign(expense, {
    ...(data.description !== undefined && { description: data.description }),
    ...(data.amount !== undefined && { amount: data.amount }),
    ...(data.category !== undefined && { category: data.category }),
    ...(data.payerId !== undefined && { payerId: new mongoose.Types.ObjectId(data.payerId) }),
    ...(data.splits !== undefined && {
      splits: data.splits.map((s) => ({
        userId: new mongoose.Types.ObjectId(s.userId),
        amount: s.amount,
      })),
    }),
    ...(data.date !== undefined && { date: data.date }),
    ...(data.receiptUrl !== undefined && { receiptUrl: data.receiptUrl }),
  });

  await expense.save();
  return toExpenseDTO(expense.toObject() as unknown as Record<string, unknown>);
}

/**
 * Delete an expense.
 * Only the creator or the group owner may delete.
 */
export async function deleteExpense(
  expenseId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(expenseId)) {
    return { success: false, error: 'Invalid expense ID' };
  }

  const expense = await Expense.findById(expenseId);
  if (!expense) return { success: false, error: 'Expense not found' };

  const group = await Group.findOne({
    _id: expense.groupId,
    memberIds: new mongoose.Types.ObjectId(userId),
  })
    .select('ownerId')
    .lean();

  if (!group) return { success: false, error: 'Forbidden' };

  const isCreator = expense.createdBy.toString() === userId;
  const isOwner = (group.ownerId as mongoose.Types.ObjectId).toString() === userId;

  if (!isCreator && !isOwner) {
    return { success: false, error: 'Only the creator or group owner can delete this expense' };
  }

  await expense.deleteOne();
  return { success: true };
}
