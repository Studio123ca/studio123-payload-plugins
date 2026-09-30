'use client';

import { useEffect, type RefObject } from 'react';

/** Keeps every cell in a row in sync while a textarea resize handle is dragged. */
export function useRowSizing(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = root.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observed = new Set<HTMLTextAreaElement>();
    const resize = new ResizeObserver((entries) => {
      for (const { target } of entries) {
        const input = target as HTMLTextAreaElement;
        if (!input.style.height) continue;
        const row = input.closest('tr');
        if (!row) continue;
        const height = `${Math.max(42, Math.round(input.getBoundingClientRect().height))}px`;
        row.style.setProperty('--data-table-row-height', height);
        row.querySelectorAll<HTMLTextAreaElement>('textarea').forEach((cell) => {
          if (cell !== input) cell.style.height = height;
        });
      }
    });
    const scan = () => {
      for (const input of observed) {
        if (!container.contains(input)) {
          resize.unobserve(input);
          observed.delete(input);
        }
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
