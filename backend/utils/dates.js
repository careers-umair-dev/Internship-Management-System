const ApiError = require('./ApiError');

const parse = (v, label) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw ApiError.badRequest(`Invalid ${label} date`);
  return d;
};

// ?from=YYYY-MM-DD&to=YYYY-MM-DD  (`to` is inclusive of the whole day)
exports.parseRange = (query) => {
  const from = parse(query.from, 'from');
  const to = parse(query.to, 'to');
  if (to && String(query.to).length <= 10) to.setUTCHours(23, 59, 59, 999);
  if (from && to && from > to) throw ApiError.badRequest('"from" date must be before "to" date');
  return { from, to };
};

exports.daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
