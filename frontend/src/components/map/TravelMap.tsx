import { APIProvider, Map as GoogleMap, Marker, Polyline, InfoWindow } from '@vis.gl/react-google-maps';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Location } from '../../types';
import { PRIORITY_PIN_COLORS, TYPE_CONFIG, PRIORITY_CONFIG, getDayColor } from '../ui/constants';
import { voteLocation } from '../../services/api';
import VotersTooltip from '../locations/VotersTooltip';
import { buildPinIcon } from './mapIcons';
import toast from 'react-hot-toast';
import { Star, Clock, Calendar, ExternalLink, ThumbsUp, ThumbsDown } from 'lucide-react';

interface TravelMapProps {
  locations: Location[];
  center?: { lat: number; lng: number };
  groupId?: string;
  // When true, locations are grouped/colored by dayLabel and connected with colored route lines.
  showRoutes?: boolean;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

export default function TravelMap({ locations, center, groupId, showRoutes = false }: TravelMapProps) {
  const [selected, setSelected] = useState<Location | null>(null);
  const qc = useQueryClient();

  const voteMutation = useMutation({
    mutationFn: ({ id, isLike }: { id: string; isLike: boolean }) => voteLocation(id, isLike),
    onSuccess: updated => {
      setSelected(updated);
      if (groupId) qc.invalidateQueries({ queryKey: ['locations', groupId] });
    },
    onError: () => toast.error('Erro ao registrar seu voto.')
  });

  const defaultCenter = center ?? (
    locations.length > 0
      ? { lat: locations[0].lat, lng: locations[0].lng }
      : { lat: 40.4168, lng: -3.7038 } // Madrid as default
  );

  // Group locations by day (preserving the incoming order, which the API already sorts by
  // visit date/time) so we can draw one colored route per day and number the stops.
  const { dayLabels, dayGroups, orderByLocationId } = useMemo(() => {
    const groups = new Map<string, Location[]>();
    for (const loc of locations) {
      if (!loc.dayLabel) continue;
      const arr = groups.get(loc.dayLabel) ?? [];
      arr.push(loc);
      groups.set(loc.dayLabel, arr);
    }
    const labels = [...groups.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true }));
    const orderMap = new Map<string, number>();
    for (const label of labels) {
      groups.get(label)!.forEach((loc, idx) => orderMap.set(loc.id, idx + 1));
    }
    return { dayLabels: labels, dayGroups: groups, orderByLocationId: orderMap };
  }, [locations]);

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        defaultCenter={defaultCenter}
        defaultZoom={13}
        style={{ width: '100%', height: '100%' }}
        gestureHandling="greedy"
        disableDefaultUI={false}
        fullscreenControl={false}
        zoomControlOptions={{ position: 9 /* RIGHT_BOTTOM */ }}
        streetViewControl={false}
        clickableIcons={false}
        styles={[
          // Hide Google's default points-of-interest icons/labels so only
          // the locations added to the group show up on the map.
          // NOTE: this only works because we intentionally do NOT set a `mapId` on this
          // <Map>. Google ignores the `styles` prop whenever a Map ID is present (styling
          // for a Map ID must be configured in the Cloud Console instead), which used to
          // let default restaurant/attraction/etc. POI icons leak through.
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi.park', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },
        ]}
      >
        {/* One colored polyline per day, connecting stops in visit order */}
        {showRoutes && dayLabels.map(label => {
          const stops = dayGroups.get(label)!;
          if (stops.length < 2) return null;
          return (
            <Polyline
              key={label}
              path={stops.map(s => ({ lat: s.lat, lng: s.lng }))}
              strokeColor={getDayColor(label, dayLabels)}
              strokeOpacity={0.85}
              strokeWeight={4}
            />
          );
        })}

        {locations.map(loc => {
          const dayColor = showRoutes && loc.dayLabel ? getDayColor(loc.dayLabel, dayLabels) : undefined;
          const color = dayColor ?? PRIORITY_PIN_COLORS[loc.priority];
          const order = showRoutes ? orderByLocationId.get(loc.id) : undefined;
          return (
            <Marker
              key={loc.id}
              position={{ lat: loc.lat, lng: loc.lng }}
              onClick={() => setSelected(loc)}
              title={loc.name}
              icon={buildPinIcon(color, TYPE_CONFIG[loc.type]?.emoji ?? '📍', {
                scale: selected?.id === loc.id ? 1.25 : 1,
                order,
              })}
              zIndex={selected?.id === loc.id ? 999 : undefined}
            />
          );
        })}


        {selected && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setSelected(null)}
            pixelOffset={[0, -40]}
          >
            <div className="w-[min(80vw,280px)] p-1">
              {selected.photoUrl && (
                <img src={selected.photoUrl} alt={selected.name} className="w-full h-24 object-cover rounded-md mb-2" />
              )}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-gray-800 text-sm leading-tight">{selected.name}</h3>
                <span className="text-lg flex-shrink-0">{TYPE_CONFIG[selected.type]?.emoji}</span>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">{selected.address}</p>

              <div className="flex flex-wrap gap-1 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_CONFIG[selected.priority].color}`}>
                  {PRIORITY_CONFIG[selected.priority].label}
                </span>
                {selected.googleRating && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-medium flex items-center gap-0.5">
                    <Star size={10} fill="currentColor" /> {selected.googleRating.toFixed(1)}
                  </span>
                )}
              </div>

              {(selected.visitDate || selected.visitTime) && (
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                  <Calendar size={11} />
                  {selected.dayLabel && <span className="font-medium">{selected.dayLabel} – </span>}
                  {selected.visitDate && new Date(selected.visitDate).toLocaleDateString('pt-BR')}
                  {selected.visitTime && ` às ${selected.visitTime}`}
                </p>
              )}
              {selected.durationHours && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={11} /> {selected.durationHours}h estimadas
                </p>
              )}

              {/* Like / dislike */}
              <div className="flex items-center gap-1.5 mt-2">
                <VotersTooltip names={selected.likedByNames}>
                  <button
                    onClick={() => voteMutation.mutate({ id: selected.id, isLike: true })}
                    disabled={voteMutation.isPending}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium border transition ${
                      selected.myVote === true
                        ? 'border-green-300 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-green-600'
                    }`}
                  >
                    <ThumbsUp size={11} fill={selected.myVote === true ? 'currentColor' : 'none'} /> {selected.likeCount}
                  </button>
                </VotersTooltip>
                <VotersTooltip names={selected.dislikedByNames}>
                  <button
                    onClick={() => voteMutation.mutate({ id: selected.id, isLike: false })}
                    disabled={voteMutation.isPending}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium border transition ${
                      selected.myVote === false
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-red-600'
                    }`}
                  >
                    <ThumbsDown size={11} fill={selected.myVote === false ? 'currentColor' : 'none'} /> {selected.dislikeCount}
                  </button>
                </VotersTooltip>
              </div>

              <div className="flex gap-2 mt-2">
                <a
                  href={selected.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium"
                >
                  <ExternalLink size={11} /> Abrir no Maps
                </a>
                {selected.needsReservation && (
                  <span className={`text-xs ${selected.reservationDone ? 'text-green-600' : 'text-orange-600'} font-medium`}>
                    {selected.reservationDone ? '✅ Reservado' : '📅 Precisa reservar'}
                  </span>
                )}
              </div>
              {selected.notes && (
                <p className="text-xs text-gray-500 mt-1.5 italic border-t border-gray-100 pt-1.5">"{selected.notes}"</p>
              )}
              <p className="text-xs text-gray-400 mt-1">Adicionado por {selected.addedByName}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </APIProvider>
  );
}

