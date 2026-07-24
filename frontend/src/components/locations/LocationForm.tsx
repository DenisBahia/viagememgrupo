import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { previewLocation, addLocation, searchPlaces } from '../../services/api';
import toast from 'react-hot-toast';
import type { ParsedPlace, Priority, LocationType } from '../../types';
import { PRIORITY_CONFIG, TYPE_CONFIG } from '../ui/constants';
import { Search, MapPin, Star, X, Link as LinkIcon } from 'lucide-react';

interface LocationFormProps {
  groupId: string;
  onClose: () => void;
}

// Builds a real, shareable Google Maps link for a place found via text search, using the
// official `query_place_id` format so it points precisely at that place (not a same-named
// place elsewhere in the world).
function buildMapsUrlFromPlace(place: ParsedPlace): string {
  const query = encodeURIComponent(place.name || `${place.lat},${place.lng}`);
  if (place.placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${place.placeId}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
}

export default function LocationForm({ groupId, onClose }: LocationFormProps) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'link' | 'search'>('link');
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<ParsedPlace | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ParsedPlace[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [priority, setPriority] = useState<Priority>('nice');
  const [type, setType] = useState<LocationType>('other');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [needsReservation, setNeedsReservation] = useState(false);
  const [notes, setNotes] = useState('');
  const [dayLabel, setDayLabel] = useState('');

  const handlePreview = async () => {
    if (!url.trim()) return;
    setIsPreviewing(true);
    try {
      const data = await previewLocation(groupId, url.trim());
      setPreview(data);
      setType(data.suggestedType);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Não foi possível processar o link.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults(null);
    try {
      const results = await searchPlaces(groupId, searchQuery.trim());
      if (results.length === 0) toast.error('Nenhum local encontrado para essa busca.');
      setSearchResults(results);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Não foi possível buscar o local.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (place: ParsedPlace) => {
    setUrl(buildMapsUrlFromPlace(place));
    setPreview(place);
    setType(place.suggestedType);
    setSearchResults(null);
  };

  const addMutation = useMutation({
    mutationFn: () => addLocation(groupId, {
      googleMapsUrl: url,
      priority,
      type,
      visitDate: visitDate || undefined,
      visitTime: visitTime || undefined,
      durationHours: durationHours ? parseFloat(durationHours) : undefined,
      needsReservation,
      notes: notes || undefined,
      dayLabel: dayLabel || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations', groupId] });
      toast.success(`"${preview?.name}" adicionado!`);
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao adicionar local.')
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95dvh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Adicionar Local</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Mode toggle: paste a link vs. search directly in the app */}
          <div className="flex gap-1.5 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setMode('link'); setSearchResults(null); }}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                mode === 'link' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LinkIcon size={13} /> Link do Maps
            </button>
            <button
              onClick={() => { setMode('search'); setPreview(null); setUrl(''); }}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                mode === 'search' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Search size={13} /> Buscar local
            </button>
          </div>

          {/* URL Input */}
          {mode === 'link' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Link do Google Maps</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Cole o link do Google Maps aqui..."
                  value={url}
                  onChange={e => { setUrl(e.target.value); setPreview(null); }}
                />
                <button
                  onClick={handlePreview}
                  disabled={!url.trim() || isPreviewing}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1 text-sm whitespace-nowrap"
                >
                  <Search size={14} /> {isPreviewing ? '...' : 'Buscar'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Aceita links longos ou encurtados do Google Maps</p>
            </div>
          )}

          {/* Direct text search */}
          {mode === 'search' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome ou endereço do local</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Torre Eiffel, Restaurante XYZ..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                />
                <button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1 text-sm whitespace-nowrap"
                >
                  <Search size={14} /> {isSearching ? '...' : 'Buscar'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Resultados são priorizados perto do destino do grupo</p>

              {/* Search results list */}
              {searchResults && searchResults.length > 0 && !preview && (
                <div className="mt-2 border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  {searchResults.map((place, idx) => (
                    <button
                      key={place.placeId ?? idx}
                      onClick={() => handleSelectResult(place)}
                      className="w-full flex items-start gap-2 p-2.5 hover:bg-indigo-50 text-left transition"
                    >
                      {place.photoUrl ? (
                        <img src={place.photoUrl} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">{TYPE_CONFIG[place.suggestedType]?.emoji}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{place.name}</p>
                        <p className="text-gray-500 text-xs line-clamp-2">{place.address}</p>
                        {place.rating && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-orange-600 mt-0.5">
                            <Star size={10} fill="currentColor" /> {place.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {preview && (
                <button
                  onClick={() => { setPreview(null); setUrl(''); }}
                  className="text-xs text-indigo-600 hover:underline mt-2"
                >
                  ← Escolher outro local
                </button>
              )}
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="border border-indigo-100 bg-indigo-50 rounded-xl p-3">
              <div className="flex items-start gap-2">
                {preview.photoUrl && (
                  <img src={preview.photoUrl} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{TYPE_CONFIG[preview.suggestedType]?.emoji}</span>
                    <h3 className="font-bold text-gray-800 text-sm truncate">{preview.name}</h3>
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{preview.address}</p>
                  {preview.rating && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-orange-600 mt-1">
                      <Star size={10} fill="currentColor" /> {preview.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}


          {preview && (
            <>
              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Vontade de ir</label>
                <div className="flex gap-2">
                  {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setPriority(key)}
                      className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border-2 transition ${
                        priority === key ? `border-indigo-500 ${cfg.color}` : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipo de local</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(Object.entries(TYPE_CONFIG) as [LocationType, typeof TYPE_CONFIG[LocationType]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setType(key)}
                      className={`py-1.5 px-1 rounded-lg text-xs font-medium border-2 flex flex-col items-center gap-0.5 transition ${
                        type === key ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>{cfg.emoji}</span>
                      <span className="text-[10px]">{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date, Time, Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={visitDate} onChange={e => setVisitDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Horário</label>
                  <input type="time" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={visitTime} onChange={e => setVisitTime(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Horas lá</label>
                  <input type="number" step="0.5" min="0.5" max="12" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: 2" value={durationHours} onChange={e => setDurationHours(e.target.value)} />
                </div>
              </div>

              {/* Day Label */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rótulo do dia (ex: Dia 1, 27/12)</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Dia 1" value={dayLabel} onChange={e => setDayLabel(e.target.value)} />
              </div>

              {/* Reservation */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={needsReservation}
                  onChange={e => setNeedsReservation(e.target.checked)} />
                <span className="text-sm text-gray-700">Precisa de reserva/agendamento</span>
              </label>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={2} placeholder="Alguma observação..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => addMutation.mutate()}
            disabled={!preview || addMutation.isPending}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <MapPin size={14} /> {addMutation.isPending ? 'Adicionando...' : 'Adicionar ao mapa'}
          </button>
        </div>
      </div>
    </div>
  );
}

