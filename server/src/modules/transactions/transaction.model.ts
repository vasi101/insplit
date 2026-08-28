import mongoose, { Document, Schema } from 'mongoose';

export type TransactionStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'VOIDED';
export type VerificationDecision = 'APPROVED' | 'REJECTED';

export type TransactionCategory =
  | 'GROCERY'
  | 'UTILITIES'
  | 'RENT'
  | 'CLEANING'
  | 'FOOD'
  | 'TRANSPORT'
  | 'MEDICAL'
  | 'ENTERTAINMENT'
  | 'OTHER';

export interface IVerification {
  verifiedBy?: mongoose.Types.ObjectId;
  decision?: VerificationDecision;
  reason?: string;
  verifiedAt?: Date;
}

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  category: TransactionCategory;
  paidBy: mongoose.Types.ObjectId;
  expenseDate: Date;
  images: string[];
  status: TransactionStatus;
  verification: IVerification;
  localId?: string; // Client-generated UUID for offline sync deduplication
  createdAt: Date;
  updatedAt: Date;
}

const VerificationSchema = new Schema<IVerification>(
  {
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decision: { type: String, enum: ['APPROVED', 'REJECTED'], default: null },
    reason: { type: String, default: null },
    verifiedAt: { type: Date, default: null },
  },
  { _id: false }
);

const TransactionSchema = new Schema<ITransaction>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: 'NPR', maxlength: 10 },
    category: {
      type: String,
      enum: ['GROCERY', 'UTILITIES', 'RENT', 'CLEANING', 'FOOD', 'TRANSPORT', 'MEDICAL', 'ENTERTAINMENT', 'OTHER'],
      default: 'OTHER',
    },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expenseDate: { type: Date, required: true },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED', 'VOIDED'],
      default: 'PENDING',
    },
    verification: { type: VerificationSchema, default: () => ({}) },
    localId: { type: String, sparse: true, unique: true }, // For offline sync dedup
  },
  { timestamps: true }
);

// Indexes for common query patterns
TransactionSchema.index({ roomId: 1, createdAt: -1 });
TransactionSchema.index({ roomId: 1, status: 1 });
TransactionSchema.index({ createdBy: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
