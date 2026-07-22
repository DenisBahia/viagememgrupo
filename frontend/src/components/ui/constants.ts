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

