import { Rect } from './targets';

// Pure — the card goes under the spotlight unless the target sits in the
// bottom third of the screen (tab bar, FAB), then above it.
export function cardPlacement(target: Rect, screenHeight: number): 'above' | 'below' {
  const centerY = target.y + target.height / 2;
  return centerY > screenHeight * (2 / 3) ? 'above' : 'below';
}
