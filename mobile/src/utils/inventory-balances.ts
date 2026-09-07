import type { InventoryItem, RoomMember } from '../types';

const round = (value: number) => Math.round(value * 1e6) / 1e6;
export const inventoryKey = (name: string, unit: string) =>
  JSON.stringify([name.trim().replace(/\s+/g, ' ').toLowerCase(), unit === 'g' ? 'kg' : unit]);
const quantityInBaseUnit = (entry: InventoryItem) => entry.unit === 'g' ? entry.quantity / 1000 : entry.quantity;

/** Each active member matches the largest cumulative contribution for each item.
 * Pending entries count provisionally; rejected entries never create obligations.
 * Quantities are contributions, not remaining stock after consumption.
 */
export function inventoryBalances(items: InventoryItem[], members: RoomMember[], roomId: string) {
  const groups = new Map<string, { item: InventoryItem; entries: InventoryItem[] }>();
  for (const item of items) {
    if (item.roomId !== roomId || !item.isActive) continue;
    const key = inventoryKey(item.name, item.unit);
    const group = groups.get(key) ?? { item, entries: [] };
    group.entries.push(item);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([key, group]) => {
    const totals = new Map<string, number>();
    for (const entry of group.entries) {
      if (entry.status === 'REJECTED') continue;
      const id = typeof entry.addedBy === 'string' ? entry.addedBy : entry.addedBy?._id;
      // Populated references can be null when the referenced user was deleted.
      if (!id) continue;
      totals.set(id, round((totals.get(id) ?? 0) + quantityInBaseUnit(entry)));
    }
    const people = members.filter(member => member.status === 'ACTIVE').flatMap(member => {
      const id = typeof member.userId === 'string' ? member.userId : member.userId?._id;
      if (!id) return [];
      return [{ id, name: typeof member.userId === 'string' ? 'Room member' : member.userId?.name || 'Room member',
        brought: totals.get(id) ?? 0 }];
    });
    const target = Math.max(0, ...people.map(person => person.brought));
    return { ...group, key, target, unit: group.item.unit === 'g' ? 'kg' : group.item.unit,
      // Retain deliveries from missing users in the room total without assigning
      // their quantities to a different roommate or creating an unknown debtor.
      total: round(group.entries.reduce((sum, entry) => entry.status === 'REJECTED' ? sum : sum + quantityInBaseUnit(entry), 0)),
      pending: group.entries.some(entry => entry.status === 'PENDING' && entry.quantity > 0),
      people: people.map(person => ({ ...person, remaining: round(target - person.brought) })),
    };
  }).sort((a, b) => a.item.name.localeCompare(b.item.name));
}
