import React from 'react';
import { Link } from 'react-router-dom';
import CertificateCard from '../components/CertificateCard';
import { GraduationCap, Briefcase, Award, FileText, Code2, BarChart3 } from 'lucide-react';

export default function Home() {
  const cards = [
    {
      title: "Course Completion Certificate",
      subtitle: "Generate official certificates for candidates completing technical domain courses.",
      icon: GraduationCap,
      route: "/certificates/course-completion",
      tag: "Course",
      color: "cyan",
    },
    {
      title: "Internship Completion Certificate",
      subtitle: "Issue verification certificates for interns successfully finishing their program tenure.",
      icon: Briefcase,
      route: "/certificates/internship",
      tag: "Internship",
      color: "indigo",
    },
    {
      title: "Campus / Brand Ambassador",
      subtitle: "Official appointment certificates for recognized Campus Brand Ambassadors.",
      icon: Award,
      route: "/certificates/campus-ambassador",
      tag: "Ambassador",
      color: "purple",
    },
    {
      title: "Internship Offer Letter",
      subtitle: "Generate formal internship offer letters requiring administrative approval.",
      icon: FileText,
      route: "/certificates/offer-letter",
      tag: "Offer",
      color: "blue",
    },
    {
      title: "Tech Offer Letter",
      subtitle: "Generate technical offer letters with custom domain, stipend & working hours.",
      icon: Code2,
      route: "/certificates/tech-offer-letter",
      tag: "Tech Offer",
      color: "emerald",
    },
  ];

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-70px)] h-[calc(100vh-70px)] py-4 px-4 sm:px-8 w-full flex flex-col justify-center overflow-hidden">
      <div className="max-w-6xl mx-auto w-full flex flex-col justify-center">
        {/* Clean Compact Header */}
        <div className="text-center max-w-xl mx-auto mb-5 shrink-0">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-1.5">
            Certificate & Offer Letter Generator
          </h1>
          <p className="text-xs text-gray-500 font-medium mb-3">
            Select a document template below to generate, verify, and issue credentials.
          </p>
          <Link 
            to="/dashboard" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-cyan-200 uppercase tracking-wider"
          >
            <BarChart3 className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>View Dashboard & History</span>
          </Link>
        </div>

        {/* 3 + 2 Card Clean Order Grid Layout */}
        <div className="space-y-4">
          {/* Row 1: 3 Certificates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cards.slice(0, 3).map((card, idx) => (
              <CertificateCard key={idx} {...card} />
            ))}
          </div>

          {/* Row 2: 2 Offer Letters Centered */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
            {cards.slice(3, 5).map((card, idx) => (
              <CertificateCard key={idx + 3} {...card} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
