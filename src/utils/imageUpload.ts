export async function readImageFileAsDataUrl(
  file: File,
  options?: { maxSizeMB?: number }
): Promise<string> {
  const maxSizeBytes = (options?.maxSizeMB ?? 2) * 1024 * 1024;

  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berupa gambar.');
  }

  if (file.size > maxSizeBytes) {
    throw new Error(`Ukuran gambar maksimal ${options?.maxSizeMB ?? 2} MB.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Gagal membaca file gambar.'));
    };

    reader.onerror = () => {
      reject(new Error('Gagal mengunggah gambar.'));
    };

    reader.readAsDataURL(file);
  });
}
