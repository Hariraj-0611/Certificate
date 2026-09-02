/**
 * Helper module for instant (1ms) client-side certificate generation & background sync.
 */

export const generateInstantCertId = () => {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `HAD-${year}-${code}`;
};

export const formatDateString = (dateStr) => {
  if (!dateStr) return new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
  const clean = String(dateStr).trim();
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD -> DD/MM/YYYY
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
  }
  return clean;
};

export const buildOptimisticResult = ({
  cert_type,
  name,
  email = '',
  domain = 'Full Stack Development',
  start_date = '',
  end_date = '',
  issue_date = '',
  cert_id = '',
  qr_link = '',
  extra_field = '',
  working_hours = '10:00 AM - 5:00 PM',
  mode = 'Offline',
  stipend = 'Not Applicable',
}) => {
  const finalCertId = cert_id ? cert_id.trim().toUpperCase() : generateInstantCertId();
  const formattedIssueDate = formatDateString(issue_date);
  const initialStatus = ['offer_letter', 'tech_offer_letter'].includes(cert_type) ? 'pending_approval' : 'generated';

  return {
    success: true,
    cert_id: finalCertId,
    cert_type,
    name: name.trim().toUpperCase(),
    email: email.trim(),
    domain: domain.trim(),
    start_date: start_date.trim(),
    end_date: end_date.trim(),
    issue_date: formattedIssueDate,
    qr_link: qr_link.trim(),
    extra_field,
    working_hours,
    mode,
    stipend,
    pdf_url: `/api/certificates/download/${encodeURIComponent(finalCertId)}/`,
    image_url: `/api/certificates/preview/${encodeURIComponent(finalCertId)}/`,
    status: initialStatus,
    message: cert_type === 'offer_letter' ? 'Offer letter generated and submitted for approval.' : 'Certificate generated successfully.',
    isOptimistic: true
  };
};
