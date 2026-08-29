import { apiClient } from './client';
import { BalanceSummaryResponse, Settlement, PaymentMethod, ApiResponse } from '../../types';

export interface RecordSettlementPayload {
  roomId: string;
  fromUser: string;
  toUser: string;
  amount: number;
  currency?: string;
  settlementDate: string;
  method?: PaymentMethod;
  note?: string;
  proofImage?: string;
}

export async function getRoomBalances(
  roomId: string,
  startDate?: string,
  endDate?: string
): Promise<BalanceSummaryResponse> {
  const res = await apiClient.get<ApiResponse<BalanceSummaryResponse>>(`/settlements/${roomId}/balances`, {
    params: { startDate, endDate },
  });
  return res.data.data!;
}

export async function getSettlementHistory(roomId: string): Promise<Settlement[]> {
  const res = await apiClient.get<ApiResponse<{ settlements: Settlement[] }>>(`/settlements/${roomId}/history`);
  return res.data.data!.settlements;
}

export async function recordSettlement(payload: RecordSettlementPayload): Promise<Settlement> {
  const res = await apiClient.post<ApiResponse<{ settlement: Settlement }>>('/settlements', payload);
  return res.data.data!.settlement;
}

export async function approveSettlement(settlementId: string): Promise<Settlement> {
  const res = await apiClient.post<ApiResponse<{ settlement: Settlement }>>(`/settlements/${settlementId}/approve`);
  return res.data.data!.settlement;
}

export async function rejectSettlement(settlementId: string): Promise<Settlement> {
  const res = await apiClient.post<ApiResponse<{ settlement: Settlement }>>(`/settlements/${settlementId}/reject`);
  return res.data.data!.settlement;
}
