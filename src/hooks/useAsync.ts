import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useUi } from '../stores/ui';

/** Runs a loader on focus and whenever app data changes. Keeps the previous value while reloading. */
export function useQuery<T>(loader: () => Promise<T>, deps: any[] = []): { data: T | undefined; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const version = useUi((s) => s.dataVersion);
  const seq = useRef(0);
  const run = useCallback(() => {
    const id = ++seq.current;
    setLoading(true);
    loader().then((d) => { if (id === seq.current) { setData(d); setLoading(false); } }).catch(() => { if (id === seq.current) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run, version]);
  useFocusEffect(useCallback(() => { run(); }, [run]));
  return { data, loading, reload: run };
}
