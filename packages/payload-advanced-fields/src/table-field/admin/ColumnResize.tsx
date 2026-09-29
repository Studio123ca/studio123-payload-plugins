'use client';

import { useRef } from 'react';

export function ColumnResize({
  label,
  width,
  onResize,
}: {
  label: string;
  width: number;
  onResize: (width: number, commit: boolean) => void;
}) {
  const drag = useRef<{ x: number; original: number } | null>(null);
  const clamp = (value: number) => Math.max(100, Math.min(600, Math.round(value)));
  return (
    <span
      role="separator"
      aria-label={`Resize ${label}`}
      aria-orientation="vertical"
      tabIndex={0}
      aria-valuemin={100}
      aria-valuemax={600}
      aria-valuenow={width}
      className="advanced-table__resize"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        drag.current = {
          x: event.currentTarget.parentElement!.getBoundingClientRect().left,
          original: width,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (drag.current) onResize(clamp(event.clientX - drag.current.x), false);
      }}
      onPointerUp={(event) => {
        if (!drag.current) return;
        const next = clamp(event.clientX - drag.current.x);
        drag.current = null;
        onResize(next, true);
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onLostPointerCapture={() => {
        if (drag.current) {
          onResize(drag.current.original, false);
          drag.current = null;
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          event.stopPropagation();
          onResize(clamp(width + (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 50 : 10)), true);
        }
      }}
    />
  );
}
