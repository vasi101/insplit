export interface User {
  _id: string;
  name: string;
  email: string;
  profileImage?: string;
  phone?: string;
  pushToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type MemberRole = 'OWNER' | 'MEMBER';
export type MemberStatus = 'PENDING' | 'ACTIVE' | 'REMOVED';

export interface RoomMember {
  userId: User | string;
  role: MemberRole;
  joinedAt: string;
  status: MemberStatus;
}

export interface Room {
  _id: string;
  name: string;
  description?: string;
  createdBy: string;
  inviteCode: string;
  members: RoomMember[];
  createdAt: string;
  updatedAt: string;
}

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

export interface VerificationInfo {
  verifiedBy?: User | string;
  decision?: VerificationDecision;
  reason?: string;
  verifiedAt?: string;
}

export interface Transaction {
  _id: string;
  roomId: string;
  createdBy: User;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  category: TransactionCategory;
  paidBy: User;
  expenseDate: string;
  images: string[];
  status: TransactionStatus;
  verification?: VerificationInfo;
  localId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberBalance {
  userId: string;
  name: string;
  email: string;
  profileImage?: string;
  totalPaid: number;
  fairShare: number;
  balance: number; // positive = owed money, negative = owes money
}

export interface SettlementSuggestion {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
}

export interface BalanceSummaryResponse {
  balances: MemberBalance[];
  suggestions: SettlementSuggestion[];
  currency: string;
}

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'ESEWA' | 'KHALTI' | 'CARD' | 'OTHER';

export interface Settlement {
  _id: string;
  roomId: string;
  fromUser: User;
  toUser: User;
  amount: number;
  currency: string;
  settlementDate: string;
  method: PaymentMethod;
  note?: string;
  proofImage?: string;
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verification?: {
    verifiedBy?: User | string;
    decision?: 'APPROVED' | 'REJECTED';
    verifiedAt?: string;
  };
  createdBy: string;
  createdAt: string;
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export type InventoryCategory = 'KITCHEN' | 'CLEANING' | 'BATHROOM' | 'PANTRY' | 'OTHER';
export type InventoryUnit = 'kg' | 'g' | 'L' | 'pcs' | 'packets' | 'boxes' | 'other';

export interface InventoryItem {
  _id: string;
  roomId: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: InventoryUnit;
  minQuantity?: number;
  addedBy: User | string;
  lastUpdatedBy: User | string;
  isActive: boolean;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verification?: {
    verifiedBy?: User | string;
    decision?: 'APPROVED' | 'REJECTED';
    reason?: string;
    verifiedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: unknown[];
}
