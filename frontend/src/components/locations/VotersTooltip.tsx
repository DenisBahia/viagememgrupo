import { useState } from 'react';
import type { ReactNode } from 'react';

interface VotersTooltipProps {
  names: string[];
  children: ReactNode;
  align?: 'left' | 'right';
}

/**
 * Wraps a trigger element (e.g. a like/dislike button) and shows a small
 * tooltip on hover/tap listing the names of the people who voted.
 */
export default function VotersTooltip({ names, children, align = 'left' }: VotersTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => names.length > 0 && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}

      {open && names.length > 0 && (
        <div
          onClick={e => e.stopPropagation()}
          className={`absolute z-40 bottom-full mb-2 min-w-[9rem] max-w-[12rem] bg-gray-800 text-white rounded-lg shadow-lg px-2.5 py-2 text-left ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <ul className="max-h-32 overflow-y-auto space-y-0.5">
            {names.map((name, i) => (
              <li key={`${name}-${i}`} className="text-[11px] leading-snug truncate">{name}</li>
            ))}
          </ul>
          <div
            className={`absolute top-full w-2 h-2 bg-gray-800 rotate-45 -mt-1 ${align === 'right' ? 'right-3' : 'left-3'}`}
          />
        </div>
      )}
    </div>
  );
}


