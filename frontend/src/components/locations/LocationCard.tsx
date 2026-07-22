import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLocation, deleteLocation } from '../../services/api';
import type { Location, Priority, LocationType } from '../../types';
import { PRIORITY_CONFIG, TYPE_CONFIG } from '../ui/constants';
import toast from 'react-hot-toast';
import { Star, Clock, Calendar, ExternalLink, Trash2, ChevronDown, Check } from 'lucide-react';

interface LocationCardProps {
  location: Location;
  groupId: string;
}

export default function LocationCard({ location: loc, groupId }: LocationCardProps) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Location>) => updateLocation(loc.id, data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations', groupId] }),
    onError: () => toast.error('Erro ao atualizar.')
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLocation(loc.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations', groupId] });
      toast.success('Local removido.');
    },
    onError: () => toast.error('Erro ao remover.')
  });

  const pCfg = PRIORITY_CONFIG[loc.priority];
  const tCfg = TYPE_CONFIG[loc.type];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition">
      <div className="p-3">
        <div className="flex items-start gap-2">
          <span className="text-xl flex-shrink-0 mt-0.5">{tCfg.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <h3 className="font-semibold text-gray-800 text-sm leading-tight truncate">{loc.name}</h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => { if (confirm('Remover este local?')) deleteMutation.mutate(); }}
                  className="text-gray-300 hover:text-red-500 p-0.5 transition"
                >
                  <Trash2 size={13} />
                </button>
                <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 p-0.5">
                  <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
            <p className="text-gray-400 text-xs truncate">{loc.address}</p>

            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${pCfg.color}`}>
                {pCfg.label}
              </span>
              {loc.googleRating && (
                <span className="text-xs text-orange-600 flex items-center gap-0.5">
                  <Star size={9} fill="currentColor" /> {loc.googleRating.toFixed(1)}
                </span>
              )}
              {loc.dayLabel && (
                <span className="text-xs text-indigo-600 font-medium">{loc.dayLabel}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1">
              {loc.visitDate && (
                <span className="text-xs text-gray-500 flex items-center gap-0.5">
                  <Calendar size={9} /> {new Date(loc.visitDate).toLocaleDateString('pt-BR')}
                  {loc.visitTime && ` ${loc.visitTime}`}
                </span>
              )}
              {loc.durationHours && (
                <span className="text-xs text-gray-500 flex items-center gap-0.5">
                  <Clock size={9} /> {loc.durationHours}h
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Reservation badges */}
        {loc.needsReservation && (
          <div className="flex items-center gap-1.5 mt-2 ml-8">
            <span className={`text-xs font-medium ${loc.reservationDone ? 'text-green-600' : 'text-orange-500'}`}>
              {loc.reservationDone ? '✅ Reservado' : '📅 Precisa reservar'}
            </span>
            {!loc.reservationDone && (
              <button
                onClick={() => updateMutation.mutate({ reservationDone: true })}
                className="text-xs text-green-600 hover:underline flex items-center gap-0.5"
              >
                <Check size={10} /> Marcar feito
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-gray-100 p-3 bg-gray-50 space-y-2">
          {loc.notes && <p className="text-xs text-gray-600 italic">"{loc.notes}"</p>}
          <p className="text-xs text-gray-400">Adicionado por {loc.addedByName}</p>

          {/* Quick priority change */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Alterar prioridade:</p>
            <div className="flex gap-1">
              {(Object.entries(PRIORITY_CONFIG) as [Priority, (typeof PRIORITY_CONFIG)[Priority]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => updateMutation.mutate({ priority: key })}
                  className={`flex-1 py-1 text-xs rounded-lg border ${loc.priority === key ? `border-indigo-400 ${cfg.color}` : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick type change */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Tipo:</p>
            <div className="flex flex-wrap gap-1">
              {(Object.entries(TYPE_CONFIG) as [LocationType, (typeof TYPE_CONFIG)[LocationType]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => updateMutation.mutate({ type: key })}
                  className={`py-1 px-2 text-xs rounded-lg border flex items-center gap-0.5 ${loc.type === key ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                >
                  {cfg.emoji} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <a
            href={loc.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
          >
            <ExternalLink size={11} /> Abrir no Google Maps
          </a>
        </div>
      )}
    </div>
  );
}

