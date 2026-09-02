import { getApiBaseUrl } from '../services/api';

export const downloadPdfFile = async (pdfUrl, candidateName = 'Certificate', certType = 'Certificate', certId = null) => {
  if (!pdfUrl && !certId) return;

  try {
    const apiBase = getApiBaseUrl();
    const downloadUrl = certId
      ? `${apiBase}/api/certificates/download/${certId}/`
      : pdfUrl;

    const cleanName = candidateName
      ? candidateName.trim()
          .replace(/[^a-zA-Z0-9\s-_]/g, '')
          .replace(/\s+/g, '_')
          .replace(/_+/g, '_')
      : 'Certificate';

    const filename = `${cleanName}.pdf`;

    // Fetch PDF as Blob to avoid popup tab blocking
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('Download request failed');

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (err) {
    console.error('Download error:', err);
    // Fallback standard link click
    const apiBase = getApiBaseUrl();
    const fallbackUrl = certId ? `${apiBase}/api/certificates/download/${certId}/` : pdfUrl;
    const link = document.createElement('a');
    link.href = fallbackUrl;
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const downloadBulkZipFile = async (certIds, customZipName = 'Certificates_Bulk_Download.zip') => {
  if (!certIds || certIds.length === 0) return;

  try {
    const apiBase = getApiBaseUrl();
    const response = await fetch(`${apiBase}/api/certificates/bulk/download-zip/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cert_ids: certIds }),
    });

    if (!response.ok) throw new Error('Failed to generate ZIP archive');

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = customZipName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (err) {
    console.error('Bulk ZIP download error:', err);
    alert('Failed to download bulk ZIP file. Please try downloading certificates individually.');
  }
};


