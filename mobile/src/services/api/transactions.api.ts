import { apiClient } from './client';
import { Transaction, TransactionCategory, ApiResponse } from '../../types';

export interface CreateTransactionPayload {
  roomId: string;
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  category?: TransactionCategory;
  paidBy: string;
  expenseDate: string;
  images?: string[];
  localId?: string;
}

export interface ListTransactionsParams {
  roomId: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ListTransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  pages: number;
}

export async function createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
  const res = await apiClient.post<ApiResponse<{ transaction: Transaction }>>('/transactions', payload);
  return res.data.data!.transaction;
}

export async function listTransactions(params: ListTransactionsParams): Promise<ListTransactionsResponse> {
  const res = await apiClient.get<ApiResponse<ListTransactionsResponse>>('/transactions', {
    params,
  });
  return res.data.data!;
}

/** Fetches the complete verified expense history used by settlement breakdowns. */
export async function listAllVerifiedTransactions(roomId: string): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  let page = 1;
  let pages = 1;

  do {
    const result = await listTransactions({ roomId, status: 'VERIFIED', page, limit: 100 });
    transactions.push(...result.transactions);
    pages = result.pages;
    page += 1;
  } while (page <= pages);

  return transactions;
}

export async function getTransactionById(transactionId: string): Promise<Transaction> {
  const res = await apiClient.get<ApiResponse<{ transaction: Transaction }>>(`/transactions/${transactionId}`);
  return res.data.data!.transaction;
}

export async function approveTransaction(transactionId: string): Promise<Transaction> {
  const res = await apiClient.post<ApiResponse<{ transaction: Transaction }>>(`/transactions/${transactionId}/approve`);
  return res.data.data!.transaction;
}

export async function rejectTransaction(transactionId: string, reason?: string): Promise<Transaction> {
  const res = await apiClient.post<ApiResponse<{ transaction: Transaction }>>(`/transactions/${transactionId}/reject`, {
    reason,
  });
  return res.data.data!.transaction;
}

export async function updateTransaction(
  transactionId: string,
  payload: Partial<CreateTransactionPayload>
): Promise<Transaction> {
  const res = await apiClient.patch<ApiResponse<{ transaction: Transaction }>>(`/transactions/${transactionId}`, payload);
  return res.data.data!.transaction;
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  await apiClient.delete(`/transactions/${transactionId}`);
}

export async function voidTransaction(transactionId: string): Promise<Transaction> {
  const res = await apiClient.post<ApiResponse<{ transaction: Transaction }>>(`/transactions/${transactionId}/void`);
  return res.data.data!.transaction;
}
