import { DndContext, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLocation, reorderLocations } from '../../services/api';
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

const dayKeyOf = (loc: Location) => loc.dayLabel || NO_DAY;

function SortableCard({ loc, groupId }: { loc: Location; groupId: string }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: loc.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
  };

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
        <SortableContext items={locations.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 pb-2 min-h-[8px]">
            {locations.length === 0 ? (
              <p className="text-xs text-gray-300 italic px-1 py-2">Arraste locais para aqui</p>
            ) : (
              locations.map(loc => <SortableCard key={loc.id} loc={loc} groupId={groupId} />)
            )}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

export default function LocationsByDay({ locations, groupId, isLoading }: LocationsByDayProps) {
  const qc = useQueryClient();

  const moveMutation = useMutation({
    mutationFn: ({ id, dayLabel }: { id: string; dayLabel: string | null }) =>
      updateLocation(id, dayLabel ? { dayLabel } : { clearDayLabel: true }),
    onError: () => toast.error('Erro ao mover local.'),
  });

  const reorderMutation = useMutation({
    mutationFn: ({ dayLabel, orderedIds }: { dayLabel: string | null; orderedIds: string[] }) =>
      reorderLocations(groupId, dayLabel, orderedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations', groupId] }),
    onError: () => toast.error('Erro ao reordenar locais.'),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Sort day labels alphabetically; "sem dia" group always last.
  const dayOrder: string[] = [];
  for (const l of locations) {
    const key = dayKeyOf(l);
    if (key !== NO_DAY && !dayOrder.includes(key)) dayOrder.push(key);
  }
  dayOrder.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true }));
  const hasNoDay = locations.some(l => !l.dayLabel);

  const groups = dayOrder.map(day => ({
    key: day,
    label: day,
    items: locations.filter(l => dayKeyOf(l) === day),
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
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeLoc = locations.find(l => l.id === activeId);
    if (!activeLoc) return;

    const activeDay = dayKeyOf(activeLoc);
    const overIsContainer = groups.some(g => g.key === overId);
    const overLoc = overIsContainer ? undefined : locations.find(l => l.id === overId);
    const targetDay = overIsContainer ? overId : (overLoc ? dayKeyOf(overLoc) : activeDay);
    const targetDayLabel = targetDay === NO_DAY ? null : targetDay;
    const targetItems = groups.find(g => g.key === targetDay)?.items ?? [];

    if (targetDay === activeDay) {
      // Reorder within the same day.
      const ids = targetItems.map(l => l.id);
      const from = ids.indexOf(activeId);
      const to = overLoc ? ids.indexOf(overId) : ids.length - 1;
      if (from === -1 || to === -1 || from === to) return;
      const newOrder = arrayMove(ids, from, to);
      reorderMutation.mutate({ dayLabel: targetDayLabel, orderedIds: newOrder });
    } else {
      // Move to a different day, inserting it at the drop position, then persist that day's order.
      const ids = targetItems.map(l => l.id).filter(id => id !== activeId);
      const insertIndex = overLoc ? ids.indexOf(overId) : ids.length;
      ids.splice(insertIndex === -1 ? ids.length : insertIndex, 0, activeId);
      moveMutation.mutate({ id: activeId, dayLabel: targetDayLabel }, {
        onSuccess: () => reorderMutation.mutate({ dayLabel: targetDayLabel, orderedIds: ids }),
      });
    }
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




