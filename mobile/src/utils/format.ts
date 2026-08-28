export function formatCurrency(amount: number | null | undefined, currency: string = 'NPR'): string {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safeAmount);
  return `${currency} ${formatted}`;
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(date);
}

export function getInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getCategoryIcon(category: string): string {
  switch (category) {
    case 'GROCERY':
      return 'cart-outline';
    case 'UTILITIES':
      return 'flash-outline';
    case 'RENT':
      return 'home-outline';
    case 'CLEANING':
      return 'sparkles-outline';
    case 'FOOD':
      return 'restaurant-outline';
    case 'TRANSPORT':
      return 'car-outline';
    case 'MEDICAL':
      return 'medkit-outline';
    case 'ENTERTAINMENT':
      return 'game-controller-outline';
    default:
      return 'receipt-outline';
  }
}
