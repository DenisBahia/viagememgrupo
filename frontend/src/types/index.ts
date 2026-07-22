export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface TravelGroup {
  id: string;
  name: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  shareKey: string;
  ownerName: string;
  memberCount: number;
  createdAt: string;
}

export type Priority = 'must' | 'nice' | 'maybe';
export type LocationType = 'restaurant' | 'bar' | 'tourist' | 'church' | 'hotel' | 'museum' | 'park' | 'other';

export interface Location {
  id: string;
  name: string;
  address: string;
  googleMapsUrl: string;
  googlePlaceId?: string;
  lat: number;
  lng: number;
  type: LocationType;
  priority: Priority;
  visitDate?: string;
  visitTime?: string;
  durationHours?: number;
  needsReservation: boolean;
  reservationDone: boolean;
  notes?: string;
  googleRating?: number;
  dayLabel?: string;
  photoUrl?: string;
  addedByName: string;
  createdAt: string;
}

export interface ParsedPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
  rating?: number;
  photoUrl?: string;
  suggestedType: LocationType;
}

export interface CreateLocationRequest {
  googleMapsUrl: string;
  priority: Priority;
  type: LocationType;
  visitDate?: string;
  visitTime?: string;
  durationHours?: number;
  needsReservation: boolean;
  notes?: string;
  dayLabel?: string;
}

export interface UpdateLocationRequest {
  priority?: Priority;
  type?: LocationType;
  visitDate?: string;
  visitTime?: string;
  durationHours?: number;
  needsReservation?: boolean;
  reservationDone?: boolean;
  notes?: string;
  dayLabel?: string;
}

