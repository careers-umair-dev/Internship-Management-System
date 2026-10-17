const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Removes files multer already saved when the request later fails validation.
const cleanupFiles = (req) => {
  const files = [...(req.files || []), ...(req.file ? [req.file] : [])];
  files.forEach((f) => fs.unlink(path.resolve(f.path), () => {}));
};

module.exports = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  cleanupFiles(req);
  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(ApiError.badRequest(details[0].message, details));
};
