import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { previewLocation, addLocation } from '../../services/api';
import toast from 'react-hot-toast';
import type { ParsedPlace, Priority, LocationType } from '../../types';
import { PRIORITY_CONFIG, TYPE_CONFIG } from '../ui/constants';
import { Search, MapPin, Star, X } from 'lucide-react';

interface LocationFormProps {
  groupId: string;
  onClose: () => void;
}

export default function LocationForm({ groupId, onClose }: LocationFormProps) {
  const qc = useQueryClient();
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<ParsedPlace | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Adicionar Local</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* URL Input */}
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
                <div className="grid grid-cols-4 gap-1.5">
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
              <div className="grid grid-cols-3 gap-2">
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

        <div className="p-5 border-t border-gray-100 flex gap-2">
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

