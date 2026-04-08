import 'server-only';

import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db/connection';
import { Group, IGroup } from '@/lib/models/Group';
import { User } from '@/lib/models/User';
import { Expense } from '@/lib/models/Expense';

// ---------------------------------------------------------------------------
// DTOs — lean, safe shapes returned to callers (no Mongoose internals)
// ---------------------------------------------------------------------------

export interface GroupMemberDTO {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface GroupDTO {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  members?: GroupMemberDTO[];
  currency: string;
  createdAt: string;
  updatedAt: string;
  isPersonal?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toGroupDTO(doc: Record<string, unknown>): GroupDTO {
  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    name: doc.name as string,
    description: doc.description as string | undefined,
    ownerId: (doc.ownerId as mongoose.Types.ObjectId).toString(),
    memberIds: (doc.memberIds as mongoose.Types.ObjectId[]).map((id) =>
      id.toString()
    ),
    currency: doc.currency as string,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
    isPersonal: doc.isPersonal as boolean | undefined,
  };
}

// ---------------------------------------------------------------------------
// AGENT_TASK_401: Group queries — all user-scoped
// ---------------------------------------------------------------------------

/**
 * Get all groups where the given user is a member.
 */
export async function getGroupsByUser(userId: string): Promise<GroupDTO[]> {
  await connectToDatabase();
  const objectId = new mongoose.Types.ObjectId(userId);

  const groups = await Group.find({ memberIds: objectId, isPersonal: { $ne: true } })
    .sort({ updatedAt: -1 })
    .lean();

  return groups.map((g) => toGroupDTO(g as unknown as Record<string, unknown>));
}

/**
 * Get a single group by ID, verifying the requesting user is a member (IDOR protection).
 * Returns null if the group doesn't exist or the user is not a member.
 */
export async function getGroupById(
  groupId: string,
  userId: string
): Promise<GroupDTO | null> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(groupId)) return null;

  const group = await Group.findOne({
    _id: groupId,
    memberIds: new mongoose.Types.ObjectId(userId),
  }).lean();

  if (!group) return null;
  return toGroupDTO(group as unknown as Record<string, unknown>);
}

/**
 * Get a group with its member details populated.
 */
export async function getGroupWithMembers(
  groupId: string,
  userId: string
): Promise<(GroupDTO & { members: GroupMemberDTO[] }) | null> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(groupId)) return null;

  const group = await Group.findOne({
    _id: groupId,
    memberIds: new mongoose.Types.ObjectId(userId),
  })
    .populate<{ memberIds: { _id: mongoose.Types.ObjectId; name: string; email: string; avatar?: string }[] }>(
      'memberIds',
      'name email avatar'
    )
    .lean();

  if (!group) return null;

  const dto = toGroupDTO({
    ...(group as unknown as Record<string, unknown>),
    memberIds: (
      group.memberIds as unknown as { _id: mongoose.Types.ObjectId }[]
    ).map((m) => m._id),
  });

  const members: GroupMemberDTO[] = (
    group.memberIds as unknown as {
      _id: mongoose.Types.ObjectId;
      name: string;
      email: string;
      avatar?: string;
    }[]
  ).map((m) => ({
    id: m._id.toString(),
    name: m.name,
    email: m.email,
    avatar: m.avatar,
  }));

  return { ...dto, members };
}

/**
 * Create a new group. The creator is automatically set as owner and first member.
 */
export async function createGroup(
  data: { name: string; description?: string; currency?: string },
  userId: string
): Promise<GroupDTO> {
  await connectToDatabase();

  const ownerObjectId = new mongoose.Types.ObjectId(userId);

  const group = await Group.create({
    name: data.name.trim(),
    description: data.description?.trim(),
    currency: data.currency ?? 'USD',
    ownerId: ownerObjectId,
    memberIds: [ownerObjectId],
  });

  return toGroupDTO(group.toObject() as unknown as Record<string, unknown>);
}

/**
 * Add a member to a group by email.
 * Only the group owner can add members.
 * Returns null if the group not found, requester is not owner, or user email not found.
 */
export async function addMemberToGroup(
  groupId: string,
  inviteeEmail: string,
  requesterId: string
): Promise<{ success: boolean; error?: string }> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return { success: false, error: 'Invalid group ID' };
  }

  const group = await Group.findById(groupId);
  if (!group) return { success: false, error: 'Group not found' };

  if (group.ownerId.toString() !== requesterId) {
    return { success: false, error: 'Only the group owner can add members' };
  }

  const invitee = await User.findOne({
    email: inviteeEmail.toLowerCase().trim(),
  }).lean();
  if (!invitee) return { success: false, error: 'No user found with that email' };

  const inviteeId = (invitee._id as mongoose.Types.ObjectId).toString();
  const alreadyMember = group.memberIds.some((id) => id.toString() === inviteeId);
  if (alreadyMember) return { success: false, error: 'User is already a member' };

  if (group.memberIds.length >= 50) {
    return { success: false, error: 'Group is at the maximum member limit (50)' };
  }

  group.memberIds.push(invitee._id as mongoose.Types.ObjectId);
  await group.save();

  return { success: true };
}

/**
 * Remove a member from a group.
 * Only the group owner can remove members.
 * The owner cannot remove themselves.
 */
export async function removeMemberFromGroup(
  groupId: string,
  targetUserId: string,
  requesterId: string
): Promise<{ success: boolean; error?: string }> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return { success: false, error: 'Invalid group ID' };
  }

  const group = await Group.findById(groupId);
  if (!group) return { success: false, error: 'Group not found' };

  if (group.ownerId.toString() !== requesterId) {
    return { success: false, error: 'Only the group owner can remove members' };
  }

  if (targetUserId === requesterId) {
    return { success: false, error: 'Owner cannot remove themselves from the group' };
  }

  const memberIndex = group.memberIds.findIndex(
    (id) => id.toString() === targetUserId
  );
  if (memberIndex === -1) {
    return { success: false, error: 'User is not a member of this group' };
  }

  group.memberIds.splice(memberIndex, 1);
  await group.save();

  return { success: true };
}

/**
 * Delete a group and all its associated expenses.
 * Only the group owner can delete the group.
 */
export async function deleteGroup(
  groupId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return { success: false, error: 'Invalid group ID' };
  }

  const group = await Group.findById(groupId);
  if (!group) return { success: false, error: 'Group not found' };

  if (group.ownerId.toString() !== userId) {
    return { success: false, error: 'Only the group owner can delete the group' };
  }

  // Cascade: delete all expenses belonging to this group
  await Expense.deleteMany({ groupId: group._id });
  await group.deleteOne();

  return { success: true };
}

/**
 * Get or create the user's personal virtual group.
 */
export async function getOrCreatePersonalGroup(userId: string): Promise<GroupDTO> {
  await connectToDatabase();
  const ownerObjectId = new mongoose.Types.ObjectId(userId);

  let group = await Group.findOne({
    ownerId: ownerObjectId,
    isPersonal: true
  });

  if (!group) {
    group = await Group.create({
      name: 'Personal',
      description: 'Private personal expenses',
      currency: 'USD',
      ownerId: ownerObjectId,
      memberIds: [ownerObjectId],
      isPersonal: true,
    });
  }

  return toGroupDTO((group.toObject ? group.toObject() : group) as unknown as Record<string, unknown>);
}
