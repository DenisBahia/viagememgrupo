import type { LocationType, Priority } from '../../types';

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dot: string }> = {
  must: { label: 'Com Certeza!', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  nice: { label: 'Seria uma boa...', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' },
  maybe: { label: 'Se rolar, rolou...', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};

export const TYPE_CONFIG: Record<LocationType, { label: string; emoji: string }> = {
  restaurant: { label: 'Restaurante', emoji: '🍽️' },
  bar: { label: 'Bar', emoji: '🍺' },
  tourist: { label: 'Ponto Turístico', emoji: '🏛️' },
  church: { label: 'Igreja', emoji: '⛪' },
  hotel: { label: 'Hotel', emoji: '🏨' },
  museum: { label: 'Museu', emoji: '🎨' },
  park: { label: 'Parque', emoji: '🌿' },
  other: { label: 'Outro', emoji: '📍' },
};

export const PRIORITY_PIN_COLORS: Record<Priority, string> = {
  must: '#22c55e',
  nice: '#eab308',
  maybe: '#9ca3af',
};

// Distinct colors used to tell each day's route/pins apart on the map.
export const DAY_COLORS: string[] = [
  '#4f46e5', // indigo
  '#dc2626', // red
  '#0891b2', // cyan
  '#ca8a04', // amber
  '#db2777', // pink
  '#16a34a', // green
  '#7c3aed', // violet
  '#ea580c', // orange
  '#0d9488', // teal
  '#65a30d', // lime
];

export function getDayColor(dayLabel: string, allDayLabels: string[]): string {
  const idx = allDayLabels.indexOf(dayLabel);
  if (idx === -1) return '#6b7280';
  return DAY_COLORS[idx % DAY_COLORS.length];
}


