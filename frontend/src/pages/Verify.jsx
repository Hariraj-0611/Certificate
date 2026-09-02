import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { verifyCertificate } from '../services/api';
import { ShieldCheck, ShieldAlert, Award, Calendar, User, BookOpen, ArrowLeft, Loader2 } from 'lucide-react';
import logoImg from '../assets/hadescore_logo.png';

export default function Verify() {
  const { certId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchVerification() {
      try {
        setLoading(true);
        const res = await verifyCertificate(certId);
        if (isMounted) setData(res);
      } catch (err) {
        if (isMounted) setError(err.response?.data?.message || 'Certificate verification failed');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchVerification();
    return () => { isMounted = false; };
  }, [certId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-xs text-gray-600 font-medium">Verifying certificate credentials...</p>
      </div>
    );
  }

  const isValid = data && data.valid;

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
        <div className="mb-6">
          <img 
            src={logoImg} 
            alt="Hadescore Apex Logo" 
            className="w-14 h-14 mx-auto mb-2 object-contain drop-shadow-sm" 
          />
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-gray-600">
            HADESCORE APEX & TECHNOLOGIES
          </div>
          <div className="text-sm font-extrabold text-indigo-600 uppercase tracking-wider mt-0.5">
            Certificate Verification Portal
          </div>
        </div>

        {isValid ? (
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 flex items-center justify-center text-emerald-600 mx-auto animate-bounce">
              <ShieldCheck className="w-10 h-10" />
            </div>

            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold tracking-wider uppercase">
                ✓ VALID CERTIFICATE
              </span>
            </div>

            <div className="space-y-3 text-left bg-gray-50 p-5 rounded-2xl border border-gray-200 text-xs">
              {data.cert_id && (
                <div className="flex items-start justify-between border-b border-gray-200 pb-2.5">
                  <span className="text-gray-600 font-medium">Certificate ID</span>
                  <span className="font-mono font-extrabold text-indigo-600 select-all">{data.cert_id}</span>
                </div>
              )}

              <div className="flex items-start justify-between border-b border-gray-200 pb-2.5">
                <span className="text-gray-600 font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-500" /> Recipient Name
                </span>
                <span className="font-bold text-gray-900">{data.name}</span>
              </div>

              <div className="flex items-start justify-between border-b border-gray-200 pb-2.5">
                <span className="text-gray-600 font-medium flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-gray-500" /> Document Type
                </span>
                <span className="font-semibold text-gray-800 capitalize">
                  {data.cert_type?.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex items-start justify-between border-b border-gray-200 pb-2.5">
                <span className="text-gray-600 font-medium flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-gray-500" /> Domain / Role
                </span>
                <span className="font-semibold text-gray-800">{data.domain || 'N/A'}</span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-gray-600 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" /> Issue Date
                </span>
                <span className="font-semibold text-gray-700">{data.issue_date}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-300 flex items-center justify-center text-red-600 mx-auto">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-extrabold tracking-wider uppercase">
                ✕ CERTIFICATE NOT FOUND
              </span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
              {error || 'The requested certificate ID could not be verified in the Hadescore Apex registry or has been revoked.'}
            </p>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-gray-200">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Portal Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
