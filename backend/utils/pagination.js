// Helpers for list endpoints: ?page=&limit=&sort=field:asc|desc
exports.getPagination = (query, { defaultLimit = 10, maxLimit = 100 } = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

exports.getSort = (sortParam, allowed, fallback = { createdAt: -1 }) => {
  if (!sortParam) return fallback;
  const [field, dir] = String(sortParam).split(':');
  if (!allowed.includes(field)) return fallback;
  return { [field]: dir === 'asc' ? 1 : -1 };
};

exports.paginatedResponse = (items, total, { page, limit }) => ({
  items,
  pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
});

// Escape user input before using it inside a RegExp (search boxes).
exports.escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
