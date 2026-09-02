import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getApiBaseUrl, getEmailTemplates, saveEmailTemplate, sendCertificateEmail } from '../services/api';
import { 
  Mail, 
  Save, 
  Send, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  Briefcase, 
  Award, 
  FilePlus, 
  Info,
  RefreshCw,
  Code
} from 'lucide-react';

export default function EmailTemplates() {
  const [activeTab, setActiveTab] = useState('course_completion');
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Test Email state
  const [testCertId, setTestCertId] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const certTypes = [
    { id: 'course_completion', label: 'Course Completion', icon: FileText, color: 'from-cyan-600 to-blue-600' },
    { id: 'internship', label: 'Internship Completion', icon: Briefcase, color: 'from-emerald-600 to-teal-600' },
    { id: 'campus_ambassador', label: 'Campus Ambassador', icon: Award, color: 'from-purple-600 to-indigo-600' },
    { id: 'offer_letter', label: 'Internship Offer Letter', icon: FilePlus, color: 'from-amber-600 to-orange-600' },
    { id: 'tech_offer_letter', label: 'Tech Offer Letter', icon: FilePlus, color: 'from-blue-600 to-cyan-600' }
  ];

  const placeholders = [
    { code: '{name}', desc: 'Candidate Name' },
    { code: '{cert_id}', desc: 'Certificate ID' },
    { code: '{domain}', desc: 'Domain / Position' },
    { code: '{issue_date}', desc: 'Issue Date' },
    { code: '{verify_url}', desc: 'Public Verification Link' },
    { code: '{pdf_url}', desc: 'Direct PDF Download Link' }
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEmailTemplates();
      setTemplates(data.templates || data || {});
    } catch (err) {
      setError('Failed to load email templates from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setTemplates(prev => ({
      ...prev,
      [activeTab]: {
        ...(prev[activeTab] || {}),
        [field]: value
      }
    }));
  };

  const handleInsertPlaceholder = (field, placeholderCode) => {
    const currentVal = templates[activeTab]?.[field] || '';
    handleFieldChange(field, currentVal + ' ' + placeholderCode);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    const currentTpl = templates[activeTab] || {};
    try {
      const res = await saveEmailTemplate(activeTab, currentTpl.subject || '', currentTpl.body || '');
      if (res.success) {
        setMessage(`Email template for "${activeTab}" saved successfully!`);
        setTimeout(() => setMessage(null), 4000);
      } else {
        setError(res.message || 'Failed to save email template.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error saving template.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!testCertId.trim()) return;

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await sendCertificateEmail(testCertId.trim(), testEmail.trim());
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Error sending email.' });
    } finally {
      setSendingTest(false);
    }
  };

  // Sample preview data calculation
  const sampleData = {
    name: 'SURYA PRAKASH',
    cert_id: 'HAD-2026-6D55DA',
    domain: 'Full Stack Web Development',
    issue_date: '24/08/2026',
    verify_url: `${typeof window !== 'undefined' ? window.location.origin : 'https://certificate-jgbq.onrender.com'}/verify/HAD-2026-6D55DA`,
    pdf_url: `${getApiBaseUrl()}/api/certificates/download/HAD-2026-6D55DA/`
  };

  const renderSamplePreview = (text = '') => {
    return text
      .replace(/{name}/g, sampleData.name)
      .replace(/{cert_id}/g, sampleData.cert_id)
      .replace(/{domain}/g, sampleData.domain)
      .replace(/{issue_date}/g, sampleData.issue_date)
      .replace(/{verify_url}/g, sampleData.verify_url)
      .replace(/{pdf_url}/g, sampleData.pdf_url);
  };

  const defaultTemplates = {
    course_completion: {
      subject: 'Official Course Completion Certificate | {name}',
      body: `Dear {name},

Greetings from Hadescore Apex & Technologies.

We are pleased to issue your official Course Completion Certificate for successfully completing the program in {domain}.

CERTIFICATE DETAILS:
- Candidate Name: {name}
- Certificate ID: {cert_id}
- Specialization / Domain: {domain}
- Date of Issue: {issue_date}

ATTACHMENT:
Your official certificate document is attached to this email as a PDF file. You can download and save it directly for your professional records.

We wish you success in your future endeavors.

Sincerely,
Hadescore Apex & Technologies
Certification & Credentials Authority
www.hadescoretech.com`
    },
    internship: {
      subject: 'Official Internship Completion Certificate | {name}',
      body: `Dear {name},

Congratulations on the successful completion of your Internship Program in {domain} at Hadescore Apex & Technologies.

We are pleased to issue your official Internship Completion Certificate.

INTERNSHIP DETAILS:
- Intern Name: {name}
- Certificate ID: {cert_id}
- Internship Domain: {domain}
- Date of Issue: {issue_date}

ATTACHMENT:
Your official internship certificate is attached directly to this email as a PDF document.

We appreciate your hard work and dedication during your tenure with us and wish you success in your career.

Best regards,
Hadescore Apex & Technologies
Human Resources & Training Team
www.hadescoretech.com`
    },
    campus_ambassador: {
      subject: 'Official Campus Ambassador Appointment Certificate | {name}',
      body: `Dear {name},

Greetings from Hadescore Apex & Technologies.

We are pleased to formally present your official Campus Ambassador Appointment Certificate.

AMBASSADOR DETAILS:
- Ambassador Name: {name}
- Reference ID: {cert_id}
- Program: Campus Ambassador Program
- Date of Issue: {issue_date}

ATTACHMENT:
Your official appointment certificate is attached to this email as a PDF document.

Thank you for representing Hadescore Technologies. Welcome aboard.

Warm regards,
Hadescore Community & Ambassador Program
Hadescore Apex & Technologies
www.hadescoretech.com`
    },
    offer_letter: {
      subject: 'Formal Offer of Internship | Hadescore Apex & Technologies - {name}',
      body: `Dear {name},

We are pleased to extend a formal Offer of Internship to you at Hadescore Apex & Technologies.

OFFER DETAILS:
- Candidate Name: {name}
- Offer Reference ID: {cert_id}
- Role / Domain: {domain}
- Date of Issue: {issue_date}

ATTACHMENT:
Your official Internship Offer Letter is attached directly to this email as a PDF document. Please review the document carefully.

We look forward to working with you.

Sincerely,
Talent Acquisition Team
Hadescore Apex & Technologies
www.hadescoretech.com`
    },
    tech_offer_letter: {
      subject: 'Tech Internship Offer Letter | Hadescore Technologies - {name}',
      body: `Dear {name},

We are pleased to extend a formal Tech Internship Offer Letter to you at Hadescore Technologies.

TECH OFFER DETAILS:
- Candidate Name: {name}
- Offer Reference ID: {cert_id}
- Role / Domain: {domain}
- Date of Issue: {issue_date}

ATTACHMENT:
Your official Tech Internship Offer Letter is attached directly to this email as a PDF document.

We look forward to having you join our team.

Best regards,
Hadescore Technologies
Human Resources Department
www.hadescoretech.com`
    }
  };

  const handleResetDefault = () => {
    const defaultVal = defaultTemplates[activeTab] || { subject: '', body: '' };
    setTemplates(prev => ({
      ...prev,
      [activeTab]: { ...defaultVal }
    }));
    setMessage(`Reset template for "${activeTab}" to standard default.`);
    setTimeout(() => setMessage(null), 3000);
  };

  const activeTpl = templates[activeTab] || {};
  const currentTemplate = {
    subject: activeTpl.subject && activeTpl.subject.trim() !== '' ? activeTpl.subject : (defaultTemplates[activeTab]?.subject || ''),
    body: activeTpl.body && activeTpl.body.trim() !== '' ? activeTpl.body : (defaultTemplates[activeTab]?.body || '')
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-70px)] bg-gray-50 text-gray-900 flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-cyan-600 font-bold text-lg">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading Email Templates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-70px)] text-gray-900 py-8 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-cyan-600 font-bold transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
              <span>Back to Home</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center border border-cyan-200 shadow-sm">
                <Mail className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-gray-900">Email Notification Templates</h1>
                <p className="text-xs text-gray-500 mt-0.5">Customize email subjects & message body sent to candidates</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-cyan-200 self-start sm:self-auto disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={2.5} />}
            <span>{saving ? 'Saving...' : 'Save Template Settings'}</span>
          </button>
        </div>

        {/* Status Alerts */}
        {message && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" strokeWidth={2.5} />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-3 shadow-sm">
            <Info className="w-5 h-5 text-red-600 shrink-0" strokeWidth={2.5} />
            <span>{error}</span>
          </div>
        )}

        {/* Certificate Type Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {certTypes.map(t => {
            const Icon = t.icon;
            const isSelected = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left shadow-sm ${
                  isSelected
                    ? `bg-white border-cyan-500 text-gray-900 shadow-md ring-4 ring-cyan-50`
                    : `bg-white border-gray-200 text-gray-600 hover:border-cyan-300 hover:text-gray-900`
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-tr ${t.color} shrink-0 shadow-sm`}>
                  <Icon className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <span className="text-xs font-bold leading-tight">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Editor & Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Template Editor */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border-2 border-gray-200 rounded-3xl p-6 shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-cyan-600 flex items-center gap-2">
                  <Code className="w-4 h-4" strokeWidth={2.5} />
                  <span>Edit Template ({certTypes.find(t => t.id === activeTab)?.label})</span>
                </h3>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors"
                  title="Reset to default standard template"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              </div>

              {/* Dynamic Placeholders Toolbar */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-2">
                  Available Dynamic Variables (Click to Add)
                </label>
                <div className="flex flex-wrap gap-2">
                  {placeholders.map(p => (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => handleInsertPlaceholder('body', p.code)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 font-mono text-[11px] font-bold transition-colors"
                      title={`Insert ${p.desc}`}
                    >
                      {p.code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Subject Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-700">
                    Email Subject Line <span className="text-cyan-500">*</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={currentTemplate.subject || ''}
                  onChange={(e) => handleFieldChange('subject', e.target.value)}
                  placeholder="Enter email subject..."
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-cyan-500 transition-all font-mono"
                />
              </div>

              {/* Email Body Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-700">
                    Email Message Body <span className="text-cyan-500">*</span>
                  </label>
                </div>
                <textarea
                  rows={10}
                  value={currentTemplate.body || ''}
                  onChange={(e) => handleFieldChange('body', e.target.value)}
                  placeholder="Enter message body content..."
                  className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:border-cyan-500 transition-all leading-relaxed"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
                >
                  <Save className="w-4 h-4" strokeWidth={2.5} />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Email Preview & Send Test */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Sample Email Client Card */}
            <div className="bg-white border-2 border-gray-200 rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-gray-800 text-xs font-black uppercase">
                  <Sparkles className="w-4 h-4 text-amber-500" strokeWidth={2.5} />
                  <span>Live Recipient View</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-mono border border-emerald-200 font-bold">
                  Sample Render
                </span>
              </div>

              {/* Mock Inbox Window */}
              <div className="bg-slate-50 border-2 border-gray-200 rounded-2xl p-4 space-y-3 font-sans text-xs">
                <div className="border-b border-gray-200 pb-3 space-y-1">
                  <p className="text-gray-500">From: <span className="text-gray-900 font-bold">Hadescore Technologies &lt;noreply@hadescoretech.com&gt;</span></p>
                  <p className="text-gray-500">To: <span className="text-gray-900 font-bold">{sampleData.name} &lt;surya@example.com&gt;</span></p>
                  <p className="text-cyan-700 font-black mt-2">Subject: {renderSamplePreview(currentTemplate.subject)}</p>
                </div>

                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed pt-2 font-mono text-[11px]">
                  {renderSamplePreview(currentTemplate.body)}
                </div>

                <div className="mt-4 p-3 rounded-xl bg-white border border-gray-200 flex items-center justify-between text-[11px] shadow-sm">
                  <div className="flex items-center gap-2 text-gray-600 font-bold">
                    <FileText className="w-4 h-4 text-cyan-600" strokeWidth={2.5} />
                    <span>Attachment: {sampleData.name.replace(/\s+/g, '_')}_Certificate.pdf</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
