'use client';

import { useEffect, type RefObject } from 'react';

/** Native textarea drag handles resize every editable cell in their row. Sizes are session-only. */
export function useRowSizing(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = root.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observed = new Set<HTMLTextAreaElement>();
    const resize = new ResizeObserver((entries) => {
      for (const { target } of entries) {
        const input = target as HTMLTextAreaElement;
        // Browser resize handles set an inline height; ordinary layout changes do not.
        if (!input.style.height) continue;
        const row = input.closest('tr');
        if (!row) continue;
        const height = `${Math.max(42, Math.round(input.getBoundingClientRect().height))}px`;
        if (row.style.getPropertyValue('--table-row-height') === height) continue;
        row.style.setProperty('--table-row-height', height);
        row.querySelectorAll('textarea').forEach((cell) => {
          cell.style.height = height;
        });
      }
    });
    const scan = () => {
      for (const input of observed)
        if (!container.contains(input)) {
          resize.unobserve(input);
          observed.delete(input);
        }
      container.querySelectorAll<HTMLTextAreaElement>('tbody textarea').forEach((input) => {
        if (!observed.has(input)) {
          observed.add(input);
          resize.observe(input);
        }
      });
    };
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(container, { childList: true, subtree: true });
    return () => {
      mutations.disconnect();
      resize.disconnect();
    };
  }, [root]);
}
