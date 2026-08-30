import mongoose, { Document, Schema } from 'mongoose';

export type InventoryCategory = 'KITCHEN' | 'CLEANING' | 'BATHROOM' | 'PANTRY' | 'OTHER';
export type InventoryUnit = 'kg' | 'L' | 'pcs' | 'packets' | 'boxes' | 'other';
export type InventoryStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface IInventoryItem extends Document {
  _id: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: InventoryUnit;
  minQuantity?: number;
  addedBy: mongoose.Types.ObjectId;
  lastUpdatedBy: mongoose.Types.ObjectId;
  isActive: boolean;
  status: InventoryStatus;
  verification?: {
    verifiedBy?: mongoose.Types.ObjectId;
    decision?: 'APPROVED' | 'REJECTED';
    reason?: string;
    verifiedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    category: {
      type: String,
      enum: ['KITCHEN', 'CLEANING', 'BATHROOM', 'PANTRY', 'OTHER'],
      default: 'OTHER',
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unit: {
      type: String,
      enum: ['kg', 'L', 'pcs', 'packets', 'boxes', 'other'],
      default: 'pcs',
    },
    minQuantity: {
      type: Number,
      min: 0,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    verification: {
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      decision: { type: String, enum: ['APPROVED', 'REJECTED'], default: null },
      reason: { type: String, trim: true, maxlength: 500, default: null },
      verifiedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// Compound index for efficient per-room queries
InventoryItemSchema.index({ roomId: 1, isActive: 1 });

export const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);
