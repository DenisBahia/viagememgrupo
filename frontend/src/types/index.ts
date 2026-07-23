export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface GroupMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'member';
}

export interface TravelGroup {
  id: string;
  name: string;
  destination: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  startDate?: string;
  endDate?: string;
  shareKey: string;
  ownerName: string;
  memberCount: number;
  createdAt: string;
  isOwner?: boolean;
  members?: GroupMember[];
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
  dayOrder?: number | null;
  photoUrl?: string;
  addedByName: string;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  myVote?: boolean | null;
  likedByNames: string[];
  dislikedByNames: string[];
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

export interface AiTips {
  content: string;
  generatedAt: string;
  fromCache: boolean;
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
  clearVisitDate?: boolean;
  clearVisitTime?: boolean;
  clearDurationHours?: boolean;
  clearNotes?: boolean;
  clearDayLabel?: boolean;
}

export interface ItineraryStop {
  locationId: string;
  name: string;
  type: LocationType;
  order: number;
  suggestedTime: string;
  suggestedDurationHours: number;
  travelKmFromPrevious: number;
  travelMinutesFromPrevious: number;
}

export interface ItineraryDay {
  dayIndex: number;
  dayLabel: string;
  date?: string | null;
  stops: ItineraryStop[];
  totalDurationHours: number;
  totalDistanceKm: number;
  summary: string;
}

export interface ItineraryAssignment {
  locationId: string;
  dayLabel: string;
  order: number;
  visitDate?: string | null;
  visitTime?: string | null;
}

export interface ItinerarySuggestion {
  days: ItineraryDay[];
  fromCache: boolean;
  generatedAt: string;
}

export interface ExportRoute {
  dayLabel: string;
  url: string;
  stopsCount: number;
}


