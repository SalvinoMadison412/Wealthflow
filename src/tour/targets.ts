import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';

// Tiny registry of on-screen rects for the spotlight tour. Each target
// measures itself in window coordinates on layout; the overlay reads the
// current rect and re-renders when any target reports.
export type Rect = { x: number; y: number; width: number; height: number };
export type TargetName = 'greeting' | 'fab' | 'transactionsTab' | 'rulesTab' | 'menu';

const rects = new Map<TargetName, Rect>();
const listeners = new Set<() => void>();
const measurers = new Map<TargetName, () => void>();

export function getTargetRect(name: TargetName): Rect | null {
  return rects.get(name) ?? null;
}

export function subscribeTargets(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Called by the overlay right before it shows, so rects are fresh after a
// theme switch or rotation.
export function remeasureAll(): void {
  measurers.forEach((measure) => measure());
}

export function useTourTarget(name: TargetName) {
  const ref = useRef<View>(null);
  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (!width && !height) return;
      rects.set(name, { x, y, width, height });
      listeners.forEach((l) => l());
    });
  }, [name]);
  useEffect(() => {
    measurers.set(name, measure);
    return () => {
      measurers.delete(name);
      rects.delete(name);
    };
  }, [name, measure]);
  return { ref, onLayout: measure };
}
