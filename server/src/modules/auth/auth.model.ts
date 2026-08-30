import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  profileImage?: string;
  phone?: string;
  pushToken?: string;
  refreshToken?: string;
  emailVerified: boolean;
  isAdmin: boolean;
  emailVerificationCodeHash?: string;
  emailVerificationExpiresAt?: Date;
  passwordResetCodeHash?: string;
  passwordResetExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never returned in queries by default
    },
    profileImage: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 24,
      default: null,
    },
    pushToken: {
      type: String,
      default: null,
    },
    refreshToken: {
      type: String,
      default: null,
      select: false,
    },
    emailVerified: {
      type: Boolean,
      default: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    emailVerificationCodeHash: { type: String, select: false, default: null },
    emailVerificationExpiresAt: { type: Date, select: false, default: null },
    passwordResetCodeHash: { type: String, select: false, default: null },
    passwordResetExpiresAt: { type: Date, select: false, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret['passwordHash'];
        delete ret['refreshToken'];
        delete ret['emailVerificationCodeHash'];
        delete ret['emailVerificationExpiresAt'];
        delete ret['passwordResetCodeHash'];
        delete ret['passwordResetExpiresAt'];
        return ret;
      },
    },
  }
);



// Compare raw password against stored hash
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
