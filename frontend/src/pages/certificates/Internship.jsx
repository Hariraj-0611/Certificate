import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FormInput from '../../components/FormInput';
import DateInput from '../../components/DateInput';
import LoadingState from '../../components/LoadingState';
import SuccessScreen from '../../components/SuccessScreen';
import ErrorMessage from '../../components/ErrorMessage';
import BulkUploadModal from '../../components/BulkUploadModal';
import { generateCertificate } from '../../services/api';
import { buildOptimisticResult } from '../../utils/instantCert';
import { ArrowLeft, User, Mail, Briefcase, Send, Hash, QrCode, Search, FileSpreadsheet } from 'lucide-react';

const DOMAIN_OPTIONS = [
  // --- SOFTWARE & WEB DEVELOPMENT (TECH) ---
  "FULLSTACK WEB DEVELOPMENT",
  "FRONTEND DEVELOPMENT",
  "BACKEND DEVELOPMENT",
  "JAVA FULLSTACK DEVELOPMENT",
  "PYTHON FULLSTACK DEVELOPMENT",
  "MERN STACK DEVELOPMENT",
  "MEAN STACK DEVELOPMENT",
  "NEXT.JS & REACT DEVELOPMENT",
  "NODE.JS & EXPRESS BACKEND",
  "ANGULAR WEB DEVELOPMENT",
  "VUE.JS FRONTEND DEVELOPMENT",
  "PHP & LARAVEL DEVELOPMENT",
  "C# & .NET CORE DEVELOPMENT",
  "RUBY ON RAILS DEVELOPMENT",
  "WORDPRESS & CMS DEVELOPMENT",
  "WEB API & MICROSERVICES",
  "PROGRESSIVE WEB APPS (PWA)",

  // --- MOBILE & APP DEVELOPMENT ---
  "MOBILE APP DEVELOPMENT",
  "ANDROID APP DEVELOPMENT",
  "IOS APP DEVELOPMENT (SWIFT)",
  "FLUTTER APP DEVELOPMENT",
  "REACT NATIVE DEVELOPMENT",
  "KOTLIN ANDROID DEVELOPMENT",
  "CROSS-PLATFORM APP DEVELOPMENT",

  // --- CLOUD, DEVOPS & INFRASTRUCTURE ---
  "DEVOPS & CLOUD COMPUTING",
  "CLOUD ARCHITECTURE (AWS / AZURE / GCP)",
  "KUBERNETES & DOCKER CONTAINERIZATION",
  "TERRAFORM & INFRASTRUCTURE AS CODE",
  "SITE RELIABILITY ENGINEERING (SRE)",
  "LINUX SYSTEM ADMINISTRATION",
  "SERVERLESS ARCHITECTURE",

  // --- SOFTWARE QUALITY & TESTING ---
  "SOFTWARE TESTING & QA",
  "AUTOMATION TESTING (SELENIUM)",
  "API TESTING (POSTMAN / REST ASSURED)",
  "PERFORMANCE TESTING (JMETER)",
  "CYPRESS & PLAYWRIGHT TESTING",

  // --- AI, MACHINE LEARNING & DATA SCIENCE ---
  "ARTIFICIAL INTELLIGENCE FUNDAMENTALS",
  "MACHINE LEARNING ENGINEERING",
  "DATA SCIENCE & ANALYTICS",
  "DATA ENGINEERING",
  "DEEP LEARNING & COMPUTER VISION",
  "NATURAL LANGUAGE PROCESSING (NLP)",
  "GENERATIVE AI & LLM DEVELOPMENT",
  "AI TOOLS MASTERY",
  "PROMPT ENGINEERING",
  "AI AUTOMATION",
  "BUSINESS INTELLIGENCE (POWER BI / TABLEAU)",
  "BIG DATA ANALYTICS (HADOOP / SPARK)",
  "DATA WAREHOUSING & ETL",
  "INTERNET OF THINGS (IOT)",
  "BLOCKCHAIN DEVELOPMENT",
  "QUANTUM COMPUTING BASICS",
  "AI + ROBOTICS COMBO",
  "FULLSTACK + AI COMBO",

  // --- CYBER SECURITY & NETWORKING ---
  "CYBERSECURITY ANALYST PROGRAM",
  "ETHICAL HACKING BASICS",
  "NETWORK SECURITY",
  "WEB APPLICATION SECURITY",
  "INFORMATION SECURITY & COMPLIANCE",
  "PENETRATION TESTING & VULNERABILITY ASSESSMENT",
  "CLOUD SECURITY ARCHITECTURE",
  "SOC ANALYST (SECURITY OPERATIONS)",
  "DIGITAL FORENSICS & INCIDENT RESPONSE",

  // --- ELECTRICAL & ELECTRONICS ENGINEERING (EEE / ECE) ---
  "ELECTRICAL & ELECTRONICS ENGINEERING (EEE)",
  "ELECTRONICS & COMMUNICATION ENGINEERING (ECE)",
  "ELECTRICAL DESIGN BASICS",
  "VLSI DESIGN & EMBEDDED SYSTEMS",
  "PRINTED CIRCUIT BOARD (PCB) DESIGN",
  "POWER ELECTRONICS & SMART GRID",
  "RENEWABLE ENERGY SYSTEMS",
  "MICROCONTROLLER & ARDUINO PROGRAMMING",
  "RASPBERRY PI & EMBEDDED C",
  "TELECOMMUNICATION & 5G NETWORKS",
  "SIGNAL & IMAGE PROCESSING",
  "SENSORS & ACTUATORS TECHNOLOGY",

  // --- MECHANICAL, AUTOMOBILE & ROBOTICS (MECH) ---
  "MECHANICAL ENGINEERING DESIGN",
  "AUTOMOBILE & EV ENGINEERING",
  "ROBOTICS & INDUSTRIAL AUTOMATION",
  "CAD / CAM / CAE ENGINEERING",
  "AUTOCAD & SOLIDWORKS DESIGN",
  "CATIA & ANSYS SIMULATION",
  "3D PRINTING & ADDITIVE MANUFACTURING",
  "MECHATRONICS ENGINEERING",
  "HVAC & PIPING DESIGN",
  "HYDRAULICS & PNEUMATICS SYSTEMS",
  "FINITE ELEMENT ANALYSIS (FEA)",
  "CFD (COMPUTATIONAL FLUID DYNAMICS)",

  // --- CIVIL & STRUCTURAL ENGINEERING (CIVIL) ---
  "CIVIL & STRUCTURAL ENGINEERING",
  "BUILDING INFORMATION MODELING (BIM)",
  "REVIT ARCHITECTURE & STRUCTURE",
  "STAAD PRO STRUCTURAL ANALYSIS",
  "CONSTRUCTION PROJECT MANAGEMENT",
  "SURVEYING & GIS TECHNOLOGY",
  "INTERIOR DESIGN & 3DS MAX",
  "ESTIMATION & COSTING IN CIVIL",
  "TOWN PLANNING & INFRASTRUCTURE",

  // --- UI/UX, DESIGN & MULTIMEDIA (CREATIVE) ---
  "UI/UX DESIGN",
  "GRAPHIC DESIGN",
  "MOTION GRAPHICS & VIDEO EDITING",
  "3D ANIMATION & VFX",
  "GAME DESIGN & DEVELOPMENT (UNITY / UNREAL)",
  "PRODUCT DESIGN & WIREFRAMING (FIGMA)",
  "ILLUSTRATION & DIGITAL ART",
  "PERSONAL BRANDING",

  // --- BUSINESS, MARKETING & MANAGEMENT (NON-TECH) ---
  "DIGITAL MARKETING MASTERY",
  "SOCIAL MEDIA MARKETING",
  "PERFORMANCE MARKETING",
  "SEO SPECIALIST",
  "CONTENT WRITING & COPYWRITING",
  "HUMAN RESOURCE MANAGEMENT (HRM)",
  "BUSINESS ADMINISTRATION & MANAGEMENT",
  "FINANCE & FINANCIAL ANALYTICS",
  "ACCOUNTING & TALLY / TALLY PRIME",
  "SUPPLY CHAIN & LOGISTICS MANAGEMENT",
  "PROJECT MANAGEMENT BASICS",
  "ENTREPRENEURSHIP BOOTCAMP",
  "STARTUP DEVELOPMENT PROGRAM",
  "E-COMMERCE MANAGEMENT & SHOPIFY",
  "SALES & BUSINESS DEVELOPMENT",
  "CUSTOMER RELATIONSHIP MANAGEMENT (CRM)",
  "EVENT MANAGEMENT & PUBLIC RELATIONS",
  "RISK MANAGEMENT & COMPLIANCE",
  "FREELANCING MASTERY",
  "LEARN → BUILD → EARN PROGRAM",
  "OTHER (TYPE CUSTOM DOMAIN...)"
];

export default function Internship() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    selectedDomain: 'CHOOSE YOUR DOMAIN',
    customDomain: '',
    start_date: '',
    end_date: '',
    issue_date: '',
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
    setError(null);

    if (!formData.cert_id || !formData.cert_id.trim()) {
      setError('Certificate NO is required. Please enter a certificate number.');
      return;
    }
    if (!formData.qr_link || !formData.qr_link.trim()) {
      setError('Custom QR Verification Link is required. Please enter a URL.');
      return;
    }

    const effectiveDomain = getEffectiveDomain();

    // Instant 1ms Optimistic UI Feedback
    const optimistic = buildOptimisticResult({
      cert_type: 'internship',
      name: formData.name,
      email: formData.email,
      domain: effectiveDomain,
      start_date: formData.start_date,
      end_date: formData.end_date,
      issue_date: formData.issue_date,
      cert_id: formData.cert_id,
      qr_link: formData.qr_link,
    });

    setResult(optimistic);

    // Background sync with API
    generateCertificate({
      cert_type: 'internship',
      name: formData.name,
      email: formData.email,
      domain: effectiveDomain,
      start_date: formData.start_date,
      end_date: formData.end_date,
      issue_date: formData.issue_date,
      cert_id: formData.cert_id.trim().toUpperCase(),
      qr_link: formData.qr_link,
    }).then((bgResponse) => {
      if (bgResponse && bgResponse.success) {
        setResult((prev) => ({ ...prev, ...bgResponse }));
      } else if (bgResponse && !bgResponse.success) {
        setResult(null);
        setError(bgResponse.message || 'Certificate generation failed. Please try a different Certificate ID.');
      }
    }).catch((err) => {
      const msg = err?.response?.data?.message || '';
      if (msg) {
        setResult(null);
        setError(msg);
      }
    });
  };

  if (loading) return <LoadingState title="Generating Internship Certificate..." />;
  if (result) return <SuccessScreen data={result} onReset={() => setResult(null)} />;

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="inline-block px-4 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 border-2 border-indigo-300 text-xs font-black uppercase tracking-wider mb-3">
                Internship Certificate
              </div>
              <h1 className="text-3xl font-black text-gray-900 mb-1">
                Internship Completion Certificate
              </h1>
              <p className="text-sm text-gray-600">
                Generate official Hadescore Apex internship completion certificate
              </p>
            </div>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              type="button"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all border border-indigo-400"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Bulk Upload Candidates
            </button>
          </div>

          <BulkUploadModal
            isOpen={isBulkModalOpen}
            onClose={() => setIsBulkModalOpen(false)}
            certType="internship"
          />

          <ErrorMessage message={error} />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              
              {/* 1. Intern Full Name & Email */}
              <FormInput
                label="Intern Full Name"
                name="name"
                placeholder="Enter intern full name"
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

              {/* 2. Role / Domain Dropdown & Searchable Selection */}
              <div className="md:col-span-2 relative">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Internship Role / Domain
                </label>
                
                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-900 text-left hover:border-cyan-400 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-gray-400" strokeWidth={2.5} />
                      <span className={formData.selectedDomain === 'CHOOSE YOUR DOMAIN' ? 'text-gray-400 font-bold uppercase' : 'text-gray-900 font-bold'}>{formData.selectedDomain}</span>
                    </div>
                    <span className="text-xs text-gray-400 font-bold">▼</span>
                  </button>

                  {/* Dropdown Menu - Always opens downward */}
                  {isDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 top-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-3 space-y-2 max-h-64 overflow-hidden flex flex-col">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="SEARCH DOMAIN..."
                            value={domainSearch}
                            onChange={(e) => setDomainSearch(e.target.value)}
                            className="w-full px-3 py-2 pl-9 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:border-cyan-400"
                          />
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <button
                          type="button"
                          className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>Search</span>
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                        {filteredDomains.map((domain) => (
                          <button
                            key={domain}
                            type="button"
                            onClick={() => handleSelectDomain(domain)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${formData.selectedDomain === domain ? 'bg-cyan-100 text-cyan-800' : 'hover:bg-gray-100 text-gray-700'}`}
                          >
                            {domain}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Domain Text Input if "OTHER" is selected */}
                {(formData.selectedDomain === 'OTHER (TYPE CUSTOM DOMAIN...)' || formData.selectedDomain === 'Other (Type Custom Domain...)') && (
                  <div className="mt-3">
                    <FormInput
                      label="Custom Domain Name"
                      name="customDomain"
                      placeholder="e.g. Cloud Security Architecture"
                      value={formData.customDomain}
                      onChange={handleChange}
                      icon={Briefcase}
                    />
                  </div>
                )}
              </div>

              {/* 3. Start Date, End Date & Issue Date */}
              <DateInput
                label="Start Date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
              />

              <DateInput
                label="End Date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
              />

              <DateInput
                label="Issue Date"
                name="issue_date"
                value={formData.issue_date}
                onChange={handleChange}
                required={true}
              />

              {/* 4. Certificate NO Input */}
              <FormInput
                label="Certificate NO"
                name="cert_id"
                placeholder="e.g. HAD-INT-2026-001"
                value={formData.cert_id}
                onChange={handleChange}
                icon={Hash}
                required={true}
              />

              {/* 5. Custom QR Verification Link */}
              <FormInput
                label="Custom QR Verification Link"
                name="qr_link"
                placeholder="e.g. https://lms.hadescoretech.com"
                value={formData.qr_link}
                onChange={handleChange}
                icon={QrCode}
                required={true}
              />
            </div>

            <button
              type="submit"
              className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-cyan-200"
            >
              <Send className="w-5 h-5" strokeWidth={2.5} />
              <span>Generate Internship Certificate</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
