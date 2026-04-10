import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  emailVerified: Date | null;
  avatar?: string;
  monthlyBudget?: number;
  verifyEmailToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateVerificationToken(): string;
  generateResetToken(): string;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    emailVerified: { type: Date, default: null },
    avatar: { type: String },
    monthlyBudget: { type: Number, default: 0, min: 0 },
    verifyEmailToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ createdAt: 1 });

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

UserSchema.methods.generateVerificationToken = function (): string {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.verifyEmailToken = crypto.createHash('sha256').update(token).digest('hex');
  return token; // Send raw token to user, store hashed token
};

UserSchema.methods.generateResetToken = function (): string {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  this.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return token; // Return unhashed token to send via email
};

// Check if mongoose model is already compiled to avoid error in hot reload
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
