import { mkdirSync, writeFileSync } from 'fs';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

// shortcut: local disk storage for the dev slice; move to private object
// storage (signed URLs, virus scan) before handling real member data.
export const UPLOADS_DIR = './uploads';

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export const ALLOWED_UPLOAD_MIMETYPES = 'application/pdf|image/jpeg|image/png';

// Memory storage on purpose: ParseFilePipe inspects magic bytes via the
// `file-type` package, which needs `file.buffer` (disk storage drops it).
// Multer's `limits` caps the in-memory size up front; the file is written to
// disk by the service only after validation + authorization pass.
export const multerMemoryOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
};

export function persistUpload(file: Express.Multer.File): string {
  const storedName = `${uuidv4()}${extname(file.originalname).toLowerCase()}`;
  mkdirSync(UPLOADS_DIR, { recursive: true });
  writeFileSync(`${UPLOADS_DIR}/${storedName}`, file.buffer);
  return storedName;
}
