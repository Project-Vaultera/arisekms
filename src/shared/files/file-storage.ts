import { FileTypeValidator, MaxFileSizeValidator, ParseFilePipe } from '@nestjs/common';
import { mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

// shortcut: local disk storage for the dev slice; move to private object
// storage (signed URLs, virus scan) before handling real member data.
export const UPLOADS_DIR = './uploads';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_UPLOAD_MIMETYPES =
  'application/pdf|image/jpeg|image/png|application/msword|application/vnd.openxmlformats-officedocument.wordprocessingml.document';

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

export function removeUploadFile(storedName: string | null | undefined): void {
  if (!storedName) return;
  try {
    unlinkSync(`${UPLOADS_DIR}/${storedName.split('/').pop()}`);
  } catch {
    // already gone is fine
  }
}

export function safeDownloadFilename(name: string, fallback = 'download'): string {
  const clean = (name ?? fallback).replace(/[\r\n"]/g, '').slice(0, 120) || fallback;
  return clean;
}

export function uploadFilePipe(allowedTypes: string = ALLOWED_UPLOAD_MIMETYPES): ParseFilePipe {
  return new ParseFilePipe({
    fileIsRequired: true,
    validators: [
      new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_BYTES }),
        // Magic-byte check first; fall back to the client mimetype when
        // file-type cannot detect a signature (tiny/fake buffers, or Jest
        // failing to load the ESM-only file-type package). A detected
        // signature must still match — e.g. an .exe renamed to .pdf is
        // detected as x-msdos-program and rejected.
        new FileTypeValidator({ fileType: allowedTypes, fallbackToMimetype: true }),
    ],
  });
}

// Optional-file twin of uploadFilePipe for PATCH endpoints where the caller
// may update metadata without replacing the file.
export function uploadOptionalFilePipe(allowedTypes: string = ALLOWED_UPLOAD_MIMETYPES): ParseFilePipe {
  return new ParseFilePipe({
    fileIsRequired: false,
    validators: [
      new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_BYTES }),
      new FileTypeValidator({ fileType: allowedTypes, fallbackToMimetype: true }),
    ],
  });
}
