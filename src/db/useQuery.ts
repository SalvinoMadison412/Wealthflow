import { useEffect, useState } from 'react';

import { subscribeToChanges } from './db';

// Runs `queryFn` (a synchronous SQLite read) now, and again whenever the
// database changes or `deps` change. `queryFn` itself decides what to read
// — this hook only owns the "when to re-run" part.
export function useQuery<T>(queryFn: () => T, deps: unknown[]): T {
  const [value, setValue] = useState<T>(queryFn);

  useEffect(() => {
    setValue(queryFn());
    return subscribeToChanges(() => setValue(queryFn()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
