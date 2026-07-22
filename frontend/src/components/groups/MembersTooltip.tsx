import { useState } from 'react';
import { Users, Crown } from 'lucide-react';
import type { GroupMember } from '../../types';

interface MembersTooltipProps {
  memberCount: number;
  members?: GroupMember[];
}

export default function MembersTooltip({ memberCount, members = [] }: MembersTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="text-xs text-gray-400 flex items-center gap-1 hover:text-indigo-600 transition"
      >
        <Users size={11} /> {memberCount} {memberCount === 1 ? 'membro' : 'membros'}
      </button>

      {open && members && members.length > 0 && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute z-30 bottom-full left-0 mb-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1.5 text-left"
        >
          <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Membros do grupo
          </p>
          <ul className="max-h-48 overflow-y-auto">
            {members.map(m => (
              <li key={m.id} className="px-3 py-1.5 hover:bg-gray-50">
                <p className="text-xs font-medium text-gray-700 flex items-center gap-1 truncate">
                  {m.role === 'owner' && <Crown size={10} className="text-amber-500 flex-shrink-0" />}
                  <span className="truncate">{m.name}</span>
                </p>
                <p className="text-[11px] text-gray-400 truncate">{m.email}</p>
              </li>
            ))}
          </ul>
          <div className="absolute left-4 top-full w-2 h-2 bg-white border-b border-r border-gray-200 rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}


