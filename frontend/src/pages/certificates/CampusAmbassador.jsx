import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormInput from '../../components/FormInput';
import DateInput from '../../components/DateInput';
import LoadingState from '../../components/LoadingState';
import SuccessScreen from '../../components/SuccessScreen';
import ErrorMessage from '../../components/ErrorMessage';
import { generateCertificate } from '../../services/api';
import { buildOptimisticResult } from '../../utils/instantCert';
import BulkUploadModal from '../../components/BulkUploadModal';
import { ArrowLeft, User, Mail, Send, FileSpreadsheet, BookOpen, Search, Hash, QrCode } from 'lucide-react';

const DOMAIN_OPTIONS = [
  "FULLSTACK WEB DEVELOPMENT",
  "FRONTEND DEVELOPMENT",
  "BACKEND DEVELOPMENT",
  "JAVA FULLSTACK DEVELOPMENT",
  "PYTHON FULLSTACK DEVELOPMENT",
  "MERN STACK DEVELOPMENT",
  "MEAN STACK DEVELOPMENT",
  "ARTIFICIAL INTELLIGENCE FUNDAMENTALS",
  "MACHINE LEARNING ENGINEERING",
  "DATA SCIENCE & ANALYTICS",
  "CYBERSECURITY ANALYST PROGRAM",
  "DEVOPS & CLOUD COMPUTING",
  "UI/UX DESIGN MASTERY",
  "DIGITAL MARKETING MASTERY",
  "BUSINESS ADMINISTRATION & MANAGEMENT",
  "HUMAN RESOURCE MANAGEMENT (HRM)",
  "LEARN → BUILD → EARN PROGRAM",
  "OTHER (TYPE CUSTOM DOMAIN...)"
];

export default function CampusAmbassador() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    selectedDomain: 'CHOOSE YOUR DOMAIN',
    customDomain: '',
    start_date: '',
    issue_date: new Date().toISOString().split('T')[0],
    cert_id: '',
    qr_link: '',
  });

  const [domainSearch, setDomainSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredDomains = DOMAIN_OPTIONS.filter(d => 
    d.toLowerCase().includes(domainSearch.toLowerCase())
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectDomain = (domain) => {
    setFormData(prev => ({ ...prev, selectedDomain: domain }));
    setIsDropdownOpen(false);
  };

  const getEffectiveDomain = () => {
    if (formData.selectedDomain === 'OTHER (TYPE CUSTOM DOMAIN...)' || formData.selectedDomain === 'Other (Type Custom Domain...)') {
      return formData.customDomain.trim() || 'FULLSTACK WEB DEVELOPMENT';
    }
    if (formData.selectedDomain === 'CHOOSE YOUR DOMAIN') {
      return 'FULLSTACK WEB DEVELOPMENT';
    }
    return formData.selectedDomain;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter the ambassador full name.');
      return;
    }
    setError(null);

    const effectiveDomain = getEffectiveDomain();

    // Instant 1ms Optimistic UI Feedback
    const optimistic = buildOptimisticResult({
      cert_type: 'campus_ambassador',
      name: formData.name.trim(),
      email: formData.email.trim(),
      domain: effectiveDomain,
      start_date: formData.start_date,
      issue_date: formData.issue_date,
      cert_id: formData.cert_id,
      qr_link: formData.qr_link,
    });

    setResult(optimistic);

    // Background sync with API
    generateCertificate({
      cert_type: 'campus_ambassador',
      name: formData.name.trim(),
      email: formData.email.trim(),
      domain: effectiveDomain,
      start_date: formData.start_date,
      issue_date: formData.issue_date,
      cert_id: optimistic.cert_id,
      qr_link: formData.qr_link,
    }).then((bgResponse) => {
      if (bgResponse && bgResponse.success) {
        setResult((prev) => ({ ...prev, ...bgResponse }));
      }
    }).catch(() => {
      // Background cert sync handled silently
    });
  };

  if (loading) return <LoadingState title="Generating Ambassador Certificate..." />;
  if (result) return <SuccessScreen data={result} hideCertId={true} onReset={() => setResult(null)} />;

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-70px)] py-8 w-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-cyan-600 transition-colors mb-6 font-bold"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
          <span>Back to Home</span>
        </Link>

        <div className="bg-white border-2 border-gray-200 rounded-3xl p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="inline-block px-4 py-1.5 rounded-lg bg-purple-100 text-purple-700 border-2 border-purple-300 text-xs font-black uppercase tracking-wider mb-4">
                Ambassador Certificate
              </div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">
                Campus / Brand Ambassador
              </h1>
              <p className="text-sm text-gray-600">
                Generate official appointment certificate for recognized ambassadors
              </p>
            </div>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              type="button"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all border border-purple-400"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Bulk Upload Candidates
            </button>
          </div>

          <BulkUploadModal
            isOpen={isBulkModalOpen}
            onClose={() => setIsBulkModalOpen(false)}
            certType="campus_ambassador"
          />

          <ErrorMessage message={error} />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormInput
                label="Ambassador Full Name"
                name="name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={handleChange}
                icon={User}
                required
              />

              <FormInput
                label="Email Address"
                name="email"
                type="email"
                placeholder="Enter the mail"
                value={formData.email}
                onChange={handleChange}
                icon={Mail}
                required
              />

            </div>

            <button
              type="submit"
              className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-purple-200"
            >
              <Send className="w-5 h-5" strokeWidth={2.5} />
              <span>Generate Ambassador Certificate</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
