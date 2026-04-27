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

ExpenseSchema.index({ groupId: 1, date: -1 });
ExpenseSchema.index({ createdAt: -1 });
ExpenseSchema.index({ payerId: 1 });

export const Expense: Model<IExpense> = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
