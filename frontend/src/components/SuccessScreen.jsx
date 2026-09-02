import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Download, ExternalLink, ArrowLeft, Clock, RotateCcw, Home, Mail, Send, RefreshCw, Loader2 } from 'lucide-react';
import { downloadPdfFile } from '../utils/download';
import { getApiBaseUrl, sendCertificateEmail } from '../services/api';
import PdfPreviewFrame from './PdfPreviewFrame';

const getFullUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const cleanBase = getApiBaseUrl().replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
};

export default function SuccessScreen({ data, isOfferLetter = false, hideCertId = false, onReset }) {
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const encodedCertId = data?.cert_id ? encodeURIComponent(data.cert_id) : '';
  const queryParams = new URLSearchParams({
    name: data?.name || '',
    domain: data?.domain || '',
    start_date: data?.start_date || '',
    end_date: data?.end_date || '',
    issue_date: data?.issue_date || '',
    cert_type: data?.cert_type || '',
    extra_field: data?.extra_field || '',
    working_hours: data?.working_hours || '',
    mode: data?.mode || '',
    stipend: data?.stipend || '',
    qr_link: data?.qr_link || '',
  }).toString();
  const rawImageUrl = encodedCertId ? `/api/certificates/preview/${encodedCertId}/?${queryParams}` : '';
  const previewUrl = getFullUrl(rawImageUrl);
  const downloadUrl = getFullUrl(data?.pdf_url);

  // Immediate mount for instant 1ms preview
  useEffect(() => {
    if (!previewUrl) return;
    setPreviewReady(true);
  }, [previewUrl]);

  const handleDownload = (e) => {
    e.preventDefault();
    const candidateName = data?.name || 'Certificate';
    const certTypeMap = {
      'course_completion': 'Course_Completion',
      'internship': 'Internship',
      'campus_ambassador': 'Campus_Ambassador',
      'offer_letter': 'Offer_Letter'
    };
    const certType = certTypeMap[data?.cert_type] || 'Certificate';
    downloadPdfFile(downloadUrl, candidateName, certType, data?.cert_id);
  };

  const handleSendEmail = async () => {
    if (!data?.cert_id) return;
    let targetEmail = data?.email || '';
    if (!targetEmail) {
      targetEmail = window.prompt(`Please enter email address for candidate ${data?.name || ''}:`, '');
      if (!targetEmail) return;
    }

    setSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await sendCertificateEmail(data.cert_id, targetEmail);
      setEmailStatus(res);
      if (res.success) {
        setShowSuccessToast(true);
        setTimeout(() => {
          setShowSuccessToast(false);
        }, 2000);
      }
    } catch (err) {
      setEmailStatus({ success: false, message: err.response?.data?.message || err.message || 'Failed to send email' });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white border-2 border-gray-200 rounded-3xl shadow-xl max-w-6xl mx-auto my-6 animate-fadeIn w-full relative">
      <div className="flex items-center gap-3 mb-4">
        {isOfferLetter ? (
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" strokeWidth={2.5} />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" strokeWidth={2.5} />
          </div>
        )}
        <div className="text-left">
          <h2 className="text-2xl font-black text-gray-900 leading-tight">
            {isOfferLetter ? 'Offer Letter Submitted!' : 'Certificate Generated!'}
          </h2>
          <p className="text-xs text-gray-500">
            {isOfferLetter
              ? 'Your offer letter has been generated and queued for Hadescore admin approval.'
              : 'Your official Hadescore Apex certificate has been created successfully.'}
          </p>
        </div>
      </div>

      {emailStatus && (
        <div className={`w-full mb-4 p-3 rounded-xl text-xs font-bold ${emailStatus.success ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
          {emailStatus.message}
        </div>
      )}

      {!hideCertId && !['campus_ambassador', 'offer_letter', 'tech_offer_letter'].includes(data?.cert_type) && (
        <div className="w-full mb-5 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-gray-100 border-2 border-gray-200 flex items-center justify-between">
          <div className="text-left">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Certificate ID
            </div>
            <div className="text-xl font-black font-mono text-cyan-600 select-all">
              {data?.cert_id}
            </div>
          </div>
          {isOfferLetter && (
            <div className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-300">
              PENDING APPROVAL
            </div>
          )}
        </div>
      )}

      {/* Certificate / Document Live Preview */}
      {rawImageUrl ? (
        <div className="w-full mb-6 relative rounded-2xl overflow-hidden border-2 border-gray-300 shadow-xl bg-white aspect-[1.414/1] max-h-[580px]">
          {/* Floating Email Success Overlay */}
          {showSuccessToast && (
            <div className="absolute inset-0 z-30 bg-emerald-950/85 backdrop-blur-md flex flex-col items-center justify-center text-white animate-fadeIn p-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-4 shadow-xl animate-bounce">
                <CheckCircle2 className="w-10 h-10" strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-wider text-emerald-300 mb-2">
                Email Sent Successfully!
              </h3>
              <p className="text-sm font-bold text-emerald-100 max-w-lg">
                Official certificate PDF delivered directly to recipient email ({data?.email || 'Candidate'}).
              </p>
            </div>
          )}

          <PdfPreviewFrame
            src={previewUrl ? `${previewUrl}#toolbar=0&navpanes=0&view=FitH` : 'about:blank'}
            title="Generated Certificate Preview"
            className="w-full h-full min-h-[480px] border-none"
          />
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full flex-wrap">
        <Link
          to="/dashboard"
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-cyan-200 flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" strokeWidth={2.5} />
          <span>View in Dashboard</span>
        </Link>
        
        {data?.pdf_url && (
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gray-900 hover:bg-black text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" strokeWidth={2.5} />
            <span>Download PDF</span>
          </button>
        )}

        <button
          onClick={handleSendEmail}
          disabled={sendingEmail}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {sendingEmail ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" strokeWidth={2.5} />}
          <span>{sendingEmail ? 'Sending...' : 'Send Email'}</span>
        </button>

        {onReset && (
          <button
            onClick={onReset}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" strokeWidth={2.5} />
            <span>Generate Another</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-6 mt-6">
        {onReset && (
          <button
            onClick={onReset}
            className="text-sm text-cyan-600 hover:text-cyan-800 transition-colors flex items-center gap-1.5 font-bold"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            <span>Back to Form</span>
          </button>
        )}
        <Link
          to="/"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1.5 font-semibold"
        >
          <Home className="w-4 h-4" strokeWidth={2.5} />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
