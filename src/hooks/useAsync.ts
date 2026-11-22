import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from 'expo-router';
import { useUi } from '../stores/ui';

/**
 * Runs a loader when the screen is focused and again whenever app data changes while focused.
 * Screens in the background (other tabs, screens under a pushed screen) do NOT reload — less work, less memory.
 * Keeps the previous value while reloading.
 */
export function useQuery<T>(loader: () => Promise<T>, deps: any[] = []): { data: T | undefined; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const version = useUi((s) => s.dataVersion);
  const focused = useIsFocused();
  const seq = useRef(0);
  const run = useCallback(() => {
    const id = ++seq.current;
    setLoading(true);
    loader().then((d) => { if (id === seq.current) { setData(d); setLoading(false); } }).catch(() => { if (id === seq.current) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { if (focused) run(); }, [run, version, focused]);
  return { data, loading, reload: run };
}
