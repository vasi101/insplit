export interface MoneyRow { _id: string | null; name?: string; count: number; amount: number; verified: number; pending: number; average: number; largest: number }
export interface CountRow { _id: string; count: number; name?: string }
export interface MoneyReport { summary: MoneyRow[]; trend: MoneyRow[]; statuses: MoneyRow[]; rooms: MoneyRow[] }
export interface AnalyticsData {
  currencies: string[];
  roomOptions: { _id: string; name: string }[];
  rooms: { _id: string; name: string; activeMembers: number; pendingMembers: number; createdAt: string; createdInPeriod: boolean }[];
  transactions: MoneyReport & { categories: MoneyRow[]; people: MoneyRow[]; details: { _id: string; title: string; amount: number; category: string; status: string; expenseDate: string; room?: string; payer?: string }[] };
  settlements: MoneyReport & { methods: MoneyRow[] };
  inventory: { statuses: CountRow[]; trend: CountRow[]; contributors: CountRow[]; items: { _id: { name: string; unit: string }; count: number; quantity: number; pending: number }[] };
  users: { summary: { count: number; verified: number; admins: number }[]; trend: CountRow[] };
}
export interface AnalyticsQuery { from: string; to: string; group: string; timezone: string; currency: string; status: string; category: string; roomId: string; page: number }
