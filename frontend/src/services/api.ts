import axios from 'axios';
import type {
  AuthResponse, TravelGroup, Location,
  ParsedPlace, CreateLocationRequest, UpdateLocationRequest
} from '../types';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const register = (name: string, email: string, password: string) =>
  api.post<AuthResponse>('/auth/register', { name, email, password }).then(r => r.data);

export const login = (email: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { email, password }).then(r => r.data);

// Groups
export const getGroups = () =>
  api.get<TravelGroup[]>('/groups').then(r => r.data);

export const createGroup = (data: {
  name: string; destination: string; startDate?: string; endDate?: string;
}) => api.post<TravelGroup>('/groups', data).then(r => r.data);

export const joinGroup = (shareKey: string) =>
  api.post<TravelGroup>('/groups/join', { shareKey }).then(r => r.data);

export const deleteGroup = (id: string) =>
  api.delete(`/groups/${id}`);

// Locations
export const getLocations = (groupId: string) =>
  api.get<Location[]>(`/groups/${groupId}/locations`).then(r => r.data);

export const previewLocation = (groupId: string, url: string) =>
  api.post<ParsedPlace>(`/groups/${groupId}/locations/preview`, { url }).then(r => r.data);

export const addLocation = (groupId: string, data: CreateLocationRequest) =>
  api.post<Location>(`/groups/${groupId}/locations`, data).then(r => r.data);

export const updateLocation = (id: string, data: UpdateLocationRequest) =>
  api.put<Location>(`/locations/${id}`, data).then(r => r.data);

export const deleteLocation = (id: string) =>
  api.delete(`/locations/${id}`);

export const exportRoute = (groupId: string, dayLabel?: string) =>
  api.get<{ url: string }>(`/groups/${groupId}/export-route`, {
    params: dayLabel ? { dayLabel } : {}
  }).then(r => r.data);

