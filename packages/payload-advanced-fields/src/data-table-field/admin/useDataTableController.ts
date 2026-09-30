'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { DataTableValue } from '../shared/types.js';

type Props = {
  value: DataTableValue | null;
  readOnly: boolean;
  onChange: (value: DataTableValue | null) => void;
};

export function useDataTableController({ value, readOnly, onChange }: Props) {
  const lastCommitted = useRef(value);
  const history = useRef<{ undo: (DataTableValue | null)[]; redo: (DataTableValue | null)[] }>({ undo: [], redo: [] });
  useEffect(() => {
    if (value !== lastCommitted.current) {
      lastCommitted.current = value;
      history.current = { undo: [], redo: [] };
    }
  }, [value]);

  const commit = useCallback(
    (next: DataTableValue | null) => {
      if (readOnly || next === value) return;
      history.current.undo = [...history.current.undo.slice(-49), value];
      history.current.redo = [];
      lastCommitted.current = next;
      onChange(next);
    },
    [onChange, readOnly, value],
  );

  const travel = useCallback(
    (direction: 'undo' | 'redo') => {
      if (readOnly || !history.current[direction].length) return;
      const previous = history.current[direction].pop() ?? null;
      history.current[direction === 'undo' ? 'redo' : 'undo'].push(value);
      lastCommitted.current = previous;
      onChange(previous);
    },
    [onChange, readOnly, value],
  );

  return {
    commit,
    undo: () => travel('undo'),
    redo: () => travel('redo'),
    canUndo: history.current.undo.length > 0,
    canRedo: history.current.redo.length > 0,
  };
}
