import React, { useState, useEffect } from 'react';
import { 
  Camera, QrCode, Download, Upload, CheckCircle, Clock, AlertCircle, 
  Ticket, ArrowRight, ShieldCheck, RefreshCw, Eye, Sparkles, ExternalLink, Calendar, MapPin
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const ParticipantDashboard = ({ setView }) => {
  const { user, participant, payment, ticket, refreshUser } = useAuth();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showProofModal, setShowProofModal] = useState(false);

  // Payment Form States
  const [transactionRef, setTransactionRef] = useState('');
  const [amount, setAmount] = useState('59');
  const [payerName, setPayerName] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Photo Competition Submission States
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [cameraDetails, setCameraDetails] = useState('');
  const [submissionRound, setSubmissionRound] = useState('1');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [photoSuccess, setPhotoSuccess] = useState(null);

  const fetchSubmissions = async () => {
    if (!ticket) return;
    setLoadingSubmissions(true);
    try {
      const data = await api.getMySubmissions();
      setSubmissions(data.submissions || []);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (ticket) {
      fetchSubmissions();
    }
  }, [ticket]);

  useEffect(() => {
    if (participant?.round_status) {
      if (participant.round_status === 'ROUND_2') setSubmissionRound('2');
      else if (participant.round_status === 'ROUND_3') setSubmissionRound('3');
      else setSubmissionRound('1');
    }
  }, [participant]);

  const handlePhotoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setPhotoError('Photograph file size must be under 15MB.');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setPhotoError(null);
    }
  };

  const handleUploadSubmission = async (e) => {
    e.preventDefault();
    setPhotoError(null);
    setPhotoSuccess(null);

    if (!photoTitle.trim()) {
      return setPhotoError('Please provide a title for your photograph.');
    }

    if (!photoFile) {
      return setPhotoError('Please select a photograph to submit.');
    }

    setSubmittingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('photo', photoFile);
      fd.append('title', photoTitle.trim());
      fd.append('caption', photoCaption.trim());
      fd.append('camera_details', cameraDetails.trim());
      fd.append('round_number', submissionRound);

      const res = await api.uploadSubmission(fd);
      setPhotoSuccess(res.message || 'Photograph submitted successfully!');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

      setPhotoTitle('');
      setPhotoCaption('');
      setCameraDetails('');
      setPhotoFile(null);
      setPhotoPreview(null);

      await fetchSubmissions();
    } catch (err) {
      setPhotoError(err.message || 'Failed to submit photograph.');
    } finally {
      setSubmittingPhoto(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getEventSettings();
        setSettings(data.event);
        if (data.event?.fee) {
          setAmount(String(data.event.fee));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (participant) {
      setPayerName(participant.full_name);
    }
  }, [participant]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Screenshot file size must be under 5MB.');
        return;
      }
      setScreenshotFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!transactionRef.trim()) {
      return setError('Please enter your UPI / Bank Transaction ID (UTR reference).');
    }

    if (!screenshotFile) {
      return setError('Please upload a screenshot of your successful payment confirmation.');
    }

    setSubmittingPayment(true);
    try {
      const formData = new FormData();
      formData.append('transaction_ref', transactionRef.trim());
      formData.append('amount', amount);
      formData.append('payer_name', payerName.trim());
      formData.append('payment_date', paymentDate);
      formData.append('notes', notes.trim());
      formData.append('screenshot', screenshotFile);

      const res = await api.submitPaymentProof(formData);
      setSuccessMsg(res.message || 'Payment proof submitted successfully!');
      
      await refreshUser();

      // Clear file inputs
      setScreenshotFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setError(err.message || 'Failed to submit payment proof.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Determine participant pipeline stage
  const getPipelineStage = () => {
    if (ticket && ticket.status !== 'CANCELLED') return 4; // Ticket Issued
    if (payment?.status === 'VERIFIED') return 3; // Payment Verified
    if (payment?.status === 'UNDER_REVIEW') return 2; // Under Review
    return 1; // Payment Pending
  };

  const currentStage = getPipelineStage();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Participant Welcome & Registration Banner */}
      <div className="rounded-3xl glass-panel-glow p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-pixel-yellow text-black">
              Registration ID: {participant?.registration_id || 'PXL-2026-XXXX'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-dark-900 border border-white/10 text-slate-300">
              {participant?.college_type === 'LNCT' ? 'LNCT Group' : 'Other College'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-brand font-black text-white">
            Welcome, {participant?.full_name || user?.email}!
          </h1>

          <p className="text-xs sm:text-sm text-slate-300">
            {participant?.college_name} • {participant?.course} ({participant?.academic_year})
          </p>
        </div>

        {/* Quick E-Ticket Banner if available */}
        {ticket && ticket.status !== 'CANCELLED' && (
          <div className="z-10 w-full md:w-auto">
            <button
              onClick={() => setView('ticket')}
              className="w-full md:w-auto px-6 py-3.5 rounded-xl font-display font-extrabold text-sm tracking-wider text-black bg-emerald-400 hover:bg-emerald-300 shadow-lg flex items-center justify-center gap-2.5 transition-all"
            >
              <Ticket className="w-5 h-5" />
              <span>VIEW & DOWNLOAD E-TICKET</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-pixel-yellow/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Real-time Status Pipeline Tracker */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10">
        <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-6 font-semibold flex items-center justify-between">
          <span>Registration & Verification Pipeline</span>
          <button 
            onClick={refreshUser}
            className="text-xs text-pixel-cyan hover:underline flex items-center gap-1 font-mono"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
          </button>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          
          {/* Stage 1 */}
          <div className="p-4 rounded-xl bg-dark-900 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Step 1</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="font-bold text-sm text-white">Registration Complete</p>
            <p className="text-[11px] text-slate-400">Profile registered on platform.</p>
          </div>

          {/* Stage 2 */}
          <div className={`p-4 rounded-xl border space-y-2 transition-all ${
            currentStage >= 2 
              ? 'bg-dark-900 border-pixel-yellow/40 text-white' 
              : 'bg-dark-950/60 border-white/5 text-slate-500'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Step 2</span>
              {currentStage > 2 ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : currentStage === 2 ? (
                <Clock className="w-4 h-4 text-pixel-yellow animate-spin" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-600"></div>
              )}
            </div>
            <p className="font-bold text-sm">
              {payment?.status === 'REJECTED' ? 'Payment Rejected' : 'Payment Submission'}
            </p>
            <p className="text-[11px] text-slate-400">
              {payment?.status === 'UNDER_REVIEW' 
                ? 'Proof is under administrator review' 
                : payment?.status === 'REJECTED'
                ? 'Action needed: Resubmit proof'
                : 'Scan official QR & submit UTR'}
            </p>
          </div>

          {/* Stage 3 */}
          <div className={`p-4 rounded-xl border space-y-2 transition-all ${
            currentStage >= 3 
              ? 'bg-dark-900 border-pixel-cyan/40 text-white' 
              : 'bg-dark-950/60 border-white/5 text-slate-500'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Step 3</span>
              {currentStage >= 3 ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-600"></div>
              )}
            </div>
            <p className="font-bold text-sm">Payment Verified</p>
            <p className="text-[11px] text-slate-400">
              {currentStage >= 3 ? 'Transaction confirmed by admin' : 'Awaiting admin verification'}
            </p>
          </div>

          {/* Stage 4 */}
          <div className={`p-4 rounded-xl border space-y-2 transition-all ${
            currentStage >= 4 
              ? 'bg-emerald-950/30 border-emerald-500/50 text-white shadow-lg' 
              : 'bg-dark-950/60 border-white/5 text-slate-500'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Step 4</span>
              {currentStage >= 4 ? (
                <Sparkles className="w-4 h-4 text-emerald-400" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-600"></div>
              )}
            </div>
            <p className="font-bold text-sm text-emerald-300">Ticket Issued</p>
            <p className="text-[11px] text-slate-400">
              {currentStage >= 4 ? 'E-Ticket ready with barcode' : 'Requires verified payment'}
            </p>
          </div>

        </div>
      </div>

      {/* CORE WORKFLOW: PAYMENT & VERIFICATION SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Official QR Code & Instructions (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
            <div className="border-b border-white/10 pb-4">
              <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase bg-pixel-yellow text-black">
                Official Event Payment QR
              </span>
              <h2 className="text-2xl font-brand font-black text-white mt-2">
                SCAN & PAY ENTRY FEE
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Amount payable: <span className="font-mono text-pixel-yellow font-bold text-base">₹{settings?.fee || 59}</span>
              </p>
            </div>

            {/* Official QR Code Card with Download */}
            <div className="p-4 rounded-2xl bg-white text-black flex flex-col items-center justify-center space-y-3 shadow-2xl relative group">
              <img
                src={settings?.payment_qr_path || '/official_payment_qr.jpg'}
                alt="Official Event Payment QR Code"
                className="w-64 h-64 object-contain rounded-xl border border-slate-200"
              />
              <div className="text-center">
                <p className="font-mono font-black text-sm uppercase tracking-wide">
                  LNCT Bhopal • PIXEL 2026
                </p>
                <p className="text-[11px] text-slate-600 font-mono">
                  Accepts GPay, PhonePe, Paytm, BHIM UPI
                </p>
              </div>

              <a
                href={settings?.payment_qr_path || '/official_payment_qr.jpg'}
                download="PIXEL_LNCT_Official_Payment_QR.jpg"
                className="w-full py-2.5 rounded-xl font-display font-bold text-xs bg-dark-900 text-white hover:bg-black flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>DOWNLOAD OFFICIAL QR CODE</span>
              </a>
            </div>

            {/* Payment Steps Instructions */}
            <div className="space-y-3 text-xs text-slate-300">
              <p className="font-mono text-pixel-cyan uppercase font-bold text-[11px]">
                Payment Instructions:
              </p>
              <ol className="list-decimal pl-4 space-y-2">
                <li>Open any UPI App (Google Pay, PhonePe, Paytm, BHIM) on your smartphone.</li>
                <li>Scan the official QR code above and transfer exactly <strong>₹{settings?.fee || 59}</strong>.</li>
                <li>Include your name or Registration ID (<strong>{participant?.registration_id}</strong>) in the payment note/remarks if possible.</li>
                <li>Take a clear screenshot of the successful payment receipt showing the <strong>Transaction/UTR ID</strong>.</li>
                <li>Fill the form on the right and upload the screenshot to request administrative verification.</li>
              </ol>
            </div>

          </div>
        </div>

        {/* Right Column: Payment Submission or Status Review (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* TICKET ISSUED SUCCESS STATE */}
          {ticket && ticket.status !== 'CANCELLED' ? (
            <div className="glass-panel p-8 rounded-3xl border border-emerald-500/40 bg-emerald-950/20 space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-black flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Payment Verified • Ticket Active
                </span>
                <h3 className="text-3xl font-brand font-black text-white">
                  YOUR E-TICKET IS ISSUED!
                </h3>
                <p className="text-sm text-slate-300 max-w-md mx-auto">
                  Ticket Number: <span className="font-mono text-emerald-400 font-bold">{ticket.ticket_number}</span>
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Present your ticket QR pass at the entrance of LNCT Campus on 29 October 2026.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setView('ticket')}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl font-display font-extrabold text-sm tracking-wider text-black bg-emerald-400 hover:bg-emerald-300 shadow-neon-yellow flex items-center justify-center gap-2"
                >
                  <Ticket className="w-5 h-5" />
                  <span>VIEW E-TICKET PASS</span>
                </button>
                <button
                  onClick={() => setView('verify')}
                  className="w-full sm:w-auto px-6 py-4 rounded-xl font-display font-bold text-sm bg-dark-900 text-slate-200 border border-white/10 hover:border-white/30 flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4 text-pixel-cyan" />
                  <span>Verify Gate Authenticity</span>
                </button>
              </div>
            </div>
          ) : payment?.status === 'UNDER_REVIEW' ? (
            /* PAYMENT UNDER REVIEW STATE */
            <div className="glass-panel p-8 rounded-3xl border border-pixel-yellow/40 bg-dark-900 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-pixel-yellow/15 text-pixel-yellow flex items-center justify-center shrink-0 border border-pixel-yellow/30">
                  <Clock className="w-6 h-6 animate-spin" />
                </div>
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Payment Under Review
                  </span>
                  <h3 className="text-2xl font-brand font-black text-white">
                    VERIFICATION IN PROGRESS
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Our student and teacher coordinators are verifying your payment against the LNCT banking records. 
                    Your ticket will be automatically issued once verified.
                  </p>
                </div>
              </div>

              {/* Submitted Payment Snapshot */}
              <div className="p-4 rounded-2xl bg-dark-950/80 border border-white/5 space-y-3 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Transaction ID / UTR:</span>
                  <span className="font-bold text-pixel-yellow">{payment.transaction_ref}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Amount Paid:</span>
                  <span className="text-white">₹{payment.amount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Payer Name:</span>
                  <span className="text-white">{payment.payer_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Submission Date:</span>
                  <span className="text-slate-300">{new Date(payment.created_at).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-400">Uploaded Screenshot:</span>
                  <button
                    onClick={() => setShowProofModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-pixel-cyan flex items-center gap-1.5 text-xs font-sans transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Submitted Slip
                  </button>
                </div>
              </div>

              <div className="pt-2 text-center text-xs text-slate-400">
                Need to update your transaction reference? You can resubmit below if you entered an incorrect UTR.
              </div>
            </div>
          ) : null}

          {/* PAYMENT PROOF FORM (Active if no payment, rejected, or participant wants to resubmit) */}
          {(!ticket || ticket.status === 'CANCELLED') && (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
              
              <div className="border-b border-white/10 pb-4">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-pixel-cyan text-black">
                  Step 2 of Registration
                </span>
                <h3 className="text-2xl font-brand font-black text-white mt-1">
                  SUBMIT PAYMENT PROOF
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Enter your payment transaction reference and attach the confirmation receipt.
                </p>
              </div>

              {/* REJECTION REASON ALERT IF REJECTED PREVIOUSLY */}
              {payment?.status === 'REJECTED' && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold uppercase text-[11px] font-mono">
                    <AlertCircle className="w-4 h-4" />
                    Previous Payment Submission Rejected
                  </div>
                  <p className="text-rose-200">
                    <strong>Admin Reason:</strong> {payment.rejection_reason || 'Screenshot unclear or UTR reference could not be matched.'}
                  </p>
                  <p className="text-slate-300">
                    Please double-check your Transaction ID and upload a clear screenshot of the successful UPI receipt below.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmitProof} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    UPI / Bank Transaction / UTR Reference ID *
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. 428938492019 or UPI Ref No."
                    className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pixel-cyan text-sm font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Find this 12-digit number or alphanumeric reference in your GPay / PhonePe / Paytm receipt.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Amount Paid (INR) *
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-pixel-cyan text-sm font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Payer Account Name *
                    </label>
                    <input
                      type="text"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      placeholder="Account holder's name"
                      className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-pixel-cyan text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-pixel-cyan text-sm font-mono"
                    required
                  />
                </div>

                {/* Screenshot Upload with Live Preview */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-2">
                    Payment Screenshot / Receipt (JPG, PNG, WebP) *
                  </label>
                  
                  <div className="border-2 border-dashed border-white/15 hover:border-pixel-cyan rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-dark-900/60">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    {previewUrl ? (
                      <div className="space-y-3">
                        <img
                          src={previewUrl}
                          alt="Screenshot Preview"
                          className="max-h-48 mx-auto rounded-lg border border-white/10 shadow-md object-contain"
                        />
                        <p className="text-xs text-pixel-cyan font-mono">
                          {screenshotFile?.name} ({(screenshotFile.size / 1024).toFixed(1)} KB) — Click to change
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-pixel-cyan mx-auto" />
                        <p className="text-sm font-semibold text-white">
                          Click or drag payment screenshot here
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Max file size: 5MB • Formats: JPG, PNG, WebP
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Optional Remarks / Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Paid via brother's phone, etc."
                    className="w-full px-4 py-2.5 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pixel-cyan text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="w-full py-3.5 rounded-xl font-display font-extrabold text-sm tracking-wider text-black bg-pixel-cyan hover:bg-cyan-400 shadow-neon-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submittingPayment ? (
                    <span>Submitting Proof for Review...</span>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>SUBMIT PAYMENT PROOF FOR VERIFICATION</span>
                    </>
                  )}
                </button>

              </form>

            </div>
          )}

        </div>

      </div>

      {/* PHOTO COMPETITION SUBMISSION PORTAL */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pixel-yellow/10 border border-pixel-yellow/30 flex items-center justify-center text-pixel-yellow">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-pixel-yellow uppercase">
                  COMPETITION PORTAL
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-pixel-cyan/10 text-pixel-cyan border border-pixel-cyan/20">
                  {participant?.round_status || 'ROUND_1'}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-brand font-black text-white">
                Submit Your Photography Entries
              </h3>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            {ticket ? 'Ticket Verified • Submissions Open' : '🔒 Requires Verified Ticket'}
          </div>
        </div>

        {!ticket ? (
          <div className="p-8 rounded-2xl bg-dark-900/60 border border-dashed border-white/10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-dark-800 flex items-center justify-center text-slate-500 mx-auto">
              🔒
            </div>
            <h4 className="text-base font-bold text-slate-200">Photo Uploads Locked</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your registration payment must be verified by an administrator and your official E-Ticket generated before you can submit competition photographs.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Upload Form */}
            <form onSubmit={handleUploadSubmission} className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-dark-950/60 p-6 rounded-2xl border border-white/5">
              
              {/* Photo Dropzone / Preview */}
              <div className="lg:col-span-5 space-y-3">
                <label className="block text-xs font-mono font-bold tracking-wider uppercase text-slate-300">
                  Select High-Res Photograph (Max 15MB)
                </label>
                
                <div className="relative border-2 border-dashed border-white/15 hover:border-pixel-yellow/50 rounded-2xl p-4 transition-colors text-center bg-dark-900/50 min-h-[220px] flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                  {photoPreview ? (
                    <div className="relative w-full h-full min-h-[200px] flex items-center justify-center">
                      <img src={photoPreview} alt="Preview" className="max-h-52 object-contain rounded-lg" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotoFile(null);
                          setPhotoPreview(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer space-y-2 flex flex-col items-center justify-center w-full h-full py-6">
                      <Upload className="w-8 h-8 text-pixel-yellow animate-bounce" />
                      <span className="text-xs font-semibold text-slate-200">
                        Click to browse or drop photograph here
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Supports JPEG, PNG, WebP up to 15MB
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Form Metadata Fields */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
                      Target Competition Round
                    </label>
                    <select
                      value={submissionRound}
                      onChange={(e) => setSubmissionRound(e.target.value)}
                      className="w-full bg-dark-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pixel-yellow font-mono"
                    >
                      <option value="1">Round 1: One Frame, One Story</option>
                      <option value="2">Round 2: The Shutter Hunt</option>
                      <option value="3">Round 3: Final Frame Exhibition</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
                      Camera / Smartphone Model
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sony A7 III / iPhone 15 Pro / Nikon D5600"
                      value={cameraDetails}
                      onChange={(e) => setCameraDetails(e.target.value)}
                      className="w-full bg-dark-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pixel-yellow"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
                    Photo Title / Headline *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Solitude at Campus Fountain"
                    value={photoTitle}
                    onChange={(e) => setPhotoTitle(e.target.value)}
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pixel-yellow"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
                    Story / Tagline / Perspective (Max 60 words pitch)
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Explain the concept, visual perspective, and emotional story captured in this frame..."
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-pixel-yellow resize-none"
                  ></textarea>
                </div>

                {photoError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{photoError}</span>
                  </div>
                )}

                {photoSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{photoSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingPhoto || !photoFile}
                  className="w-full py-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-black bg-pixel-yellow hover:bg-pixel-yellowHover shadow-neon-yellow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submittingPhoto ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span>Uploading High-Res Entry...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Submit Entry for Round {submissionRound}</span>
                    </>
                  )}
                </button>
              </div>

            </form>

            {/* My Submitted Entries Gallery */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Your Submitted Entries</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-dark-800 text-slate-300 border border-white/10">
                    {submissions.length} Photos
                  </span>
                </h4>
                
                <button
                  onClick={fetchSubmissions}
                  className="text-xs text-slate-400 hover:text-pixel-yellow flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {loadingSubmissions ? (
                <div className="py-8 text-center text-xs font-mono text-slate-400">
                  Loading your submissions...
                </div>
              ) : submissions.length === 0 ? (
                <div className="p-8 rounded-2xl bg-dark-950/40 border border-white/5 text-center text-xs text-slate-500">
                  You haven't submitted any photographs yet. Use the form above to enter Round 1!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-4 rounded-2xl bg-dark-950 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-900 border border-white/10 flex-shrink-0">
                          <img
                            src={sub.photo_path}
                            alt={sub.title}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(sub.photo_path, '_blank')}
                          />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-dark-800 text-pixel-yellow border border-pixel-yellow/30">
                              ROUND {sub.round_number}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                              sub.status === 'SCORED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            }`}>
                              {sub.status}
                            </span>
                          </div>

                          <h5 className="font-bold text-white text-sm truncate">{sub.title}</h5>
                          {sub.caption && (
                            <p className="text-xs text-slate-400 line-clamp-2">{sub.caption}</p>
                          )}
                          {sub.camera_details && (
                            <div className="text-[10px] font-mono text-slate-500">
                              📷 {sub.camera_details}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Score Breakdown if Scored */}
                      {sub.status === 'SCORED' && (
                        <div className="pt-3 border-t border-white/10 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-slate-400">Total Score:</span>
                            <span className="text-lg font-mono font-black text-pixel-yellow">
                              {sub.total_score} / 100
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-center">
                            <div className="bg-dark-900 p-1.5 rounded border border-white/5">
                              <span className="text-slate-500 block">Creativity</span>
                              <span className="text-slate-200 font-bold">{sub.score_creativity}/25</span>
                            </div>
                            <div className="bg-dark-900 p-1.5 rounded border border-white/5">
                              <span className="text-slate-500 block">Theme</span>
                              <span className="text-slate-200 font-bold">{sub.score_theme}/25</span>
                            </div>
                            <div className="bg-dark-900 p-1.5 rounded border border-white/5">
                              <span className="text-slate-500 block">Story</span>
                              <span className="text-slate-200 font-bold">{sub.score_storytelling}/25</span>
                            </div>
                            <div className="bg-dark-900 p-1.5 rounded border border-white/5">
                              <span className="text-slate-500 block">Tech</span>
                              <span className="text-slate-200 font-bold">{sub.score_technical}/25</span>
                            </div>
                          </div>

                          {sub.judge_feedback && (
                            <div className="text-xs text-slate-400 italic bg-dark-900/50 p-2.5 rounded-lg border border-white/5">
                              "{sub.judge_feedback}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ROUND PARTICIPATION & RULES CARD */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-brand font-black text-white">
              YOUR COMPETITION STATUS: {participant?.round_status || 'ROUND_1'}
            </h3>
            <p className="text-xs text-slate-400">
              Reporting time for Round 1: 10:30 AM on 29 October 2026 at LNCT Bhopal Campus.
            </p>
          </div>
          <span className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-dark-900 text-pixel-yellow border border-pixel-yellow/30 self-start sm:self-auto">
            Individual Category
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
          <div className="p-3 rounded-xl bg-dark-900 border border-pixel-yellow/20 space-y-1">
            <span className="font-bold text-pixel-yellow uppercase font-mono">Round 1</span>
            <p className="font-bold text-white">ONE FRAME, ONE STORY</p>
            <p className="text-slate-400">Capture 1 photo based on theme + 60s pitch.</p>
          </div>
          <div className="p-3 rounded-xl bg-dark-900 border border-pixel-cyan/20 space-y-1">
            <span className="font-bold text-pixel-cyan uppercase font-mono">Round 2</span>
            <p className="font-bold text-white">THE SHUTTER HUNT</p>
            <p className="text-slate-400">Secret one-line prompt, campus exploration.</p>
          </div>
          <div className="p-3 rounded-xl bg-dark-900 border border-pixel-magenta/20 space-y-1">
            <span className="font-bold text-pixel-magenta uppercase font-mono">Round 3</span>
            <p className="font-bold text-white">FINAL FRAME EXHIBITION</p>
            <p className="text-slate-400">Showcase 3-4 best photos at your own stall.</p>
          </div>
        </div>
      </div>

      {/* MODAL: View Submitted Screenshot Securely */}
      {showProofModal && payment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel p-6 rounded-3xl max-w-lg w-full border border-white/20 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="font-brand font-bold text-lg text-white">
                Submitted Payment Proof
              </h4>
              <button 
                onClick={() => setShowProofModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-dark-950 p-2 rounded-xl flex items-center justify-center max-h-[60vh] overflow-auto">
              <img
                src={`/api/payments/${payment.id}/proof`}
                alt="Submitted Proof Receipt"
                className="max-h-[55vh] object-contain rounded"
              />
            </div>

            <div className="text-xs font-mono text-slate-400 flex justify-between">
              <span>Ref: {payment.transaction_ref}</span>
              <span>Amount: ₹{payment.amount}</span>
            </div>

            <button
              onClick={() => setShowProofModal(false)}
              className="w-full py-2.5 rounded-xl bg-dark-800 text-white font-medium text-xs hover:bg-dark-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
