import { useEffect, useState } from 'react';
import useDebounce from './useDebounce';

// Local input state that pushes to `onCommit` after the user stops typing.
// Re-syncs when `committed` changes from outside (e.g. "Clear filters").
export default function useDebouncedSearch(committed, onCommit, delay = 350) {
  const [value, setValue] = useState(committed || '');
  const debounced = useDebounce(value, delay);

  useEffect(() => { setValue(committed || ''); }, [committed]);
  useEffect(() => {
    if (debounced !== (committed || '')) onCommit(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return [value, setValue];
}
