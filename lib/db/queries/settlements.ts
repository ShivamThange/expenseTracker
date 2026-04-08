import 'server-only';

import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db/connection';
import { Settlement } from '@/lib/models/Settlement';
import { Group } from '@/lib/models/Group';

export interface SettlementDTO {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  status: 'pending' | 'confirmed';
  confirmedAt?: string;
  note?: string;
  createdAt: string;
}

function toSettlementDTO(doc: Record<string, unknown>): SettlementDTO {
  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    groupId: (doc.groupId as mongoose.Types.ObjectId).toString(),
    fromUserId: (doc.fromUserId as mongoose.Types.ObjectId).toString(),
    toUserId: (doc.toUserId as mongoose.Types.ObjectId).toString(),
    amount: doc.amount as number,
    status: doc.status as 'pending' | 'confirmed',
    confirmedAt: doc.confirmedAt ? (doc.confirmedAt as Date).toISOString() : undefined,
    note: doc.note as string | undefined,
    createdAt: (doc.createdAt as Date).toISOString(),
  };
}

export async function getSettlementsByGroup(
  groupId: string,
  userId: string
): Promise<SettlementDTO[]> {
  await connectToDatabase();
  
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new Error('Invalid group ID');
  }

  // Verify membership
  const group = await Group.findOne({
    _id: groupId,
    memberIds: new mongoose.Types.ObjectId(userId),
  }).select('_id').lean();

  if (!group) {
    throw new Error('Forbidden: not a member of this group');
  }

  const settlements = await Settlement.find({ groupId: new mongoose.Types.ObjectId(groupId) })
    .sort({ createdAt: -1 })
    .lean();

  return settlements.map(s => toSettlementDTO(s as unknown as Record<string, unknown>));
}

export async function createSettlement(
  groupId: string,
  fromUserId: string,
  toUserId: string,
  amount: number,
  note?: string
): Promise<SettlementDTO> {
  await connectToDatabase();

  const group = await Group.findOne({
    _id: groupId,
    memberIds: { $all: [new mongoose.Types.ObjectId(fromUserId), new mongoose.Types.ObjectId(toUserId)] }
  }).lean();

  if (!group) {
    throw new Error('Both users must be members of the group to create a settlement');
  }

  const settlement = await Settlement.create({
    groupId: new mongoose.Types.ObjectId(groupId),
    fromUserId: new mongoose.Types.ObjectId(fromUserId),
    toUserId: new mongoose.Types.ObjectId(toUserId),
    amount,
    note,
  });

  return toSettlementDTO(settlement.toObject() as unknown as Record<string, unknown>);
}

export async function confirmSettlement(
  settlementId: string,
  userId: string
): Promise<SettlementDTO> {
  await connectToDatabase();

  const settlement = await Settlement.findById(settlementId);
  
  if (!settlement) {
    throw new Error('Settlement not found');
  }

  // Only the receiver can confirm
  if (settlement.toUserId.toString() !== userId) {
    throw new Error('Forbidden: only the receiver can confirm a settlement');
  }

  if (settlement.status === 'confirmed') {
    return toSettlementDTO(settlement.toObject() as unknown as Record<string, unknown>); // already confirmed
  }

  settlement.status = 'confirmed';
  settlement.confirmedAt = new Date();
  await settlement.save();

  return toSettlementDTO(settlement.toObject() as unknown as Record<string, unknown>);
}
