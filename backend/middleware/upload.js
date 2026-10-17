const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

const os = require('os');

// Vercel's filesystem is read-only except /tmp (temporary, not persistent).
const UPLOAD_DIR = process.env.VERCEL ? path.join(os.tmpdir(), 'uploads') : path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.csv', '.zip',
  '.png', '.jpg', '.jpeg', '.gif', '.webp'];

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return cb(ApiError.badRequest(`File type ${ext || 'unknown'} is not allowed`));
    cb(null, true);
  },
});

// Maps multer files to the shape stored on Task/Submission documents.
upload.toFileDocs = (files = []) =>
  files.map((f) => ({ name: f.originalname, url: `/uploads/${f.filename}`, size: f.size, mimeType: f.mimetype }));

upload.UPLOAD_DIR = UPLOAD_DIR;

module.exports = upload;
