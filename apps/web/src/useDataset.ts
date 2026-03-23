import { useState, useEffect } from "react";

interface DatasetState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useDataset<T>(loader: () => Promise<T>): DatasetState<T> {
  const [state, setState] = useState<DatasetState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    loader()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, loading: false, error: String(err) });
      });
    return () => { cancelled = true; };
  }, []); // loader is a stable module-level export

  return state;
}
