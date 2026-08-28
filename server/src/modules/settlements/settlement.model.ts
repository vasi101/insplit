import mongoose, { Document, Schema } from 'mongoose';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'ESEWA' | 'KHALTI' | 'OTHER';

export interface ISettlement extends Document {
  _id: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  fromUser: mongoose.Types.ObjectId;
  toUser: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  settlementDate: Date;
  method: PaymentMethod;
  note?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const SettlementSchema = new Schema<ISettlement>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    fromUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: 'NPR' },
    settlementDate: { type: Date, required: true },
    method: {
      type: String,
      enum: ['CASH', 'BANK_TRANSFER', 'ESEWA', 'KHALTI', 'OTHER'],
      default: 'CASH',
    },
    note: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

SettlementSchema.index({ roomId: 1, createdAt: -1 });

export const Settlement = mongoose.model<ISettlement>('Settlement', SettlementSchema);
