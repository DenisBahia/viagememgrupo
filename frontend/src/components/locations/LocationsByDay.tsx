import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLocation } from '../../services/api';
import type { Location } from '../../types';
import LocationCard from './LocationCard';
import toast from 'react-hot-toast';
import { MapPin, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const NO_DAY = '__sem_dia__';

interface LocationsByDayProps {
  locations: Location[];
  groupId: string;
  isLoading: boolean;
}

function DraggableCard({ loc, groupId }: { loc: Location; groupId: string }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: loc.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 30 }
    : undefined;

  return (
    <div ref={setNodeRef} style={style}>
      <LocationCard
        location={loc}
        groupId={groupId}
        isDragging={isDragging}
        dragHandleProps={{ attributes, listeners, setActivatorNodeRef }}
      />
    </div>
  );
}

function DayGroup({ dayKey, label, locations, groupId }: { dayKey: string; label: string; locations: Location[]; groupId: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey });
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 transition ${isOver ? 'border-indigo-400 bg-indigo-50' : 'border-transparent'}`}
    >
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-1 py-1.5 text-left"
      >
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
          {label}
          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
            {locations.length}
          </span>
        </span>
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
      </button>
      {!collapsed && (
        <div className="space-y-2 pb-2 min-h-[8px]">
          {locations.length === 0 ? (
            <p className="text-xs text-gray-300 italic px-1 py-2">Arraste locais para aqui</p>
          ) : (
            locations.map(loc => <DraggableCard key={loc.id} loc={loc} groupId={groupId} />)
          )}
        </div>
      )}
    </div>
  );
}

export default function LocationsByDay({ locations, groupId, isLoading }: LocationsByDayProps) {
  const qc = useQueryClient();

  const moveMutation = useMutation({
    mutationFn: ({ id, dayLabel }: { id: string; dayLabel: string | null }) =>
      updateLocation(id, dayLabel ? { dayLabel } : { clearDayLabel: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations', groupId] });
    },
    onError: () => toast.error('Erro ao mover local.')
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Sort day labels alphabetically; "sem dia" group always last.
  const dayOrder: string[] = [];
  for (const l of locations) {
    const key = l.dayLabel || NO_DAY;
    if (key !== NO_DAY && !dayOrder.includes(key)) dayOrder.push(key);
  }
  dayOrder.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true }));
  const hasNoDay = locations.some(l => !l.dayLabel);

  const groups = dayOrder.map(day => ({
    key: day,
    label: day,
    items: locations.filter(l => l.dayLabel === day),
  }));
  if (hasNoDay || groups.length === 0) {
    groups.push({
      key: NO_DAY,
      label: 'Sem dia definido',
      items: locations.filter(l => !l.dayLabel),
    });
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const loc = locations.find(l => l.id === active.id);
    if (!loc) return;
    const targetDay = over.id as string;
    const currentDay = loc.dayLabel || NO_DAY;
    if (targetDay === currentDay) return;
    moveMutation.mutate({ id: loc.id, dayLabel: targetDay === NO_DAY ? null : targetDay });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-400 text-sm">Carregando...</div>;
  }

  if (locations.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin size={36} className="text-gray-200 mx-auto mb-2" />
        <p className="text-gray-400 text-sm">Nenhum local ainda</p>
        <p className="text-gray-300 text-xs mt-1">Clique em "+ Adicionar" para começar</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-3">
        {groups.map(g => (
          <DayGroup key={g.key} dayKey={g.key} label={g.label} locations={g.items} groupId={groupId} />
        ))}
      </div>
    </DndContext>
  );
}


