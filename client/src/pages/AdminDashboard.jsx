import React, { useState, useEffect } from 'react';
import { 
  Shield, CheckCircle, XCircle, Clock, Users, Ticket, DollarSign, 
  Search, Filter, Download, Eye, AlertCircle, RefreshCw, Upload, 
  Settings, Award, FileText, ChevronRight, Check, X, Camera, Mail, Trophy,
  HardDrive, Cloud, FolderArchive, Grid, List, ExternalLink, FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';

export const AdminDashboard = ({ setView }) => {
  const [activeTab, setActiveTab] = useState('payments'); // 'payments', 'participants', 'judging', 'settings', 'logs', 'emails'
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Payments Queue States
  const [payments, setPayments] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('UNDER_REVIEW');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null); // for inspect & approval modal
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Participants States
  const [participants, setParticipants] = useState([]);
  const [partSearch, setPartSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('ALL');
  const [roundFilter, setRoundFilter] = useState('ALL');
  const [exportingCsv, setExportingCsv] = useState(false);

  // Photo Submissions & Judging States
  const [adminSubmissions, setAdminSubmissions] = useState([]);
  const [subRoundFilter, setSubRoundFilter] = useState('ALL');
  const [subStatusFilter, setSubStatusFilter] = useState('ALL');
  const [subSearch, setSubSearch] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [scoreCreativity, setScoreCreativity] = useState('20');
  const [scoreTheme, setScoreTheme] = useState('20');
  const [scoreStorytelling, setScoreStorytelling] = useState('20');
  const [scoreTechnical, setScoreTechnical] = useState('20');
  const [scoreFeedback, setScoreFeedback] = useState('');
  const [promoteChoice, setPromoteChoice] = useState('');
  const [scoringLoading, setScoringLoading] = useState(false);

  // Event Settings States
  const [eventSettings, setEventSettings] = useState(null);
  const [newFee, setNewFee] = useState('59');
  const [regOpen, setRegOpen] = useState(true);
  const [qrFile, setQrFile] = useState(null);
  const [qrUploadSuccess, setQrUploadSuccess] = useState(null);

  // Audit Logs & Email Logs States
  const [auditLogs, setAuditLogs] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);

  // 1 TB Media Drive States
  const [driveStats, setDriveStats] = useState(null);
  const [drivePhotos, setDrivePhotos] = useState([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveRoundFilter, setDriveRoundFilter] = useState('ALL');
  const [driveSearch, setDriveSearch] = useState('');
  const [driveSort, setDriveSort] = useState('newest');
  const [driveViewMode, setDriveViewMode] = useState('grid');
  const [selectedDrivePhoto, setSelectedDrivePhoto] = useState(null);
  const [exportingDriveCsv, setExportingDriveCsv] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsData, paymentsData, participantsData, settingsData] = await Promise.all([
        api.getAnalytics(),
        api.getAdminPayments({ status: paymentFilter, search: paymentSearch }),
        api.getParticipants({ college_type: collegeFilter, round_status: roundFilter, search: partSearch }),
        api.getEventSettings()
      ]);

      setAnalytics(analyticsData.metrics);
      setPayments(paymentsData.payments || []);
      setParticipants(participantsData.participants || []);
      setEventSettings(settingsData.event);
      if (settingsData.event?.fee) setNewFee(String(settingsData.event.fee));
      if (settingsData.event?.registration_open !== undefined) setRegOpen(settingsData.event.registration_open);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setError(err.message || 'Failed to fetch administrative data.');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await api.getAuditLogs();
      setAuditLogs(res.logs || []);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    }
  };

  const loadSubmissions = async () => {
    try {
      const res = await api.getAdminSubmissions({
        round: subRoundFilter,
        status: subStatusFilter,
        search: subSearch
      });
      setAdminSubmissions(res.submissions || []);
    } catch (e) {
      console.error('Failed to load submissions:', e);
    }
  };

  const loadEmailLogs = async () => {
    try {
      const res = await api.getEmailLogs();
      setEmailLogs(res.logs || []);
    } catch (e) {
      console.error('Failed to load email logs:', e);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const csvText = await api.exportParticipantsCsv({
        college_type: collegeFilter,
        round_status: roundFilter,
        search: partSearch
      });
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `pixel_2026_participants_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV via blob, falling back to direct URL:', err);
      try {
        const directUrl = api.getExportCsvUrl({
          college_type: collegeFilter,
          round_status: roundFilter,
          search: partSearch
        });
        window.open(directUrl, '_blank');
      } catch (fallbackErr) {
        alert('Failed to export CSV: ' + (err.message || 'Please try again.'));
      }
    } finally {
      setExportingCsv(false);
    }
  };

  const loadDriveData = async () => {
    setDriveLoading(true);
    try {
      const [statsRes, photosRes] = await Promise.all([
        api.getDriveStats(),
        api.getDrivePhotos({
          round: driveRoundFilter,
          search: driveSearch,
          sort: driveSort
        })
      ]);
      setDriveStats(statsRes.drive);
      setDrivePhotos(photosRes.photos || []);
    } catch (e) {
      console.error('Failed to load drive data:', e);
    } finally {
      setDriveLoading(false);
    }
  };

  const handleExportDriveCsv = async () => {
    try {
      setExportingDriveCsv(true);
      const csvText = await api.exportDriveCsv({
        round: driveRoundFilter,
        search: driveSearch
      });
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `pixel_2026_photo_drive_1tb_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export drive CSV:', err);
      alert('Failed to export Drive CSV: ' + (err.message || 'Please try again.'));
    } finally {
      setExportingDriveCsv(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [paymentFilter, collegeFilter, roundFilter]);

  useEffect(() => {
    if (activeTab === 'logs') {
      loadAuditLogs();
    } else if (activeTab === 'judging') {
      loadSubmissions();
    } else if (activeTab === 'emails') {
      loadEmailLogs();
    } else if (activeTab === 'drive') {
      loadDriveData();
    }
  }, [activeTab, subRoundFilter, subStatusFilter, driveRoundFilter, driveSort]);

  const handleScoreSubmission = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    setScoringLoading(true);
    try {
      const payload = {
        score_creativity: parseFloat(scoreCreativity || 0),
        score_theme: parseFloat(scoreTheme || 0),
        score_storytelling: parseFloat(scoreStorytelling || 0),
        score_technical: parseFloat(scoreTechnical || 0),
        feedback: scoreFeedback.trim(),
        promote_to_round: promoteChoice || undefined
      };

      await api.scoreSubmission(selectedSubmission.id, payload);
      alert('Photo evaluated and score published successfully!');
      setSelectedSubmission(null);
      loadSubmissions();
    } catch (err) {
      alert(err.message || 'Failed to submit score.');
    } finally {
      setScoringLoading(false);
    }
  };

  // Handler for Payment Approval
  const handleApprovePayment = async (paymentId) => {
    if (!window.confirm('Confirm approving this payment? An authentic E-Ticket will be generated immediately for this participant.')) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.approvePayment(paymentId);
      alert(res.message || 'Payment approved and ticket issued!');
      setSelectedPayment(null);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to approve payment.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handler for Payment Rejection
  const handleRejectPayment = async (paymentId) => {
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason to guide the participant.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.rejectPayment(paymentId, rejectReason.trim());
      alert(res.message || 'Payment marked as rejected.');
      setSelectedPayment(null);
      setRejectReason('');
      setShowRejectInput(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to reject payment.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handler for Round Promotion
  const handlePromoteRound = async (participantId, currentRound) => {
    const nextRoundMap = {
      ROUND_1: 'ROUND_2',
      ROUND_2: 'ROUND_3',
      ROUND_3: 'WINNER_1ST'
    };
    const nextRound = nextRoundMap[currentRound] || 'ROUND_1';

    try {
      await api.updateParticipantRound(participantId, nextRound);
      alert(`Participant promoted to ${nextRound}!`);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update round.');
    }
  };

  // Handler for Updating Settings
  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      await api.updateSettings({
        participation_fee: parseFloat(newFee),
        registration_open: regOpen
      });
      alert('Event settings updated successfully.');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update settings.');
    }
  };

  // Handler for Uploading new QR Code
  const handleUploadQr = async (e) => {
    e.preventDefault();
    if (!qrFile) return;

    const formData = new FormData();
    formData.append('qr_code', qrFile);

    try {
      const res = await api.uploadQrCode(formData);
      setQrUploadSuccess('Official payment QR code updated successfully!');
      setQrFile(null);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to upload QR code.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Admin Title & Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-pixel-yellow text-black flex items-center gap-1.5 shadow-neon-yellow">
              <Shield className="w-3.5 h-3.5" /> Administrator Command Center
            </span>
            <span className="text-xs font-mono text-slate-400">PIXEL 2026</span>
          </div>
          <h1 className="text-3xl font-brand font-black text-white">
            EVENT MANAGEMENT & VERIFICATION
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/95 px-2.5 py-1 rounded-xl shadow-sm border border-white/20 hidden md:flex items-center">
            <img src="/ln_universe_logo.png" alt="LN Universe" className="h-6 w-auto object-contain" />
          </div>
          <button
            onClick={() => setView('verify')}
            className="px-4 py-2.5 rounded-xl bg-pixel-cyan hover:bg-cyan-400 text-black text-xs font-bold font-mono flex items-center gap-1.5 shadow-neon-cyan transition-all"
          >
            <Camera className="w-4 h-4" />
            Gate Scanner
          </button>
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-dark-900 hover:bg-dark-800 border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* METRICS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* Total Registrations */}
        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase">Total Registered</span>
            <Users className="w-4 h-4 text-pixel-cyan" />
          </div>
          <p className="text-2xl font-brand font-black text-white">
            {analytics?.totalRegistrations || 0}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">LNCT & Others</span>
        </div>

        {/* Pending Reviews (HIGHLIGHTED!) */}
        <div className="glass-panel p-4 rounded-2xl border border-pixel-yellow/50 bg-amber-500/5 shadow-neon-yellow/10">
          <div className="flex items-center justify-between text-pixel-yellow mb-2">
            <span className="text-[10px] font-mono uppercase font-bold">Pending Review</span>
            <Clock className="w-4 h-4 animate-spin" />
          </div>
          <p className="text-2xl font-brand font-black text-pixel-yellow">
            {analytics?.pendingReviews || 0}
          </p>
          <span className="text-[10px] text-amber-300 font-mono">Requires Action</span>
        </div>

        {/* Verified Payments */}
        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase">Verified Paid</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-brand font-black text-emerald-400">
            {analytics?.verifiedPayments || 0}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">Approved</span>
        </div>

        {/* Tickets Issued */}
        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase">Tickets Issued</span>
            <Ticket className="w-4 h-4 text-pixel-magenta" />
          </div>
          <p className="text-2xl font-brand font-black text-white">
            {analytics?.ticketsIssued || 0}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">Active Passes</span>
        </div>

        {/* Checked In */}
        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase">Checked In</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-brand font-black text-white">
            {analytics?.checkedInCount || 0}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">At Venue</span>
        </div>

        {/* Total Revenue */}
        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase">Total Revenue</span>
            <DollarSign className="w-4 h-4 text-pixel-yellow" />
          </div>
          <p className="text-2xl font-brand font-black text-pixel-yellow">
            ₹{analytics?.totalRevenue || 0}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">Verified Collections</span>
        </div>

      </div>

      {/* ADMIN TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'bg-pixel-yellow text-black shadow-neon-yellow'
              : 'bg-dark-900 text-slate-300 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Payment Review Queue ({analytics?.pendingReviews || 0})
        </button>

        <button
          onClick={() => setActiveTab('participants')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
            activeTab === 'participants'
              ? 'bg-pixel-cyan text-black shadow-neon-cyan'
              : 'bg-dark-900 text-slate-300 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          All Participants ({analytics?.totalRegistrations || 0})
        </button>

        <button
          onClick={() => setActiveTab('drive')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 border ${
            activeTab === 'drive'
              ? 'bg-gradient-to-r from-pixel-cyan to-blue-500 text-black border-transparent shadow-neon-cyan'
              : 'bg-dark-900 text-slate-300 hover:text-white border-pixel-cyan/40 hover:border-pixel-cyan'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5 text-pixel-cyan" />
          <span>1 TB Media Drive</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-pixel-cyan font-mono font-bold">
            1 TB
          </span>
        </button>

        <button
          onClick={() => setActiveTab('judging')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
            activeTab === 'judging'
              ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
              : 'bg-dark-900 text-slate-300 hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Judging & Submissions ({adminSubmissions.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-pixel-magenta text-white shadow-neon-magenta'
              : 'bg-dark-900 text-slate-300 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Event Fee & Payment QR
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-slate-200 text-black'
              : 'bg-dark-900 text-slate-300 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Audit Trail
        </button>

        <button
          onClick={() => setActiveTab('emails')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
            activeTab === 'emails'
              ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/20'
              : 'bg-dark-900 text-slate-300 hover:text-white'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Email Deliveries ({emailLogs.length})
        </button>
      </div>

      {/* TAB 1: PAYMENT REVIEW QUEUE (PRIORITIZED!) */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              {['UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'ALL'].map((status) => (
                <button
                  key={status}
                  onClick={() => setPaymentFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    paymentFilter === status
                      ? 'bg-dark-800 text-pixel-yellow border border-pixel-yellow/40'
                      : 'bg-dark-900 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search UTR, name, reg ID..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-pixel-yellow"
              />
            </div>
          </div>

          {/* Payments Table */}
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-900 border-b border-white/10 text-slate-400 font-mono uppercase text-[11px]">
                  <tr>
                    <th className="p-4">Participant</th>
                    <th className="p-4">Registration ID</th>
                    <th className="p-4">UTR / Transaction ID</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Submitted At</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-500">
                        No payments found in this view.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-dark-900/50 transition-colors">
                        <td className="p-4">
                          <p className="font-bold font-sans text-white text-sm">{p.participant_name}</p>
                          <p className="text-[11px] text-slate-400">{p.college_name} • {p.participant_mobile}</p>
                        </td>
                        <td className="p-4 text-pixel-yellow font-bold">
                          {p.registration_id}
                        </td>
                        <td className="p-4 text-white">
                          <span className="bg-dark-900 px-2 py-1 rounded border border-white/10">
                            {p.transaction_ref}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-white">
                          ₹{p.amount}
                        </td>
                        <td className="p-4">
                          {p.status === 'UNDER_REVIEW' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              UNDER REVIEW
                            </span>
                          )}
                          {p.status === 'VERIFIED' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              VERIFIED (TKT: {p.ticket_number || 'ISSUED'})
                            </span>
                          )}
                          {p.status === 'REJECTED' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              REJECTED
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-400 text-[11px]">
                          {new Date(p.created_at).toLocaleString('en-IN')}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedPayment(p);
                              setShowRejectInput(false);
                              setRejectReason('');
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-pixel-yellow/15 text-pixel-yellow hover:bg-pixel-yellow hover:text-black font-sans font-bold text-xs transition-colors"
                          >
                            Review & Verify
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: PARTICIPANTS MANAGEMENT */}
      {activeTab === 'participants' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={collegeFilter}
                onChange={(e) => setCollegeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white"
              >
                <option value="ALL">All Colleges</option>
                <option value="LNCT">LNCT Group Only</option>
                <option value="OTHER">Other Colleges Only</option>
              </select>

              <select
                value={roundFilter}
                onChange={(e) => setRoundFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white"
              >
                <option value="ALL">All Rounds</option>
                <option value="ROUND_1">Round 1 (One Frame One Story)</option>
                <option value="ROUND_2">Round 2 (Shutter Hunt)</option>
                <option value="ROUND_3">Round 3 (Final Exhibition)</option>
                <option value="WINNER_1ST">1st Place Winner</option>
              </select>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={exportingCsv}
                className="px-4 py-2 rounded-xl bg-dark-900 hover:bg-dark-800 border border-pixel-yellow/40 hover:border-pixel-yellow text-xs font-mono font-bold text-pixel-yellow hover:text-white flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                title="Download full participant call-sheet in Excel / CSV format"
              >
                <Download className={`w-3.5 h-3.5 ${exportingCsv ? 'animate-bounce' : ''}`} />
                <span>{exportingCsv ? 'Exporting...' : 'Export CSV'}</span>
              </button>
            </div>
          </div>

          {/* Participants Table */}
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-900 border-b border-white/10 text-slate-400 font-mono uppercase text-[11px]">
                  <tr>
                    <th className="p-4">Reg ID</th>
                    <th className="p-4">Participant Details</th>
                    <th className="p-4">College & Year</th>
                    <th className="p-4">Payment Status</th>
                    <th className="p-4">Round Status</th>
                    <th className="p-4 text-right">Round Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {participants.map((pt) => (
                    <tr key={pt.id} className="hover:bg-dark-900/50 transition-colors">
                      <td className="p-4 text-pixel-yellow font-bold">
                        {pt.registration_id}
                      </td>
                      <td className="p-4 font-sans">
                        <p className="font-bold text-white text-sm">{pt.full_name}</p>
                        <p className="text-xs text-slate-400">{pt.email} • {pt.mobile}</p>
                      </td>
                      <td className="p-4 font-sans">
                        <p className="text-white">{pt.college_name}</p>
                        <p className="text-xs text-slate-400">{pt.course} ({pt.academic_year})</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          pt.payment_status === 'VERIFIED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : pt.payment_status === 'UNDER_REVIEW'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : 'bg-dark-800 text-slate-400'
                        }`}>
                          {pt.payment_status || 'NOT SUBMITTED'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pixel-cyan/10 text-pixel-cyan border border-pixel-cyan/30">
                          {pt.round_status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handlePromoteRound(pt.id, pt.round_status)}
                          className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-white font-sans text-xs transition-colors"
                        >
                          Advance Next Round ➔
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EVENT SETTINGS & PAYMENT QR UPLOAD */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Fee & Registration Toggle Form */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-xl font-brand font-black text-white">
                EVENT FEE & REGISTRATION CONTROLS
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure event entry fee and registration availability.
              </p>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Participation Fee (INR)
                </label>
                <input
                  type="number"
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-dark-900 border border-white/10 text-white font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regOpen}
                    onChange={(e) => setRegOpen(e.target.checked)}
                    className="w-4 h-4 rounded bg-dark-900 text-pixel-yellow"
                  />
                  <span className="text-sm text-slate-200 font-medium">
                    Registrations Open for Students
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-pixel-yellow text-black font-display font-bold text-xs uppercase shadow-neon-yellow"
              >
                Save Settings
              </button>
            </form>
          </div>

          {/* Upload Official Payment QR Code */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-xl font-brand font-black text-white">
                OFFICIAL PAYMENT QR CODE
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Replace or update the active event UPI payment QR code image.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <img
                src={eventSettings?.payment_qr_path || '/official_payment_qr.jpg'}
                alt="Active QR"
                className="w-28 h-28 object-contain rounded-xl border border-white/10 bg-white p-1"
              />
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-bold text-white">Currently Active QR Code</p>
                <p className="text-slate-400 font-mono">{eventSettings?.payment_qr_path}</p>
              </div>
            </div>

            {qrUploadSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                {qrUploadSuccess}
              </div>
            )}

            <form onSubmit={handleUploadQr} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Upload Replacement QR Code Image
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setQrFile(e.target.files[0])}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-dark-800 file:text-pixel-cyan hover:file:bg-dark-700"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!qrFile}
                className="w-full py-3 rounded-xl bg-pixel-cyan text-black font-display font-bold text-xs uppercase shadow-neon-cyan disabled:opacity-50"
              >
                Upload & Activate New QR Code
              </button>
            </form>
          </div>

        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <h3 className="text-xl font-brand font-black text-white">
            ADMINISTRATIVE AUDIT LOG
          </h3>
          <p className="text-xs text-slate-400">
            Chronological record of payment decisions, ticket issuances, check-ins, and config updates.
          </p>

          <div className="divide-y divide-white/5 font-mono text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-pixel-yellow uppercase mr-2">{log.action}</span>
                  <span className="text-slate-300">{log.details}</span>
                </div>
                <div className="text-slate-500 text-[11px] shrink-0">
                  {new Date(log.timestamp).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: 1 TB MEDIA DRIVE & PHOTO VAULT */}
      {activeTab === 'drive' && (
        <div className="space-y-6">
          
          {/* Storage Capacity & Drive Overview Banner */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-pixel-cyan/30 bg-gradient-to-br from-dark-900 via-dark-950 to-dark-900 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-pixel-cyan/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-pixel-cyan/20 text-pixel-cyan border border-pixel-cyan/40 flex items-center gap-1.5 shadow-neon-cyan">
                    <Cloud className="w-3.5 h-3.5" /> High-Capacity Media Cloud
                  </span>
                  <span className="text-xs font-mono text-slate-400">PIXEL Official Storage</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-brand font-black text-white flex items-center gap-3">
                  <span>1 TB PHOTO VAULT & REPOSITORY</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                  Dedicated 1,024 GB high-performance storage vault receiving all participant submissions, full camera EXIF/equipment specifications, 60-second storytelling pitches, and uncompressed festival photographs.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportDriveCsv}
                  disabled={exportingDriveCsv}
                  className="px-4 py-2.5 rounded-xl bg-dark-900 hover:bg-dark-800 border border-pixel-yellow/40 hover:border-pixel-yellow text-xs font-mono font-bold text-pixel-yellow hover:text-white flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
                  title="Download complete photo catalog manifest with all student information and camera details in CSV format"
                >
                  <FileSpreadsheet className={`w-4 h-4 ${exportingDriveCsv ? 'animate-bounce' : ''}`} />
                  <span>{exportingDriveCsv ? 'Exporting...' : 'Export Manifest (CSV)'}</span>
                </button>

                <a
                  href={api.getDriveZipUrl(driveRoundFilter)}
                  className="px-4 py-2.5 rounded-xl bg-pixel-cyan hover:bg-cyan-400 text-black text-xs font-mono font-bold flex items-center gap-2 shadow-neon-cyan transition-all"
                  title="Download all high-res photos in this view bundled into a clean ZIP archive with folder structure"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>Download Drive Archive (.ZIP)</span>
                </a>

                <button
                  type="button"
                  onClick={loadDriveData}
                  className="p-2.5 rounded-xl bg-dark-900 hover:bg-dark-800 border border-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Refresh Drive Stats"
                >
                  <RefreshCw className={`w-4 h-4 ${driveLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Storage Progress Bar & Metrics */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-slate-300 gap-1">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-pixel-cyan" />
                  <span>STORAGE UTILIZATION: <strong className="text-white">{driveStats?.usedFormatted || '0 Bytes'}</strong> of <strong className="text-pixel-cyan">1,024 GB (1.00 TB)</strong></span>
                </div>
                <div className="text-slate-400">
                  <span>Available: <strong className="text-emerald-400">{driveStats?.availableFormatted || '1,024 GB'}</strong> free ({driveStats?.usedPercentage || '0.00%'} used)</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-dark-950 border border-white/10 overflow-hidden p-0.5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-pixel-cyan via-pixel-yellow to-emerald-400 shadow-neon-cyan transition-all duration-500"
                  style={{ width: `${Math.max(0.5, parseFloat(driveStats?.usedPercentage || '0'))}%` }}
                ></div>
              </div>

              {/* Breakdown Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-dark-950/60 border border-white/5 space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Total Photos Received</span>
                  <p className="text-lg font-brand font-black text-white">{driveStats?.totalPhotos || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-dark-950/60 border border-white/5 space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Round 1 (One Frame)</span>
                  <p className="text-lg font-brand font-black text-pixel-yellow">{driveStats?.breakdown?.round1 || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-dark-950/60 border border-white/5 space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Round 2 (Shutter Hunt)</span>
                  <p className="text-lg font-brand font-black text-pixel-cyan">{driveStats?.breakdown?.round2 || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-dark-950/60 border border-white/5 space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Round 3 (Exhibition)</span>
                  <p className="text-lg font-brand font-black text-pixel-magenta">{driveStats?.breakdown?.round3 || 0}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Drive Search, Filters & View Toggle */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by Title, Name, Reg ID, Camera..."
                  value={driveSearch}
                  onChange={(e) => setDriveSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadDriveData()}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pixel-cyan"
                />
              </div>

              <select
                value={driveRoundFilter}
                onChange={(e) => setDriveRoundFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white"
              >
                <option value="ALL">All Competition Rounds</option>
                <option value="1">Round 1 (One Frame, One Story)</option>
                <option value="2">Round 2 (The Shutter Hunt)</option>
                <option value="3">Round 3 (Final Exhibition)</option>
              </select>

              <select
                value={driveSort}
                onChange={(e) => setDriveSort(e.target.value)}
                className="px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="score_desc">Sort: Highest Score</option>
              </select>
            </div>

            {/* View Switcher: Grid vs Table */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <span className="text-xs font-mono text-slate-400">View:</span>
              <div className="flex items-center rounded-xl bg-dark-900 border border-white/10 p-0.5">
                <button
                  type="button"
                  onClick={() => setDriveViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${driveViewMode === 'grid' ? 'bg-pixel-cyan text-black' : 'text-slate-400 hover:text-white'}`}
                  title="Grid Gallery View"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDriveViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${driveViewMode === 'table' ? 'bg-pixel-cyan text-black' : 'text-slate-400 hover:text-white'}`}
                  title="Detailed List Table View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Drive Content */}
          {driveLoading ? (
            <div className="text-center py-16 text-slate-400 font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-pixel-cyan" />
              Loading high-resolution repository...
            </div>
          ) : drivePhotos.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl border border-white/10 text-center space-y-3">
              <HardDrive className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-300 font-mono text-sm">No photos found matching your current filter.</p>
              <p className="text-slate-500 text-xs">When participants submit photos, they will automatically appear here with complete camera and storytelling information.</p>
            </div>
          ) : driveViewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {drivePhotos.map((photo) => (
                <div
                  key={photo.submission_id}
                  className="glass-panel rounded-2xl border border-white/10 hover:border-pixel-cyan/50 overflow-hidden flex flex-col justify-between transition-all group hover:shadow-neon-cyan"
                >
                  {/* Photo Thumbnail */}
                  <div 
                    onClick={() => setSelectedDrivePhoto(photo)}
                    className="relative aspect-video sm:aspect-square bg-dark-950 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={photo.photo_path}
                      alt={photo.photo_title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-80 group-hover:opacity-90 transition-opacity"></div>
                    
                    {/* Top Badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/70 backdrop-blur-md text-pixel-yellow border border-pixel-yellow/30">
                        R{photo.round_number}
                      </span>
                      {photo.file_size_formatted && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/70 backdrop-blur-md text-slate-300 border border-white/10">
                          {photo.file_size_formatted}
                        </span>
                      )}
                    </div>

                    {photo.submission_status === 'SCORED' && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/90 text-black shadow-sm">
                          ★ {photo.total_score}/100
                        </span>
                      </div>
                    )}

                    {/* Bottom Title on Image */}
                    <div className="absolute bottom-2 left-2 right-2">
                      <h4 className="text-sm font-brand font-bold text-white line-clamp-1 group-hover:text-pixel-cyan transition-colors">
                        "{photo.photo_title}"
                      </h4>
                      <p className="text-[11px] text-slate-300 font-sans line-clamp-1">
                        By {photo.participant_name}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Content */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between bg-dark-900/60">
                    <div className="space-y-2">
                      {/* Camera Specs Pill */}
                      {photo.camera_details ? (
                        <div className="text-[11px] font-mono text-pixel-cyan bg-pixel-cyan/10 px-2 py-1 rounded-lg border border-pixel-cyan/20 truncate" title={photo.camera_details}>
                          📷 {photo.camera_details}
                        </div>
                      ) : (
                        <div className="text-[11px] font-mono text-slate-500 italic">
                          📷 Device info not specified
                        </div>
                      )}

                      {/* Pitch Snippet */}
                      {photo.story_pitch && (
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed" title={photo.story_pitch}>
                          "{photo.story_pitch}"
                        </p>
                      )}

                      {/* Participant Details */}
                      <div className="pt-2 border-t border-white/5 space-y-1 text-[11px] text-slate-400">
                        <div className="flex justify-between">
                          <span className="font-mono text-slate-500">Reg ID:</span>
                          <span className="font-mono text-pixel-yellow font-bold">{photo.registration_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-mono text-slate-500">College:</span>
                          <span className="text-slate-300 truncate max-w-[140px]" title={photo.college_name}>{photo.college_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-mono text-slate-500">Contact:</span>
                          <span className="text-slate-300">{photo.participant_mobile}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDrivePhoto(photo)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-dark-800 hover:bg-dark-700 text-xs font-mono font-medium text-slate-200 border border-white/10 hover:border-pixel-cyan flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-pixel-cyan" />
                        <span>Inspect</span>
                      </button>

                      <a
                        href={photo.photo_path}
                        download={`${photo.registration_id}_R${photo.round_number}_${photo.photo_title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-1.5 px-3 rounded-xl bg-dark-800 hover:bg-dark-700 text-xs font-mono font-medium text-slate-200 border border-white/10 hover:border-pixel-yellow flex items-center justify-center gap-1.5 transition-colors"
                        title="Download Master Image"
                      >
                        <Download className="w-3.5 h-3.5 text-pixel-yellow" />
                      </a>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            /* TABLE LIST VIEW */
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-dark-900 border-b border-white/10 text-slate-400 font-mono uppercase text-[11px]">
                    <tr>
                      <th className="p-4">Photo Preview</th>
                      <th className="p-4">Participant & College</th>
                      <th className="p-4">Round</th>
                      <th className="p-4">Title & Story Pitch</th>
                      <th className="p-4">Camera Specs</th>
                      <th className="p-4">File Size</th>
                      <th className="p-4">Score</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {drivePhotos.map((photo) => (
                      <tr key={photo.submission_id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <img
                            src={photo.photo_path}
                            alt={photo.photo_title}
                            onClick={() => setSelectedDrivePhoto(photo)}
                            className="w-16 h-12 object-cover rounded-lg border border-white/10 cursor-pointer hover:scale-105 transition-transform"
                          />
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-white">{photo.participant_name}</div>
                          <div className="font-mono text-[11px] text-pixel-yellow">{photo.registration_id}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{photo.college_name}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-dark-800 border border-white/10 text-pixel-cyan">
                            Round {photo.round_number}
                          </span>
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="font-bold text-slate-200 truncate">"{photo.photo_title}"</div>
                          <div className="text-[11px] text-slate-400 line-clamp-1 italic">{photo.story_pitch || 'No pitch provided'}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-mono text-[11px] text-slate-300 max-w-[160px] truncate">
                            {photo.camera_details || 'N/A'}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-slate-300">
                          {photo.file_size_formatted}
                        </td>
                        <td className="p-4 font-mono font-bold">
                          {photo.submission_status === 'SCORED' ? (
                            <span className="text-amber-300">{photo.total_score} / 100</span>
                          ) : (
                            <span className="text-slate-500 font-normal">Pending</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedDrivePhoto(photo)}
                              className="px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-200 border border-white/10"
                              title="Inspect Photo & Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={photo.photo_path}
                              download={`${photo.registration_id}_R${photo.round_number}.jpg`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-pixel-yellow border border-pixel-yellow/30"
                              title="Download Master Image"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INSPECTOR & FULL DOSSIER LIGHTBOX MODAL */}
          {selectedDrivePhoto && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
              <div className="bg-dark-900 border border-white/20 rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row overflow-hidden">
                
                {/* Left Side: High-Res Photo Lightbox */}
                <div className="md:w-3/5 bg-black flex flex-col items-center justify-center p-4 relative min-h-[300px] md:min-h-[500px]">
                  <img
                    src={selectedDrivePhoto.photo_path}
                    alt={selectedDrivePhoto.photo_title}
                    className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
                  />
                  
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-black/80 backdrop-blur-md text-pixel-cyan border border-pixel-cyan/40">
                      Round {selectedDrivePhoto.round_number}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-mono bg-black/80 backdrop-blur-md text-slate-300 border border-white/10">
                      {selectedDrivePhoto.file_size_formatted}
                    </span>
                  </div>

                  <a
                    href={selectedDrivePhoto.photo_path}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-4 right-4 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md text-slate-300 hover:text-white border border-white/20 text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Full Size Tab
                  </a>
                </div>

                {/* Right Side: Participant & Photo Dossier */}
                <div className="md:w-2/5 p-6 sm:p-8 space-y-6 flex flex-col justify-between bg-dark-900 border-t md:border-t-0 md:border-l border-white/10">
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                      <div>
                        <h3 className="text-xl font-brand font-black text-white">
                          "{selectedDrivePhoto.photo_title}"
                        </h3>
                        <p className="text-xs font-mono text-pixel-cyan mt-0.5">
                          {selectedDrivePhoto.round_title}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDrivePhoto(null)}
                        className="p-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-400 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Participant Information */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-pixel-yellow font-bold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Participant Details
                      </h4>
                      <div className="p-3.5 rounded-xl bg-dark-950/70 border border-white/5 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Name:</span>
                          <span className="font-bold text-white">{selectedDrivePhoto.participant_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Registration ID:</span>
                          <span className="font-mono text-pixel-yellow font-bold">{selectedDrivePhoto.registration_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">College:</span>
                          <span className="text-slate-200">{selectedDrivePhoto.college_name} ({selectedDrivePhoto.college_type})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Course & Year:</span>
                          <span className="text-slate-200">{selectedDrivePhoto.course} • {selectedDrivePhoto.academic_year}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Student ID:</span>
                          <span className="font-mono text-slate-200">{selectedDrivePhoto.student_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Phone:</span>
                          <span className="text-slate-200">{selectedDrivePhoto.participant_mobile}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Email:</span>
                          <span className="text-slate-200">{selectedDrivePhoto.participant_email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Camera & Equipment */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-pixel-cyan font-bold flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" /> Camera & Equipment
                      </h4>
                      <div className="p-3 rounded-xl bg-dark-950/70 border border-white/5 text-xs font-mono text-slate-300">
                        {selectedDrivePhoto.camera_details || 'Device specifications not provided by participant.'}
                      </div>
                    </div>

                    {/* Storytelling Pitch */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                        60-Second Storytelling Pitch
                      </h4>
                      <div className="p-3.5 rounded-xl bg-dark-950/70 border border-white/5 text-xs text-slate-300 leading-relaxed max-h-36 overflow-y-auto">
                        {selectedDrivePhoto.story_pitch || 'No storytelling notes provided for this photograph.'}
                      </div>
                    </div>

                    {/* Score (if scored) */}
                    {selectedDrivePhoto.submission_status === 'SCORED' && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-amber-300 uppercase">Jury Score</span>
                          <span className="text-base font-brand font-black text-amber-400">
                            {selectedDrivePhoto.total_score} / 100
                          </span>
                        </div>
                        {selectedDrivePhoto.judge_feedback && (
                          <p className="text-xs text-slate-300 italic">
                            "{selectedDrivePhoto.judge_feedback}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="pt-4 border-t border-white/10 flex items-center gap-3">
                    <a
                      href={api.getDrivePhotoDownloadUrl(selectedDrivePhoto.id || selectedDrivePhoto.submission_id)}
                      className="flex-1 py-3 px-4 rounded-xl font-display font-bold text-xs bg-pixel-yellow hover:bg-pixel-yellowHover text-black shadow-neon-yellow flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>DOWNLOAD HIGH-RES MASTER</span>
                    </a>
                  </div>

                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB: JUDGING & PHOTO SUBMISSIONS */}
      {activeTab === 'judging' && (
        <div className="space-y-6">
          {/* Filters & Actions */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search photo, participant, ID..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadSubmissions()}
                  className="w-full bg-dark-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-pixel-yellow"
                />
              </div>

              <select
                value={subRoundFilter}
                onChange={(e) => setSubRoundFilter(e.target.value)}
                className="bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pixel-yellow font-mono"
              >
                <option value="ALL">All Rounds</option>
                <option value="1">Round 1</option>
                <option value="2">Round 2</option>
                <option value="3">Round 3</option>
              </select>

              <select
                value={subStatusFilter}
                onChange={(e) => setSubStatusFilter(e.target.value)}
                className="bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pixel-yellow font-mono"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Pending Evaluation</option>
                <option value="SCORED">Evaluated / Scored</option>
              </select>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                onClick={loadSubmissions}
                className="px-3.5 py-2 rounded-xl bg-dark-800 text-slate-300 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
          </div>

          {/* Submissions Cards Grid */}
          {adminSubmissions.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-3">
              <Camera className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-300">No Submissions Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No photography entries match your active filters. Try switching rounds or searching for another participant.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="glass-panel rounded-2xl border border-white/10 hover:border-white/25 transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Photo Container */}
                    <div className="relative h-52 bg-slate-950 overflow-hidden group">
                      <img
                        src={sub.photo_path}
                        alt={sub.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                        onClick={() => window.open(sub.photo_path, '_blank')}
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-dark-900/90 text-pixel-yellow border border-pixel-yellow/30 backdrop-blur-md">
                          ROUND {sub.round_number}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold backdrop-blur-md ${
                          sub.status === 'SCORED'
                            ? 'bg-emerald-500/80 text-white'
                            : 'bg-amber-500/80 text-black'
                        }`}>
                          {sub.status}
                        </span>
                      </div>

                      {sub.status === 'SCORED' && (
                        <div className="absolute bottom-3 right-3 px-3 py-1 rounded-xl bg-dark-900/90 border border-pixel-yellow/40 backdrop-blur-md font-mono font-black text-pixel-yellow text-sm">
                          {sub.total_score} / 100
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h4 className="font-bold text-white text-base truncate">{sub.title}</h4>
                        <p className="text-xs text-pixel-yellow font-semibold mt-0.5">
                          {sub.participant_name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {sub.registration_id} &bull; {sub.college_name}
                        </p>
                      </div>

                      {sub.caption && (
                        <p className="text-xs text-slate-300 italic line-clamp-2 bg-dark-950/60 p-2 rounded-lg border border-white/5">
                          "{sub.caption}"
                        </p>
                      )}

                      {sub.camera_details && (
                        <div className="text-[11px] font-mono text-slate-400">
                          📷 {sub.camera_details}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 pt-0">
                    <button
                      onClick={() => {
                        setSelectedSubmission(sub);
                        setScoreCreativity(String(sub.score_creativity || 20));
                        setScoreTheme(String(sub.score_theme || 20));
                        setScoreStorytelling(String(sub.score_storytelling || 20));
                        setScoreTechnical(String(sub.score_technical || 20));
                        setScoreFeedback(sub.judge_feedback || '');
                        setPromoteChoice('');
                      }}
                      className="w-full py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider bg-pixel-yellow hover:bg-pixel-yellowHover text-black shadow-neon-yellow transition-all flex items-center justify-center gap-1.5"
                    >
                      <Award className="w-4 h-4" />
                      <span>{sub.status === 'SCORED' ? 'Update Evaluation' : 'Score This Entry'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: EMAIL DELIVERIES AUDIT */}
      {activeTab === 'emails' && (
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-brand font-black text-white">
                EMAIL DISPATCH AUDIT LOG
              </h3>
              <p className="text-xs text-slate-400">
                Log of automated ticket confirmations, rejection notices, and score releases sent via Nodemailer.
              </p>
            </div>
            <button
              onClick={loadEmailLogs}
              className="px-3.5 py-2 rounded-xl bg-dark-800 text-slate-300 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          <div className="divide-y divide-white/5 font-mono text-xs">
            {emailLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No emails dispatched yet.</div>
            ) : (
              emailLogs.map((log) => (
                <div key={log.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'SENT'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : log.status === 'SIMULATED'
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {log.status}
                      </span>
                      <span className="font-bold text-white">{log.recipient_email}</span>
                      <span className="text-slate-500 text-[10px]">[{log.template_name}]</span>
                    </div>
                    <div className="text-slate-300 text-xs font-sans">{log.subject}</div>
                    {log.details && (
                      <div className="text-[10px] text-slate-500 font-mono">{log.details}</div>
                    )}
                  </div>

                  <div className="text-slate-500 text-[11px] shrink-0">
                    {new Date(log.sent_at).toLocaleString('en-IN')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: PHOTO RUBRIC EVALUATION & SCORING */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-4xl w-full border border-white/20 space-y-6 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-400 text-black">
                  ROUND {selectedSubmission.round_number} EVALUATION
                </span>
                <h3 className="text-2xl font-brand font-black text-white mt-1">
                  "{selectedSubmission.title}" &bull; {selectedSubmission.participant_name}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedSubmission(null)}
                className="text-slate-400 hover:text-white p-2"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Photo High-Res Preview (6 cols) */}
              <div className="md:col-span-6 space-y-3">
                <div className="bg-dark-950 rounded-2xl p-2 border border-white/10 overflow-hidden flex items-center justify-center min-h-[300px]">
                  <img
                    src={selectedSubmission.photo_path}
                    alt={selectedSubmission.title}
                    className="max-h-[360px] w-full object-contain rounded-xl"
                  />
                </div>
                {selectedSubmission.caption && (
                  <div className="p-3 rounded-xl bg-dark-900 border border-white/5 text-xs text-slate-300 italic">
                    <strong>Pitch:</strong> "{selectedSubmission.caption}"
                  </div>
                )}
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>{selectedSubmission.college_name}</span>
                  <span>{selectedSubmission.camera_details || 'Camera unlisted'}</span>
                </div>
              </div>

              {/* Rubric Evaluation Form (6 cols) */}
              <form onSubmit={handleScoreSubmission} className="md:col-span-6 space-y-4">
                
                {/* 4 Rubric Criteria */}
                <div className="space-y-3 bg-dark-900/90 p-4 rounded-2xl border border-white/5">
                  <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                    Official Rubric Scoring (0 - 25 pts each)
                  </h4>

                  {/* 1. Creativity */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Creativity & Originality</span>
                      <span className="font-mono font-bold text-pixel-yellow">{scoreCreativity} / 25</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="0.5"
                      value={scoreCreativity}
                      onChange={(e) => setScoreCreativity(e.target.value)}
                      className="w-full accent-pixel-yellow cursor-pointer"
                    />
                  </div>

                  {/* 2. Theme Relevance */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Theme Relevance</span>
                      <span className="font-mono font-bold text-pixel-yellow">{scoreTheme} / 25</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="0.5"
                      value={scoreTheme}
                      onChange={(e) => setScoreTheme(e.target.value)}
                      className="w-full accent-pixel-yellow cursor-pointer"
                    />
                  </div>

                  {/* 3. Storytelling */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Storytelling & Perspective</span>
                      <span className="font-mono font-bold text-pixel-yellow">{scoreStorytelling} / 25</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="0.5"
                      value={scoreStorytelling}
                      onChange={(e) => setScoreStorytelling(e.target.value)}
                      className="w-full accent-pixel-yellow cursor-pointer"
                    />
                  </div>

                  {/* 4. Technical Quality */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Technical Composition</span>
                      <span className="font-mono font-bold text-pixel-yellow">{scoreTechnical} / 25</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="0.5"
                      value={scoreTechnical}
                      onChange={(e) => setScoreTechnical(e.target.value)}
                      className="w-full accent-pixel-yellow cursor-pointer"
                    />
                  </div>

                  {/* Total Live Calculator */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white uppercase">Total Calculated Score:</span>
                    <span className="text-2xl font-mono font-black text-amber-400">
                      {(
                        parseFloat(scoreCreativity || 0) +
                        parseFloat(scoreTheme || 0) +
                        parseFloat(scoreStorytelling || 0) +
                        parseFloat(scoreTechnical || 0)
                      ).toFixed(1)}{' '}
                      <span className="text-xs text-slate-500 font-normal">/ 100</span>
                    </span>
                  </div>
                </div>

                {/* Judge Remarks */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Judge's Constructive Feedback
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Provide constructive feedback, praise on framing, lighting, or story..."
                    value={scoreFeedback}
                    onChange={(e) => setScoreFeedback(e.target.value)}
                    className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-pixel-yellow resize-none"
                  ></textarea>
                </div>

                {/* Round Promotion Dropdown */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Advance Participant to Next Round (Optional)
                  </label>
                  <select
                    value={promoteChoice}
                    onChange={(e) => setPromoteChoice(e.target.value)}
                    className="w-full bg-dark-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-pixel-yellow font-mono"
                  >
                    <option value="">Keep current round status ({selectedSubmission.participant_round_status})</option>
                    <option value="ROUND_2">Shortlist to Round 2 (The Shutter Hunt)</option>
                    <option value="ROUND_3">Shortlist to Round 3 (Final Exhibition)</option>
                    <option value="WINNER_1ST">🏆 Award 1st Prize (Champion)</option>
                    <option value="WINNER_2ND">🥈 Award 2nd Prize (Runner-Up)</option>
                    <option value="WINNER_3RD">🥉 Award 3rd Prize</option>
                  </select>
                </div>

                {/* Submit Evaluation */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href={api.getSubmissionDownloadUrl(selectedSubmission.id)}
                    className="px-4 py-3 rounded-xl bg-dark-800 hover:bg-dark-700 text-pixel-yellow border border-pixel-yellow/30 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    title="Download original high-res photograph"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Photo</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(null)}
                    className="flex-1 py-3 rounded-xl bg-dark-800 text-slate-300 hover:text-white text-xs font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={scoringLoading}
                    className="flex-1 py-3 rounded-xl font-display font-extrabold text-xs uppercase tracking-wider bg-pixel-yellow hover:bg-pixel-yellowHover text-black shadow-neon-yellow transition-all flex items-center justify-center gap-2"
                  >
                    {scoringLoading ? 'Publishing...' : 'Save & Publish Score'}
                  </button>
                </div>

              </form>

            </div>

          </div>
        </div>
      )}

      {/* MODAL: PAYMENT REVIEW, INSPECTION & APPROVAL */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-4xl w-full border border-white/20 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-pixel-yellow text-black">
                  Reviewing Payment Proof
                </span>
                <h3 className="text-2xl font-brand font-black text-white mt-1">
                  {selectedPayment.participant_name} ({selectedPayment.registration_id})
                </h3>
              </div>
              <button 
                onClick={() => setSelectedPayment(null)}
                className="text-slate-400 hover:text-white p-2"
              >
                ✕
              </button>
            </div>

            {/* Side-by-Side Review Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Payment Details (5 Cols) */}
              <div className="md:col-span-5 space-y-4 text-xs font-mono bg-dark-900/90 p-5 rounded-2xl border border-white/5">
                <div className="pb-2 border-b border-white/5">
                  <span className="text-slate-400 block text-[10px] uppercase">Transaction Reference / UTR</span>
                  <span className="text-lg font-bold text-pixel-yellow">{selectedPayment.transaction_ref}</span>
                </div>

                <div className="pb-2 border-b border-white/5">
                  <span className="text-slate-400 block text-[10px] uppercase">Amount Claimed</span>
                  <span className="text-base font-bold text-white">₹{selectedPayment.amount}</span>
                </div>

                <div className="pb-2 border-b border-white/5">
                  <span className="text-slate-400 block text-[10px] uppercase">Payer Account Name</span>
                  <span className="text-white font-sans font-medium">{selectedPayment.payer_name}</span>
                </div>

                <div className="pb-2 border-b border-white/5">
                  <span className="text-slate-400 block text-[10px] uppercase">Participant Contact</span>
                  <span className="text-slate-300 font-sans">{selectedPayment.participant_mobile}</span>
                  <span className="text-slate-400 block text-[11px]">{selectedPayment.participant_email}</span>
                </div>

                <div className="pb-2 border-b border-white/5">
                  <span className="text-slate-400 block text-[10px] uppercase">Institution</span>
                  <span className="text-slate-300 font-sans">{selectedPayment.college_name} ({selectedPayment.college_type})</span>
                </div>

                {selectedPayment.notes && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Participant Notes</span>
                    <span className="text-slate-300 italic font-sans">{selectedPayment.notes}</span>
                  </div>
                )}
              </div>

              {/* Uploaded Payment Screenshot Slip (7 Cols) */}
              <div className="md:col-span-7 space-y-2">
                <p className="text-xs font-mono uppercase text-slate-400">
                  Uploaded Payment Screenshot:
                </p>
                <div className="bg-dark-950 p-2 rounded-2xl border border-white/10 flex items-center justify-center max-h-[50vh] overflow-hidden">
                  <img
                    src={`/api/payments/${selectedPayment.id}/proof`}
                    alt="Payment Screenshot Slip"
                    className="max-h-[48vh] object-contain rounded-lg"
                  />
                </div>
              </div>

            </div>

            {/* Approval / Rejection Action Drawer */}
            <div className="pt-4 border-t border-white/10 space-y-4">
              
              {showRejectInput ? (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                  <label className="block text-xs font-mono text-rose-300 font-bold uppercase">
                    Provide Rejection Reason to Participant *
                  </label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Screenshot blurry, UTR not found in bank ledger, etc."
                    className="w-full px-4 py-2.5 rounded-xl bg-dark-900 border border-rose-500/40 text-white text-xs"
                    required
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(false)}
                      className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectPayment(selectedPayment.id)}
                      disabled={actionLoading}
                      className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setShowRejectInput(true)}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold font-mono transition-colors"
                  >
                    Reject Payment Proof
                  </button>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedPayment(null)}
                      className="flex-1 sm:flex-none px-5 py-3 rounded-xl text-slate-400 hover:text-white text-xs font-mono"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprovePayment(selectedPayment.id)}
                      disabled={actionLoading}
                      className="flex-1 sm:flex-none px-8 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-extrabold font-display tracking-wider shadow-lg flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>APPROVE PAYMENT & ISSUE TICKET</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
