import { apiClient } from './client';
import { InventoryItem, InventoryCategory, InventoryUnit, ApiResponse } from '../../types';

export interface AddItemPayload {
  roomId: string;
  name: string;
  category?: InventoryCategory;
  quantity: number;
  unit?: InventoryUnit;
  minQuantity?: number | null;
}

export interface UpdateItemPayload {
  name?: string;
  category?: InventoryCategory;
  quantity?: number;
  unit?: InventoryUnit;
  minQuantity?: number | null;
}

export async function getItemsByRoom(roomId: string): Promise<InventoryItem[]> {
  const res = await apiClient.get<ApiResponse<{ items: InventoryItem[] }>>(`/inventory/${roomId}`);
  return res.data.data!.items;
}

export async function addItem(payload: AddItemPayload): Promise<InventoryItem> {
  const res = await apiClient.post<ApiResponse<{ item: InventoryItem }>>('/inventory', payload);
  return res.data.data!.item;
}

export async function updateItem(itemId: string, payload: UpdateItemPayload): Promise<InventoryItem> {
  const res = await apiClient.patch<ApiResponse<{ item: InventoryItem }>>(`/inventory/${itemId}`, payload);
  return res.data.data!.item;
}

export async function deleteItem(itemId: string): Promise<void> {
  await apiClient.delete(`/inventory/${itemId}`);
}
