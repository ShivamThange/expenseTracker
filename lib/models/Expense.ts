import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISplit {
  userId: mongoose.Types.ObjectId;
  amount: number;
}

export interface IExpense extends Document {
  groupId: mongoose.Types.ObjectId;
  description: string;
  amount: number;
  category: string;
  payerId: mongoose.Types.ObjectId;
  splits: ISplit[];
  splitType?: 'equal' | 'custom' | 'full';
  createdBy: mongoose.Types.ObjectId;
  date: Date;
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SplitSchema = new Schema<ISplit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ExpenseSchema: Schema<IExpense> = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, required: true, default: 'General' },
    payerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    splits: { type: [SplitSchema], required: true },
    splitType: { type: String, enum: ['equal', 'custom', 'full'], default: 'equal' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    receiptUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

ExpenseSchema.index({ groupId: 1, date: -1 }); // Compound index
ExpenseSchema.index({ createdAt: -1 });
ExpenseSchema.index({ payerId: 1 });

// Validations
ExpenseSchema.pre('save', async function () {
  // Check if splits match total amount (allowing for small floating point differences)
  const totalSplit = this.splits.reduce((acc, split) => acc + split.amount, 0);
  
  if (Math.abs(totalSplit - this.amount) > 0.01) {
    throw new Error(`Total splits (${totalSplit}) must equal the expense amount (${this.amount})`);
  }

  // Verify users are in group
  const Group = mongoose.models.Group || mongoose.model('Group');
  if (Group) {
    const group = await Group.findById(this.groupId).lean();
    if (!group) {
        throw new Error('Group not found');
    }
    const memberIds = (group as any).memberIds.map((id: any) => id.toString());
    const validPayer = memberIds.includes(this.payerId.toString());
    if (!validPayer) {
        throw new Error('Payer is not a member of the group');
    }
    
    for (const split of this.splits) {
        if (!memberIds.includes(split.userId.toString())) {
            throw new Error(`Split user ${split.userId} is not a member of the group`);
        }
    }
  }
});

export const Expense: Model<IExpense> = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
