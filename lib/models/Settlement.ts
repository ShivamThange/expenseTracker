import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettlement extends Document {
  groupId: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  amount: number;
  status: 'pending' | 'confirmed';
  confirmedAt?: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettlementSchema: Schema<ISettlement> = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    status: { type: String, enum: ['pending', 'confirmed'], default: 'pending' },
    confirmedAt: { type: Date },
    note: { type: String, trim: true, maxlength: 200 },
  },
  {
    timestamps: true,
  }
);

SettlementSchema.index({ groupId: 1, status: 1 });
SettlementSchema.index({ fromUserId: 1 });
SettlementSchema.index({ toUserId: 1 });

export const Settlement: Model<ISettlement> = mongoose.models.Settlement || mongoose.model<ISettlement>('Settlement', SettlementSchema);
