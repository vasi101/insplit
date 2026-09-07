import { createError } from '../../middleware/error.middleware';

export function assertStockUnit(name: string, unit: string, quantity: number): void {
  const oil = name.trim().toLowerCase() === 'oil';
  const allowed = oil ? ['packets', 'L'] : ['kg', 'g'];
  if (!allowed.includes(unit)) {
    throw createError(oil ? 'Oil must use packets or liters.' : 'Stock items must use kg or grams.', 400, 'INVALID_UNIT');
  }
  if (!Number.isFinite(quantity) || quantity < 0 || (unit === 'packets' && !Number.isInteger(quantity))) {
    throw createError('Enter a valid quantity. Oil packets must be a whole number.', 400, 'INVALID_QUANTITY');
  }
}
