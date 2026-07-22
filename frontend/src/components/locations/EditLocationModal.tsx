import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLocation } from '../../services/api';
import type { Location, Priority, LocationType } from '../../types';
import { PRIORITY_CONFIG, TYPE_CONFIG } from '../ui/constants';
import toast from 'react-hot-toast';
import { X, Save } from 'lucide-react';

interface EditLocationModalProps {
  location: Location;
  groupId: string;
  onClose: () => void;
}

export default function EditLocationModal({ location: loc, groupId, onClose }: EditLocationModalProps) {
  const qc = useQueryClient();

  const [priority, setPriority] = useState<Priority>(loc.priority);
  const [type, setType] = useState<LocationType>(loc.type);
  const [visitDate, setVisitDate] = useState(loc.visitDate ? loc.visitDate.slice(0, 10) : '');
  const [visitTime, setVisitTime] = useState(loc.visitTime ?? '');
  const [durationHours, setDurationHours] = useState(loc.durationHours != null ? String(loc.durationHours) : '');
  const [needsReservation, setNeedsReservation] = useState(loc.needsReservation);
  const [reservationDone, setReservationDone] = useState(loc.reservationDone);
  const [notes, setNotes] = useState(loc.notes ?? '');
  const [dayLabel, setDayLabel] = useState(loc.dayLabel ?? '');

  const updateMutation = useMutation({
    mutationFn: () => updateLocation(loc.id, {
      priority,
      type,
      visitDate: visitDate || undefined,
      clearVisitDate: !visitDate,
      visitTime: visitTime || undefined,
      clearVisitTime: !visitTime,
      durationHours: durationHours ? parseFloat(durationHours) : undefined,
      clearDurationHours: !durationHours,
      needsReservation,
      reservationDone,
      notes: notes || undefined,
      clearNotes: !notes,
      dayLabel: dayLabel || undefined,
      clearDayLabel: !dayLabel,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations', groupId] });
      toast.success('Local atualizado!');
      onClose();
    },
    onError: () => toast.error('Erro ao atualizar local.')
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="font-bold text-gray-800 truncate">Editar Local</h2>
            <p className="text-xs text-gray-400 truncate">{loc.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={20} /></button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
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
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={needsReservation}
                onChange={e => {
                  setNeedsReservation(e.target.checked);
                  if (!e.target.checked) setReservationDone(false);
                }} />
              <span className="text-sm text-gray-700">Precisa de reserva/agendamento</span>
            </label>
            {needsReservation && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-green-600" checked={reservationDone}
                  onChange={e => setReservationDone(e.target.checked)} />
                <span className="text-sm text-gray-700">Já reservado</span>
              </label>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
            <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={2} placeholder="Alguma observação..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Save size={14} /> {updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

