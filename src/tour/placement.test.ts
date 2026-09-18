import { cardPlacement } from './placement';

test('targets near the top get the card below them', () => {
  expect(cardPlacement({ x: 0, y: 100, width: 100, height: 40 }, 800)).toBe('below');
});

test('targets in the bottom third get the card above them', () => {
  expect(cardPlacement({ x: 0, y: 700, width: 100, height: 40 }, 800)).toBe('above');
});

test('the two-thirds line is the boundary', () => {
  expect(cardPlacement({ x: 0, y: 513, width: 0, height: 40 }, 800)).toBe('below'); // centre 533 = 2/3
  expect(cardPlacement({ x: 0, y: 514, width: 0, height: 40 }, 800)).toBe('above');
});
