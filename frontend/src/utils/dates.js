const pad = (n) => String(n).padStart(2, '0');

// ISO string -> value for <input type="datetime-local"> (local time)
export const toDateTimeLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ISO string -> value for <input type="date">
export const toDateInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

export const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const isoDaysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export const DATE_PRESETS = [
  { id: 'all', label: 'All time' },
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
  { id: '365', label: 'Last 12 months' },
  { id: 'custom', label: 'Custom range' },
];

// preset id (+ custom from/to) -> API params
export const presetToRange = (preset, from, to) => {
  if (preset === 'all') return {};
  if (preset === 'custom') return { from, to };
  return { from: isoDaysAgo(Number(preset)), to: todayInput() };
};
