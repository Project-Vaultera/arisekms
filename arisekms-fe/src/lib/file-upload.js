export const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
export const ACCEPT_ATTR = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

// Returns { title, description } when the file is invalid, else null.
export function validateUploadFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return {
      title: 'Unsupported file type',
      description: `Supports ${ACCEPTED_EXTENSIONS.join(', ')}.`,
    };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { title: 'File too large', description: 'Each file must be 100MB or less.' };
  }
  return null;
}

export function formatBytes(bytes) {
  if (!bytes) return '—';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  if (i <= 0) return `${bytes} B`;
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}
