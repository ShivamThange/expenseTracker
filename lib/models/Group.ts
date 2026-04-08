import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  currency: string;
  isPersonal?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema: Schema<IGroup> = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    memberIds: [
      { type: Schema.Types.ObjectId, ref: 'User', required: true }
    ],
    currency: { type: String, default: 'USD', uppercase: true, trim: true, maxlength: 3 },
    isPersonal: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

GroupSchema.index({ ownerId: 1 });
GroupSchema.index({ memberIds: 1 });

// Validations
GroupSchema.path('memberIds').validate(function (value: mongoose.Types.ObjectId[]) {
  return value.length >= 1 && value.length <= 50;
}, 'Group must have between 1 and 50 members');

GroupSchema.pre('save', function () {
  // Ensure the owner is part of the members list
  if (this.isModified('ownerId') || this.isModified('memberIds')) {
    const ownerIdStr = this.ownerId.toString();
    const isOwnerInMembers = this.memberIds.some(
      (id) => id.toString() === ownerIdStr
    );

    if (!isOwnerInMembers) {
      this.memberIds.push(this.ownerId);
    }
  }
});

export const Group: Model<IGroup> = mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);
