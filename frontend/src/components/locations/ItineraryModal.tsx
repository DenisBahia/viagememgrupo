import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { suggestItinerary, applyItinerary } from '../../services/api';
import type { Location, ItineraryAssignment } from '../../types';
import { TYPE_CONFIG, getDayColor } from '../ui/constants';
import toast from 'react-hot-toast';
import { X, Sparkles, Clock, Route as RouteIcon, ExternalLink, CheckCircle2, Hotel, Database } from 'lucide-react';

interface ItineraryModalProps {
  groupId: string;
  locations: Location[]; // the currently filtered list of locations to plan
  onClose: () => void;
  onApplied: () => void;
}

function buildDayMapsUrl(locationIds: string[], byId: Map<string, Location>): string | null {
  const stops = locationIds.map(id => byId.get(id)).filter((l): l is Location => !!l);
  if (stops.length === 0) return null;
  if (stops.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${stops[0].lat},${stops[0].lng}`;
  }
  const origin = `${stops[0].lat},${stops[0].lng}`;
  const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
  const waypoints = stops.slice(1, -1).map(l => `${l.lat},${l.lng}`).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  return url;
}

// Renders a short **bold**-markdown string (used by the day summary text) as React nodes.
function renderBoldText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-gray-700 font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}


export default function ItineraryModal({ groupId, locations, onClose, onApplied }: ItineraryModalProps) {
  const qc = useQueryClient();
  const [applied, setApplied] = useState(false);

  const hotels = locations.filter(l => l.type === 'hotel');
  const planLocations = locations.filter(l => l.type !== 'hotel');
  const byId = new Map(locations.map(l => [l.id, l]));

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['itinerary-suggestion', groupId, locations.map(l => l.id).join(',')],
    queryFn: () => suggestItinerary(groupId, locations.map(l => l.id)),
    enabled: planLocations.length > 0,
    retry: false,
  });
  const itinerary = data?.days;

  const applyMutation = useMutation({
    mutationFn: () => {
      const assignments: ItineraryAssignment[] = (itinerary ?? []).flatMap(day =>
        day.stops.map(stop => ({
          locationId: stop.locationId,
          dayLabel: day.dayLabel,
          order: stop.order,
          visitDate: day.date ?? undefined,
          visitTime: stop.suggestedTime,
        }))
      );
      return applyItinerary(groupId, assignments);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations', groupId] });
      toast.success('Roteiro aplicado! Locais organizados por dia.');
      setApplied(true);
      onApplied();
    },
    onError: () => toast.error('Erro ao aplicar o roteiro sugerido.'),
  });

  const dayLabels = (itinerary ?? []).map(d => d.dayLabel);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-600" /> Sugestão de Roteiro
          </h2>
          <div className="flex items-center gap-2">
            {data && (
              <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border ${
                data.fromCache
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                {data.fromCache ? <Database size={11} /> : <Sparkles size={11} />}
                {data.fromCache ? 'Cache' : 'Gerado agora'}
              </span>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {planLocations.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              Adicione locais (que não sejam hotéis) para gerar um roteiro sugerido.
            </p>
          )}

          {hotels.length > 0 && (
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Hotel size={12} /> {hotels.length} hotel(is) não incluído(s) no roteiro (são hospedagem, não paradas).
            </p>
          )}

          {isLoading && <p className="text-sm text-gray-400 text-center py-8">Calculando o melhor roteiro...</p>}
          {isError && (
            <div className="text-center py-6">
              <p className="text-sm text-red-500 mb-2">Não foi possível calcular o roteiro.</p>
              <button onClick={() => refetch()} className="text-xs text-indigo-600 hover:underline">Tentar novamente</button>
            </div>
          )}

          {itinerary && itinerary.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Roteiro gerado automaticamente com base em proximidade, tempo estimado em cada local e melhor
                período do dia (manhã / almoço / tarde / jantar / noite). Você pode ajustar depois arrastando os
                locais entre os dias.
              </p>
              {itinerary.map(day => {
                const color = getDayColor(day.dayLabel, dayLabels);
                const mapsUrl = buildDayMapsUrl(day.stops.map(s => s.locationId), byId);
                return (
                  <div key={day.dayIndex} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: `${color}15` }}>
                      <span className="text-sm font-bold flex items-center gap-2" style={{ color }}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        {day.dayLabel}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock size={11} /> {day.totalDurationHours}h</span>
                        <span className="flex items-center gap-1"><RouteIcon size={11} /> {day.totalDistanceKm}km</span>
                        {mapsUrl && (
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                             className="flex items-center gap-1 text-indigo-600 hover:underline font-medium">
                            <ExternalLink size={11} /> Abrir rota
                          </a>
                        )}
                      </div>
                    </div>
                    {day.summary && (
                      <p className="text-xs text-gray-500 leading-relaxed px-3 py-2 bg-gray-50 border-b border-gray-100">
                        {renderBoldText(day.summary)}
                      </p>
                    )}
                    <ul className="divide-y divide-gray-100">
                      {day.stops.map(stop => (
                        <li key={stop.locationId} className="flex items-center gap-2 px-3 py-2 text-sm">
                          <span
                            className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {stop.order}
                          </span>
                          <span className="text-base">{TYPE_CONFIG[stop.type]?.emoji ?? '📍'}</span>
                          <span className="flex-1 truncate text-gray-700">{stop.name}</span>
                          <span className="text-xs text-gray-400 whitespace-nowrap">{stop.suggestedTime}</span>
                          <span className="text-xs text-gray-400 whitespace-nowrap">· {stop.suggestedDurationHours}h</span>
                          {stop.travelMinutesFromPrevious > 0 && (
                            <span className="text-[10px] text-gray-300 whitespace-nowrap hidden sm:inline">
                              (+{stop.travelMinutesFromPrevious}min desloc.)
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-gray-100 flex gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
            {applied ? 'Fechar' : 'Cancelar'}
          </button>
          {itinerary && itinerary.length > 0 && !applied && (
            <button
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {applyMutation.isPending ? 'Aplicando...' : <><CheckCircle2 size={14} /> Aplicar roteiro (define dia/hora)</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}




