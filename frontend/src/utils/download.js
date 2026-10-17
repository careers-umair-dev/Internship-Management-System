// Saves a Blob (e.g. CSV from the API) as a file download.
export const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const filenameFromResponse = (res, fallback) => {
  const m = /filename="?([^";]+)"?/i.exec(res.headers?.['content-disposition'] || '');
  return m ? m[1] : fallback;
};
