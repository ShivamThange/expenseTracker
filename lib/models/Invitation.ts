import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface IInvitation extends Document {
  groupId: mongoose.Types.ObjectId;
  inviterUserId: mongoose.Types.ObjectId;
  inviteeEmail: string;
  status: InvitationStatus;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  generateToken(): string;
  isExpired(): boolean;
}

const InvitationSchema: Schema<IInvitation> = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    inviterUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    inviteeEmail: { type: String, required: true, lowercase: true, trim: true },
    status: { 
      type: String, 
      required: true, 
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending'
    },
    token: { type: String, unique: true, sparse: true },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

InvitationSchema.index({ token: 1 });
// Users can only have one pending invitation per group
InvitationSchema.index({ inviteeEmail: 1, groupId: 1 }, { unique: true });

InvitationSchema.methods.generateToken = function (): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.token = crypto.createHash('sha256').update(rawToken).digest('hex');
  // Token expires in 7 days
  this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return rawToken; // return raw token back so it can be sent in email
};

InvitationSchema.methods.isExpired = function (): boolean {
  return Date.now() > this.expiresAt.getTime();
};

export const Invitation: Model<IInvitation> = mongoose.models.Invitation || mongoose.model<IInvitation>('Invitation', InvitationSchema);
