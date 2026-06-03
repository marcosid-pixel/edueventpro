import { useState, useEffect, useCallback } from 'react';

// Simple global cache to prevent redundant simultaneous fetches
const activeFetches: Record<string, Promise<any> | null> = {};

export function useRealtimeCollection<T>(collectionPath: string, _constraints: any[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (isAutoPoll = false) => {
    // If it's an auto-poll and the page is hidden, don't fetch
    if (isAutoPoll && document.hidden) return;

    try {
      // Basic request deduplication: if there's already a fetch for this path, reuse it
      if (activeFetches[collectionPath]) {
        const result = await activeFetches[collectionPath];
        setData(result);
        setLoading(false);
        return;
      }

      const fetchPromise = fetch(`/api/${collectionPath}`).then(res => {
        if (!res.ok) throw new Error(`Error: ${res.statusText}`);
        return res.json();
      });

      activeFetches[collectionPath] = fetchPromise;
      const result = await fetchPromise;
      activeFetches[collectionPath] = null;

      setData(result);
      setLoading(false);
    } catch (err) {
      activeFetches[collectionPath] = null;
      console.error(`Error fetching collection ${collectionPath}:`, err);
      setError(err as Error);
      setLoading(false);
    }
  }, [collectionPath]);

  useEffect(() => {
    fetchData();
    // Poll every 10 seconds (optimized from 5s)
    const interval = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refresh: () => fetchData() };
}
