import mongoose, { Document, Schema } from 'mongoose';

export type MemberRole = 'OWNER' | 'MEMBER';
export type MemberStatus = 'PENDING' | 'ACTIVE' | 'REMOVED';

export interface IRoomMember {
  userId: mongoose.Types.ObjectId;
  role: MemberRole;
  joinedAt: Date;
  status: MemberStatus;
}

export interface IRoom extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  inviteCode: string;
  members: IRoomMember[];
  createdAt: Date;
  updatedAt: Date;
}

const RoomMemberSchema = new Schema<IRoomMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['OWNER', 'MEMBER'], default: 'MEMBER' },
    joinedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['PENDING', 'ACTIVE', 'REMOVED'], default: 'ACTIVE' },
  },
  { _id: false }
);

const RoomSchema = new Schema<IRoom>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    members: [RoomMemberSchema],
  },
  { timestamps: true }
);

// Indexes for common queries
RoomSchema.index({ 'members.userId': 1 });

export const Room = mongoose.model<IRoom>('Room', RoomSchema);
