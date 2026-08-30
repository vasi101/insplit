export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string | null;
  profileImage?: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  roomsCount?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RoomMember {
  userId: User | string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: string;
  status: 'PENDING' | 'ACTIVE' | 'REMOVED';
}

export interface Room {
  _id: string;
  name: string;
  description?: string;
  createdBy: User | { _id: string; name: string; email: string };
  inviteCode: string;
  members: RoomMember[];
  createdAt: string;
  updatedAt: string;
}

export type TransactionStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'VOIDED';

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

export interface Transaction {
  _id: string;
  roomId: Room | { _id: string; name: string };
  title: string;
  description?: string;
  amount: number;
  currency: string;
  category: TransactionCategory;
  paidBy: User | { _id: string; name: string; email: string; profileImage?: string };
  createdBy: User | { _id: string; name: string; email: string; profileImage?: string };
  expenseDate: string;
  images: string[];
  status: TransactionStatus;
  verification?: {
    verifiedBy?: User | { _id: string; name: string; email: string };
    decision?: 'APPROVED' | 'REJECTED';
    reason?: string;
    verifiedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type InventoryCategory = 'KITCHEN' | 'CLEANING' | 'BATHROOM' | 'PANTRY' | 'OTHER';
export type InventoryUnit = 'kg' | 'L' | 'pcs' | 'packets' | 'boxes' | 'other';

export interface InventoryItem {
  _id: string;
  roomId: Room | { _id: string; name: string };
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: InventoryUnit;
  minQuantity?: number | null;
  addedBy: User | { _id: string; name: string; email: string };
  lastUpdatedBy: User | { _id: string; name: string; email: string };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  overview: {
    totalUsers: number;
    verifiedUsers: number;
    adminUsers: number;
    newUsers30d: number;
    totalRooms: number;
    newRooms30d: number;
    totalTransactions: number;
    totalVolumeNPR: number;
    verifiedVolumeNPR: number;
    totalInventory: number;
    lowStockItems: number;
  };
  statusBreakdown: Record<string, { count: number; totalAmount: number }>;
  categoryBreakdown: Array<{ category: string; count: number; totalAmount: number }>;
  monthlyTrends: {
    transactions: Array<{ year: number; month: number; volume: number; count: number }>;
    users: Array<{ year: number; month: number; count: number }>;
  };
  recent: {
    transactions: Transaction[];
    users: User[];
    rooms: Room[];
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
