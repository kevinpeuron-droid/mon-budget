export const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

export const formatDate = (isoString: string): string => {
  return new Date(isoString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};