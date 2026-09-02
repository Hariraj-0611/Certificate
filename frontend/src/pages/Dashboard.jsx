import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getApiBaseUrl, getDashboardStats, getCertificateHistory, getAuditLogs, sendCertificateEmail } from '../services/api';
import PdfPreviewFrame from '../components/PdfPreviewFrame';
import { 
  FileText, 
  TrendingUp, 
  Clock, 
  Download, 
  ExternalLink, 
  Search, 
  Trash2, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  PlusCircle,
  Award,
  Briefcase,
  Users,
  Eye,
  X,
  Filter,
  ShieldCheck,
  Activity,
  FileSpreadsheet,
  Pencil,
  Mail,
  Sparkles
} from 'lucide-react';
export default function Dashboard() {
  const [stats, setStats] = useState({
    total_certificates: 0,
    today_count: 0,
    week_count: 0,
    by_type: [],
    by_status: []
  });
  const [history, setHistory] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('records'); // 'records' | 'audit'
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [editCert, setEditCert] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editCert) return;
    setIsUpdating(true);

    const targetId = editCert.cert_id || editCert.id || editCert._id;
    if (!targetId) {
      alert('Unable to identify valid certificate ID for update.');
      setIsUpdating(false);
      return;
    }

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/certificates/${encodeURIComponent(targetId)}/update/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCert)
      });
      const data = await res.json();
      if (data.success) {
        setHistory(prev => prev.map(c => c.cert_id === editCert.cert_id ? { ...c, ...editCert } : c));
        setEditCert(null);
        loadDashboardData();
      } else {
        alert(data.message || 'Failed to update certificate');
      }
    } catch (err) {
      console.error('Error updating certificate:', err);
      alert('Network error while updating certificate.');
    } finally {
      setIsUpdating(false);
    }
  };
  const [previewCert, setPreviewCert] = useState(null);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 5 seconds
    const refreshInterval = setInterval(() => {
      loadDashboardData();
    }, 5000);
    
    return () => clearInterval(refreshInterval);
  }, [page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else loadDashboardData();
    }, 300);
    
    return () => clearInterval(timer);
  }, [filterType, filterStatus]);

  const loadDashboardData = async () => {
    try {
      if (!loading) setRefreshing(true);
      else setLoading(true);
      
      const [filteredStatsData, historyData, auditLogsData] = await Promise.all([
        getDashboardStats({
          cert_type: filterType,
          status: filterStatus,
          search: searchTerm
        }),
        getCertificateHistory({ 
          page, 
          limit: 20,
          cert_type: filterType,
          status: filterStatus,
          search: searchTerm 
        }),
        getAuditLogs(50).catch(() => ({ audit_logs: [] }))
      ]);
      
      setStats(filteredStatsData);
      setHistory(historyData.certificates || []);
      setTotalPages(historyData.total_pages || 1);
      setAuditLogs(auditLogsData?.audit_logs || []);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    if (!history || history.length === 0) {
      alert('No certificate records available to export.');
      return;
    }

    const headers = ['Certificate ID', 'Candidate Name', 'Email', 'Certificate Type', 'Domain', 'Issue Date', 'Status'];
    const rows = history.map(cert => [
      `"${cert.cert_id || ''}"`,
      `"${cert.name || ''}"`,
      `"${cert.email || ''}"`,
      `"${cert.cert_type || ''}"`,
      `"${cert.domain || ''}"`,
      `"${cert.created_at ? cert.created_at.split('T')[0] : ''}"`,
      `"${cert.status || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Certificate_Records_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRefresh = async () => {
    await loadDashboardData();
  };

  const handleSearch = () => {
    if (page !== 1) setPage(1);
    else loadDashboardData();
  };

  const handleDelete = async (certId, certName) => {
    if (!window.confirm(`Delete certificate for "${certName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    setHistory(prev => prev.filter(cert => cert.cert_id !== certId));
    if (stats) {
      setStats(prev => ({ ...prev, total_certificates: Math.max(0, prev.total_certificates - 1) }));
    }

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/certificates/${encodeURIComponent(certId)}/delete/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        loadDashboardData();
        alert('Failed to delete certificate');
      }
    } catch (error) {
      console.error('Error deleting certificate:', error);
      loadDashboardData();
    }
  };

  const handleDeleteAll = async () => {
    const totalCount = stats?.total_certificates || 0;
    if (totalCount === 0) return;

    if (!window.confirm(`Are you sure you want to delete ALL ${totalCount} certificate records?\n\nThis will permanently delete all records from MongoDB Atlas Cloud and Google Drive.`)) {
      return;
    }

    setHistory([]);
    setStats(prev => ({ ...prev, total_certificates: 0, today_count: 0, week_count: 0, by_type: [], by_status: [] }));

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/certificates/delete-all/`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        await loadDashboardData();
      } else {
        alert('Failed to delete records: ' + (data.message || 'Error occurred'));
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Error deleting all:', error);
      await loadDashboardData();
    }
  };

  const getCertTypeLabel = (type) => {
    if (!type) return 'N/A';
    const labels = {
      'course_completion': 'Course Completion',
      'internship': 'Internship',
      'campus_ambassador': 'Campus Ambassador',
      'offer_letter': 'Offer Letter'
    };
    return labels[type] || type || 'N/A';
  };

  const getCertTypeColor = (type) => {
    const colors = {
      'course_completion': 'bg-cyan-50 text-cyan-700 border-cyan-200',
      'internship': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'campus_ambassador': 'bg-purple-50 text-purple-700 border-purple-200',
      'offer_letter': 'bg-amber-50 text-amber-700 border-amber-200'
    };
    return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getStatusColor = (status) => {
    const colors = {
      'generated': 'bg-emerald-50 text-emerald-700 border-emerald-300',
      'pending_approval': 'bg-amber-50 text-amber-700 border-amber-300',
      'revoked': 'bg-red-50 text-red-700 border-red-300',
    };
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-300';
  };

  const getInitials = (name) => {
    if (!name) return 'HD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="bg-slate-50/80 min-h-screen py-8 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Refresh & Sync Controls Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Analytics & certificate records • Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-200"
              title="Export all certificate records to CSV file"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-700 transition-all ${refreshing ? 'opacity-50' : ''}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2.5} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ANALYTICS STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1 */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Issued</span>
              <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
                <FileText className="w-5 h-5" strokeWidth={2.5} />
              </div>
            </div>
            <div className="text-4xl font-black text-gray-900 tracking-tight">{stats?.total_certificates || 0}</div>
            <p className="text-[11px] text-gray-500 font-semibold mt-2">All time generated certificates</p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
          </div>

          {/* Card 2 */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Issued Today</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" strokeWidth={2.5} />
              </div>
            </div>
            <div className="text-4xl font-black text-gray-900 tracking-tight">{stats?.today_count || 0}</div>
            <p className="text-[11px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
              <span>↑ Active today</span>
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
          </div>

          {/* Card 3 */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">This Week</span>
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Clock className="w-5 h-5" strokeWidth={2.5} />
              </div>
            </div>
            <div className="text-4xl font-black text-gray-900 tracking-tight">{stats?.week_count || 0}</div>
            <p className="text-[11px] text-purple-600 font-semibold mt-2">Last 7 days activity</p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-indigo-500"></div>
          </div>

          {/* Card 4: Breakdown */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">By Category</span>
              <span className="text-[10px] font-black text-gray-400 uppercase">Distribution</span>
            </div>
            <div className="space-y-2">
              {stats?.by_type?.map((item) => (
                <div key={item.cert_type} className="flex items-center justify-between text-xs font-bold">
                  <span className="text-gray-600 truncate max-w-[140px]">
                    {getCertTypeLabel(item.cert_type)}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-gray-900 rounded font-mono text-[11px]">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
          </div>
        </div>

        {/* MAIN CERTIFICATE & AUDIT LOGS SECTION */}
        <div className="bg-white border-2 border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-4">
            <button
              onClick={() => setActiveTab('records')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
                activeTab === 'records'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-200'
                  : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" strokeWidth={2.5} />
              <span>Certificate Records ({stats?.total_certificates || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
                activeTab === 'audit'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                  : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" strokeWidth={2.5} />
              <span>MongoDB Audit Logs ({auditLogs.length})</span>
            </button>
          </div>

          {activeTab === 'audit' ? (
            /* AUDIT LOGS TABLE */
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <span>Live MongoDB Audit Trail</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Real-time log documents persisted directly in MongoDB audit_logs collection</p>
                </div>
              </div>

              {auditLogs.length === 0 ? (
                <div className="text-center py-16 bg-slate-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                  <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
                  <h3 className="text-base font-black text-gray-700">No MongoDB audit logs recorded yet</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    Events like certificate generation, preview, download, and deletion will automatically appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-gray-200 text-[11px] font-black uppercase tracking-wider text-gray-600">
                        <th className="py-3.5 px-4">Timestamp</th>
                        <th className="py-3.5 px-4">Action</th>
                        <th className="py-3.5 px-4">Certificate ID</th>
                        <th className="py-3.5 px-4">Actor</th>
                        <th className="py-3.5 px-4">Metadata</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white text-xs font-medium">
                      {auditLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-purple-50/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-gray-500 text-[11px]">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-black bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wider">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-cyan-700">
                            {log.cert_id || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-gray-700 font-bold">
                            {log.actor || 'system'}
                          </td>
                          <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px] max-w-xs truncate">
                            {JSON.stringify(log.metadata || {})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* CERTIFICATE RECORDS TABLE */
            <div>
              {/* Table Header & Controls */}
              <div className="flex flex-col gap-5 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Recent Records</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Filter, verify, download, or delete candidate files</p>
                  </div>

                  {stats?.total_certificates > 0 && (
                    <button
                      onClick={handleDeleteAll}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-colors self-start sm:self-auto"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />
                      <span>Delete All Records ({stats.total_certificates})</span>
                    </button>
                  )}
                </div>

            {/* Filter Toolbar */}
            <div className="bg-slate-50 border-2 border-slate-200/80 rounded-2xl p-3 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search candidate name, cert ID, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full px-4 py-2 pl-9 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-cyan-500 transition-all"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" strokeWidth={2.5} />
                </div>

                {/* Type Filter */}
                <select
                  value={filterType}
                  onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="">All Document Types</option>
                  <option value="course_completion">Course Completion</option>
                  <option value="internship">Internship</option>
                  <option value="campus_ambassador">Campus Ambassador</option>
                  <option value="offer_letter">Offer Letter</option>
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="generated">Generated / Active</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="revoked">Revoked</option>
                </select>

                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Filter
                </button>
              </div>

              {(searchTerm || filterType || filterStatus) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('');
                    setFilterStatus('');
                    setPage(1);
                    setTimeout(() => loadDashboardData(), 100);
                  }}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* TABLE DATA */}
          {history.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 rounded-2xl border-2 border-dashed border-gray-200">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
              <h3 className="text-base font-black text-gray-700">No certificates match your query</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Generate a new certificate or offer letter to view records here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-gray-200 text-[11px] font-black uppercase tracking-wider text-gray-600">
                    <th className="py-3.5 px-4">Candidate</th>
                    <th className="py-3.5 px-4">Certificate ID</th>
                    <th className="py-3.5 px-4">Document Type</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Issued Date</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white text-xs font-medium">
                  {history.map((cert) => (
                    <tr key={cert.cert_id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Candidate Name & Initials */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-800 font-black text-xs flex items-center justify-center border border-cyan-300 shrink-0">
                            {getInitials(cert.name)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm leading-tight">{cert.name}</div>
                          </div>
                        </div>
                      </td>

                      {/* Cert ID */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200 select-all">
                          {cert.cert_id || 'HAD-2026-CERT'}
                        </span>
                      </td>

                      {/* Document Type */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${getCertTypeColor(cert.cert_type)}`}>
                          {getCertTypeLabel(cert.cert_type)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getStatusColor(cert.status)}`}>
                          {cert.status === 'generated' && <CheckCircle2 className="w-3 h-3 text-emerald-600" strokeWidth={2.5} />}
                          {cert.status === 'pending_approval' && <Clock className="w-3 h-3 text-amber-600" strokeWidth={2.5} />}
                          {cert.status === 'revoked' && <XCircle className="w-3 h-3 text-red-600" strokeWidth={2.5} />}
                          <span>{(cert.status || 'generated').replace(/_/g, ' ')}</span>
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-gray-600 font-semibold text-xs">
                        {cert.created_at ? new Date(cert.created_at).toLocaleDateString('en-GB') : 'N/A'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View PDF */}
                          <button
                            onClick={() => setPreviewCert(cert)}
                            className="p-1.5 hover:bg-purple-50 text-purple-600 rounded-lg transition-colors border border-transparent hover:border-purple-200"
                            title="View PDF Preview"
                          >
                            <Eye className="w-4 h-4" strokeWidth={2.5} />
                          </button>

                          {/* Download PDF */}
                          <button
                            onClick={() => downloadPdfFile(cert.pdf_url || `/api/certificates/download/${cert.cert_id}/`, cert.name, cert.cert_type)}
                            className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" strokeWidth={2.5} />
                          </button>

                          {/* Send Email */}
                          <button
                            onClick={async () => {
                              const targetEmail = cert.email || prompt(`Enter candidate email for ${cert.name}:`);
                              if (!targetEmail) return;
                              try {
                                const res = await sendCertificateEmail(cert.cert_id, targetEmail);
                                alert(res.message || 'Email sent successfully!');
                              } catch (err) {
                                alert('Error sending email: ' + (err.message || 'Unknown error'));
                              }
                            }}
                            className="p-1.5 hover:bg-teal-50 text-teal-600 rounded-lg transition-colors border border-transparent hover:border-teal-200"
                            title="Send Certificate Email to Candidate"
                          >
                            <Mail className="w-4 h-4" strokeWidth={2.5} />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => setEditCert({ ...cert })}
                            className="p-1.5 hover:bg-cyan-50 text-cyan-600 rounded-lg transition-colors border border-transparent hover:border-cyan-200"
                            title="Edit Certificate Record"
                          >
                            <Pencil className="w-4 h-4" strokeWidth={2.5} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(cert.cert_id, cert.name)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-200"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-1.5 rounded-lg border-2 border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3.5 py-1.5 rounded-lg border-2 border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>

      {/* QUICK PREVIEW LIGHTBOX MODAL */}
      {previewCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-2 border-gray-200 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-gray-100 bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-gray-900">{previewCert.name}</h3>
                <p className="text-xs text-gray-500 font-mono">{previewCert.cert_id} • {getCertTypeLabel(previewCert.cert_type)}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => downloadPdfFile(previewCert.pdf_url, previewCert.name, previewCert.cert_type)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setPreviewCert(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Modal Body: High Res Document Preview */}
            <div className="flex-1 bg-slate-200/60 p-4 overflow-auto flex items-center justify-center min-h-[500px]">
              {(() => {
                const rawCertUrl = previewCert.pdf_url || `/api/certificates/download/${previewCert.cert_id}/`;
                const fullCertUrl = rawCertUrl.startsWith('http') ? rawCertUrl : `${API_BASE_URL.replace(/\/$/, '')}${rawCertUrl.startsWith('/') ? '' : '/'}${rawCertUrl}`;
                return (
                  <PdfPreviewFrame
                    src={`${fullCertUrl.replace('/download/', '/preview/')}#toolbar=0&navpanes=0&view=FitH`}
                    title="Document Preview"
                    className="w-full h-[600px] border-2 border-gray-300 rounded-2xl shadow-md"
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* EDIT CANDIDATE RECORD MODAL */}
      {editCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-2 border-gray-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-100 text-cyan-600 border border-cyan-200">
                  <Pencil className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Edit Candidate Record</h3>
                  <p className="text-xs text-gray-500 font-mono">ID: {editCert.cert_id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditCert(null)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-gray-700 mb-1">Candidate Full Name</label>
                <input
                  type="text"
                  required
                  value={editCert.name || ''}
                  onChange={(e) => setEditCert({ ...editCert, name: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:outline-none text-sm font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editCert.email || ''}
                  onChange={(e) => setEditCert({ ...editCert, email: e.target.value })}
                  placeholder="candidate@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:outline-none text-sm text-gray-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-gray-700 mb-1">Domain / Course</label>
                  <input
                    type="text"
                    value={editCert.domain || ''}
                    onChange={(e) => setEditCert({ ...editCert, domain: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:outline-none text-xs text-gray-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-gray-700 mb-1">Status</label>
                  <select
                    value={editCert.status || 'generated'}
                    onChange={(e) => setEditCert({ ...editCert, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:outline-none text-xs text-gray-900 font-bold bg-white"
                  >
                    <option value="generated">Generated</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="revoked">Revoked</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditCert(null)}
                  className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black uppercase tracking-wider shadow-md transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save & Update Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
