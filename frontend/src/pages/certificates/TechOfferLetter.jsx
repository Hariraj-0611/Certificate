import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormInput from '../../components/FormInput';
import FormSelect from '../../components/FormSelect';
import DateInput from '../../components/DateInput';
import LoadingState from '../../components/LoadingState';
import SuccessScreen from '../../components/SuccessScreen';
import ErrorMessage from '../../components/ErrorMessage';
import BulkUploadModal from '../../components/BulkUploadModal';
import { generateCertificate } from '../../services/api';
import { buildOptimisticResult } from '../../utils/instantCert';
import { ArrowLeft, User, Mail, FileText, Clock, Send, Briefcase, DollarSign, Laptop, Search, FileSpreadsheet, Cpu } from 'lucide-react';

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

  // --- MECHANICAL, ROBOTICS & MECHATRONICS ---
  "MECHANICAL DESIGN ENGINEERING",
  "AUTOCAD MECHANICAL",
  "SOLIDWORKS & CATIA 3D MODELLING",
  "ANSYS FEA & CFD ANALYSIS",
  "ROBOTICS & AUTOMATION",
  "MECHATRONICS ENGINEERING",
  "AUTOMOTIVE ENGINEERING BASICS",
  "HYDRAULICS & PNEUMATICS",
  "THERMAL & HVAC ENGINEERING",
  "MANUFACTURING & CNC PROGRAMMING",
  "INDUSTRIAL AUTOMATION & PLC SCADA",
  "3D PRINTING & ADDITIVE MANUFACTURING",
  "PRODUCT DESIGN & DEVELOPMENT",

  // --- CIVIL, ARCHITECTURE & CONSTRUCTION ---
  "AUTOCAD CIVIL",
  "CIVIL ENGINEERING & CONSTRUCTION MANAGEMENT",
  "STRUCTURAL DESIGN & ANALYSIS (STAAD PRO)",
  "BUILDING INFORMATION MODELING (BIM)",
  "GEOTECHNICAL ENGINEERING BASICS",
  "SURVEYING & GIS MAPPING",
  "REVIT ARCHITECTURE & INTERIOR DESIGN",
  "ESTIMATION & COSTING IN CIVIL",
  "TOWN PLANNING & URBAN DEVELOPMENT",

  // --- BIO, CHEMICAL & ENVIRONMENT (NON-MEDICAL) ---
  "BIOTECHNOLOGY BASICS",
  "BIOINFORMATICS & COMPUTATIONAL BIOLOGY",
  "BIOMEDICAL INSTRUMENTATION & ENGINEERING",
  "CHEMICAL ENGINEERING FUNDAMENTALS",
  "ENVIRONMENTAL ENGINEERING & SUSTAINABILITY",
  "FOOD TECHNOLOGY & PROCESSING BASICS",
  "AGRICULTURAL TECHNOLOGY & AGRI-TECH",
  "GENETICS & MOLECULAR BIOLOGY BASICS",
  "WATER RESOURCE & WASTE MANAGEMENT",

  // --- AEROSPACE, MARINE & ADVANCED ENGINEERING ---
  "AEROSPACE & AERONAUTICAL ENGINEERING BASICS",
  "DRONE TECHNOLOGY BASICS",
  "AVIONICS & AIRCRAFT SYSTEMS",
  "MARINE ENGINEERING BASICS",
  "NANO TECHNOLOGY & MATERIALS SCIENCE",
  "INDUSTRIAL SAFETY & MANAGEMENT",

  // --- UI/UX, DESIGN & MULTIMEDIA ---
  "UI/UX DESIGN MASTERY",
  "MOBILE UI/UX DESIGN",
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
  "OTHER (TYPE CUSTOM ROLE...)"
];

export default function TechOfferLetter() {
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  // Role selection state
  const [roleSelect, setRoleSelect] = useState('CHOOSE YOUR ROLE / DOMAIN');
  const [customRole, setCustomRole] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Duration selection state
  const [durationSelect, setDurationSelect] = useState('1 Months');
  const [customDuration, setCustomDuration] = useState('');

  // Working Hours selection state
  const [hoursSelect, setHoursSelect] = useState('10:00 AM - 5:00 PM');
  const [customHours, setCustomHours] = useState('');

  // Mode selection state
  const [modeSelect, setModeSelect] = useState('Offline');
  const [customMode, setCustomMode] = useState('');

  // Stipend selection state
  const [stipendSelect, setStipendSelect] = useState('Not Applicable');
  const [customStipend, setCustomStipend] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    start_date: '',
    issue_date: new Date().toISOString().split('T')[0],
    cert_id: '',
    qr_link: '',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const filteredRoles = DOMAIN_OPTIONS.filter((role) =>
    role.toLowerCase().includes(roleSearch.toLowerCase())
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const finalRole = (roleSelect === 'OTHER (TYPE CUSTOM ROLE...)' || roleSelect === 'custom') ? customRole.trim() : roleSelect;
    const finalDuration = durationSelect === 'custom' ? customDuration.trim() : durationSelect;
    const finalHours = hoursSelect === 'custom' ? customHours.trim() : hoursSelect;
    const finalMode = modeSelect === 'custom' ? customMode.trim() : modeSelect;
    const finalStipend = stipendSelect === 'custom' ? customStipend.trim() : stipendSelect;

    // Instant 1ms Optimistic UI Feedback
    const optimistic = buildOptimisticResult({
      cert_type: 'tech_offer_letter',
      name: formData.name,
      email: formData.email,
      domain: finalRole || 'Full - stack Developer',
      extra_field: finalDuration || '1 Months',
      start_date: formData.start_date,
      issue_date: formData.issue_date,
      working_hours: finalHours || '10:00 AM - 5:00 PM',
      mode: finalMode || 'Offline',
      stipend: finalStipend || 'Not Applicable',
      cert_id: formData.cert_id,
    });

    setResult(optimistic);

    // Background non-blocking sync with backend API
    generateCertificate({
      cert_type: 'tech_offer_letter',
      name: formData.name,
      email: formData.email,
      domain: finalRole || 'Full - stack Developer',
      extra_field: finalDuration || '1 Months',
      start_date: formData.start_date,
      issue_date: formData.issue_date,
      working_hours: finalHours || '10:00 AM - 5:00 PM',
      mode: finalMode || 'Offline',
      stipend: finalStipend || 'Not Applicable',
      cert_id: optimistic.cert_id,
      qr_link: formData.qr_link,
    }).then((bgResponse) => {
      if (bgResponse && bgResponse.success) {
        setResult((prev) => ({ ...prev, ...bgResponse }));
      }
    }).catch(() => {
      // Background sync will retry cleanly without interrupting UI
    });
  };

  if (loading) return <LoadingState title="Preparing Tech Offer Letter..." />;
  if (result) return <SuccessScreen data={result} isOfferLetter={true} hideCertId={true} onReset={() => setResult(null)} />;

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-70px)] py-4 w-full flex flex-col justify-center">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 w-full">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-cyan-600 transition-colors mb-3 font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          <span>Back to Home</span>
        </Link>

        <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 sm:p-6 shadow-md">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-3 border-b border-gray-100">
            <div>
              <h1 className="text-2xl font-black text-gray-900 leading-tight flex items-center gap-2">
                <Cpu className="w-6 h-6 text-cyan-600" />
                <span>Tech Offer Letter</span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Generate formal Tech Internship Offer Letter for Hadescore Technologies
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsBulkModalOpen(true)}
                type="button"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all border border-blue-400"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Bulk Upload
              </button>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-cyan-100 text-cyan-700 border border-cyan-300 text-[10px] font-black uppercase tracking-wider">
                  Tech Offer Letter
                </span>
                <span className="hidden sm:flex items-center gap-1 text-[10px] text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  <Clock className="w-3 h-3" strokeWidth={2.5} />
                  <span>Pending Approval</span>
                </span>
              </div>
            </div>
          </div>

          <BulkUploadModal
            isOpen={isBulkModalOpen}
            onClose={() => setIsBulkModalOpen(false)}
            certType="tech_offer_letter"
          />

          <ErrorMessage message={error} />

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Clean 50/50 Split 2-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              {/* Candidate Full Name & Email */}
              <FormInput
                label="Candidate Full Name"
                name="name"
                placeholder="Enter candidate full name"
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

              {/* LEFT COLUMN: Role / Position */}
              <div className="flex flex-col gap-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700">
                  Role / Position <span className="text-cyan-500">*</span>
                </label>
                
                <div ref={roleDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-900 text-left hover:border-cyan-400 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" strokeWidth={2.5} />
                      <span className={roleSelect === 'CHOOSE YOUR ROLE / DOMAIN' ? 'text-gray-400 font-bold uppercase' : 'text-gray-900 font-bold'}>{roleSelect}</span>
                    </div>
                    <span className="text-xs text-gray-400 font-bold">▼</span>
                  </button>

                  {/* Dropdown Menu - Always opens downward */}
                  {isRoleDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 top-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-3 space-y-2 max-h-64 overflow-hidden flex flex-col">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="SEARCH ROLE / DOMAIN..."
                            value={roleSearch}
                            onChange={(e) => setRoleSearch(e.target.value)}
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
                        {filteredRoles.map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              setRoleSelect(role);
                              setIsRoleDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${roleSelect === role ? 'bg-cyan-100 text-cyan-800' : 'hover:bg-gray-100 text-gray-700'}`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Role Text Input if "OTHER" is selected */}
                {(roleSelect === 'OTHER (TYPE CUSTOM ROLE...)' || roleSelect === 'custom') && (
                  <input
                    type="text"
                    placeholder="ENTER CUSTOM ROLE / POSITION"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-cyan-400 rounded-xl text-sm font-bold text-gray-900 uppercase focus:outline-none focus:ring-4 focus:ring-cyan-50 mt-1"
                    required
                  />
                )}
              </div>

              {/* RIGHT COLUMN: Duration */}
              <div className="flex flex-col gap-1.5">
                <FormSelect
                  label="Duration"
                  name="duration"
                  value={durationSelect}
                  onChange={(e) => setDurationSelect(e.target.value)}
                  icon={Clock}
                  options={[
                    { value: '1 Months', label: '1 Month' },
                    { value: '2 Months', label: '2 Months' },
                    { value: '3 Months', label: '3 Months' },
                    { value: '6 Months', label: '6 Months' },
                    { value: 'custom', label: 'Other (Type Custom Duration...)' }
                  ]}
                />
                {durationSelect === 'custom' && (
                  <input
                    type="text"
                    placeholder="e.g. 4 Months / 15 Days"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-cyan-400 rounded-xl text-sm font-bold text-gray-900 uppercase focus:outline-none focus:ring-4 focus:ring-cyan-50 mt-1"
                    required
                  />
                )}
              </div>

              {/* Joining Date & Issue Date */}
              <DateInput
                label="Joining / Start Date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
              />

              <DateInput
                label="Date of Issue"
                name="issue_date"
                value={formData.issue_date}
                onChange={handleChange}
                required
              />

              {/* Working Hours */}
              <div className="flex flex-col gap-1.5">
                <FormSelect
                  label="Working Hours"
                  name="working_hours"
                  value={hoursSelect}
                  onChange={(e) => setHoursSelect(e.target.value)}
                  icon={Clock}
                  options={[
                    { value: '10:00 AM - 5:00 PM', label: '10:00 AM - 5:00 PM' },
                    { value: '9:00 AM - 6:00 PM', label: '9:00 AM - 6:00 PM' },
                    { value: 'Flexible Hours', label: 'Flexible Hours' },
                    { value: 'custom', label: 'Other (Type Custom Hours...)' }
                  ]}
                />
                {hoursSelect === 'custom' && (
                  <input
                    type="text"
                    placeholder="e.g. 11:00 AM - 4:00 PM"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-cyan-400 rounded-xl text-sm font-bold text-gray-900 uppercase focus:outline-none focus:ring-4 focus:ring-cyan-50 mt-1"
                    required
                  />
                )}
              </div>

              {/* Mode */}
              <div className="flex flex-col gap-1.5">
                <FormSelect
                  label="Mode of Internship"
                  name="mode"
                  value={modeSelect}
                  onChange={(e) => setModeSelect(e.target.value)}
                  icon={Laptop}
                  options={[
                    { value: 'Offline', label: 'Offline (On-Site)' },
                    { value: 'Online', label: 'Online (Remote)' },
                    { value: 'Hybrid', label: 'Hybrid' },
                    { value: 'custom', label: 'Other (Type Custom Mode...)' }
                  ]}
                />
                {modeSelect === 'custom' && (
                  <input
                    type="text"
                    placeholder="e.g. Remote / On-Site"
                    value={customMode}
                    onChange={(e) => setCustomMode(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-cyan-400 rounded-xl text-sm font-bold text-gray-900 uppercase focus:outline-none focus:ring-4 focus:ring-cyan-50 mt-1"
                    required
                  />
                )}
              </div>

              {/* Stipend */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <FormSelect
                  label="Stipend"
                  name="stipend"
                  value={stipendSelect}
                  onChange={(e) => setStipendSelect(e.target.value)}
                  icon={DollarSign}
                  options={[
                    { value: 'Not Applicable', label: 'Not Applicable (Unpaid)' },
                    { value: 'Performance Based', label: 'Performance Based' },
                    { value: 'Rs 5000/Month', label: 'Rs 5,000 / Month' },
                    { value: 'Rs 10000/Month', label: 'Rs 10,000 / Month' },
                    { value: 'custom', label: 'Other (Type Custom Stipend...)' }
                  ]}
                />
                {stipendSelect === 'custom' && (
                  <input
                    type="text"
                    placeholder="e.g. Rs 8,000 / Month"
                    value={customStipend}
                    onChange={(e) => setCustomStipend(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-cyan-400 rounded-xl text-sm font-bold text-gray-900 uppercase focus:outline-none focus:ring-4 focus:ring-cyan-50 mt-1"
                    required
                  />
                )}
              </div>

            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 border border-blue-400"
              >
                <Send className="w-4 h-4" strokeWidth={2.5} />
                <span>Generate Tech Offer Letter</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
