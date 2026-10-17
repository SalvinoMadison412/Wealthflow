import { containsPattern } from './likePattern';

test('wraps in % and trims', () => {
  expect(containsPattern('  swig ')).toBe('%swig%');
});

test('escapes LIKE wildcards and the escape character', () => {
  expect(containsPattern('50%_off\\')).toBe('%50\\%\\_off\\\\%');
});
