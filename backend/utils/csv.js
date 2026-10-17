// Minimal CSV builder with escaping and spreadsheet-formula-injection protection.
const cell = (v) => {
  if (v === null || v === undefined) return '';
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise =cmd() style payloads
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
};

// columns: [{ header: 'Name', key: 'name' } | { header, value: (row) => ... }]
exports.toCSV = (columns, rows) =>
  [columns.map((c) => cell(c.header)).join(','),
    ...rows.map((r) => columns.map((c) => cell(typeof c.value === 'function' ? c.value(r) : r[c.key])).join(','))].join('\r\n');

exports.sendCSV = (res, filename, csv) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`\uFEFF${csv}`); // BOM so Excel opens UTF-8 correctly
};
