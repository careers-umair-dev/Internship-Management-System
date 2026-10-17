import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

// Keeps filter / sort / page state in the URL (shareable, survives refresh, back button works).
// `defaults` values are omitted from the URL. Changing any filter resets `page` unless set explicitly.
export default function useQueryState(defaults = {}) {
  const [sp, setSp] = useSearchParams();
  const defaultsRef = useRef(defaults);

  const params = useMemo(() => {
    const out = { ...defaultsRef.current };
    sp.forEach((v, k) => { out[k] = v; });
    return out;
  }, [sp]);

  const setParams = useCallback((patch) => {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined || v === defaultsRef.current[k]) next.delete(k);
        else next.set(k, String(v));
      });
      if (!('page' in patch)) next.delete('page');
      return next;
    }, { replace: true });
  }, [setSp]);

  const clear = useCallback(() => setSp(new URLSearchParams(), { replace: true }), [setSp]);
  return [params, setParams, clear];
}
