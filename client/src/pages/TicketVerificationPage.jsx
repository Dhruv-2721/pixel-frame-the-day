import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, QrCode, Search, CheckCircle, AlertTriangle, XCircle, 
  Shield, User, Calendar, MapPin, ArrowRight, RefreshCw, Check, Sparkles 
} from 'lucide-react';
import QrScanner from 'qr-scanner';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const TicketVerificationPage = ({ setView }) => {
  const { isStaff, isAdmin } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(null);

  // Camera Scanning States
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  const handleVerify = async (codeToVerify) => {
    const code = (codeToVerify || identifier).trim();
    if (!code) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setCheckInSuccess(null);

    try {
      // If code is JSON string (from QR payload), parse tkt or hash
      let lookupId = code;
      try {
        const parsed = JSON.parse(code);
        lookupId = parsed.tkt || parsed.hash || code;
      } catch (e) {
        // regular string
      }

      const data = await api.verifyTicket(lookupId);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Verification failed. Ticket not found.');
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setError(null);

    // Wait for video element mount
    setTimeout(() => {
      if (videoRef.current) {
        try {
          const qrScanner = new QrScanner(
            videoRef.current,
            (res) => {
              const scannedText = typeof res === 'object' ? res.data : res;
              stopScanner();
              setIdentifier(scannedText);
              handleVerify(scannedText);
            },
            {
              highlightScanRegion: true,
              highlightCodeOutline: true,
            }
          );
          qrScanner.start().catch((err) => {
            console.error('Camera access error:', err);
            setError('Could not access device camera. Please allow camera permissions or enter the ticket number manually.');
            setScanning(false);
          });
          scannerRef.current = qrScanner;
        } catch (e) {
          console.error(e);
          setError('Camera scanner error. Please enter ticket number manually.');
          setScanning(false);
        }
      }
    }, 200);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleStaffCheckIn = async () => {
    if (!result?.ticketNumber) return;
    setCheckInLoading(true);
    setError(null);

    try {
      const res = await api.checkInTicket(result.ticketNumber);
      setCheckInSuccess(res.message || 'Check-in confirmed successfully!');
      // Re-verify to update status
      handleVerify(result.ticketNumber);
    } catch (err) {
      setError(err.message || 'Check-in failed.');
    } finally {
      setCheckInLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-pixel-cyan text-black flex items-center justify-center mx-auto mb-3 shadow-neon-cyan">
          <QrCode className="w-6 h-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-brand font-black text-white">
          TICKET AUTHENTICITY & GATE SCANNER
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Verify official PIXEL — FRAME THE DAY passes & record single-use event check-in
        </p>
      </div>

      {/* Verification Input & Camera Trigger Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
        
        {/* Verification Form */}
        <div className="space-y-4">
          <label className="block text-xs font-mono text-slate-300 font-bold uppercase">
            Enter Ticket Number or Verification Hash
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="e.g. TKT-PXL-123456 or paste QR payload"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pixel-cyan text-sm font-mono"
              />
            </div>

            <button
              onClick={() => handleVerify()}
              disabled={loading || !identifier.trim()}
              className="px-6 py-3 rounded-xl bg-pixel-yellow hover:bg-pixel-yellowHover text-black font-display font-bold text-xs uppercase shadow-neon-yellow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Verify Pass</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] font-mono text-slate-500">
              Or use your mobile camera or webcam to scan directly:
            </span>

            {!scanning ? (
              <button
                type="button"
                onClick={startScanner}
                className="px-4 py-2 rounded-xl bg-pixel-cyan/15 hover:bg-pixel-cyan/25 border border-pixel-cyan/30 text-pixel-cyan text-xs font-mono font-bold flex items-center gap-2 transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>Launch Camera Scanner</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopScanner}
                className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold flex items-center gap-2"
              >
                <span>Stop Scanner</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Camera Viewfinder */}
        {scanning && (
          <div className="p-4 rounded-2xl bg-black border border-pixel-cyan relative overflow-hidden text-center space-y-3">
            <div className="relative max-w-sm mx-auto aspect-square overflow-hidden rounded-xl border-2 border-dashed border-pixel-cyan">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-pixel-yellow/50 pointer-events-none animate-pulse"></div>
            </div>
            <p className="text-xs font-mono text-pixel-cyan">
              Point your camera at the QR code on the participant's phone or printed ticket
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <XCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <div>
              <p className="font-bold">Verification Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert for Check-In */}
        {checkInSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
            <p className="font-bold">{checkInSuccess}</p>
          </div>
        )}

      </div>

      {/* VERIFICATION RESULT CARD */}
      {result && (
        <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 shadow-2xl transition-all ${
          result.status === 'ACTIVE'
            ? 'glass-panel border-emerald-500/40 bg-emerald-950/10'
            : result.status === 'CHECKED_IN'
            ? 'glass-panel border-amber-500/50 bg-amber-950/15'
            : 'glass-panel border-rose-500/40 bg-rose-950/10'
        }`}>
          
          {/* Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              {result.status === 'ACTIVE' ? (
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-black flex items-center justify-center font-bold">
                  <CheckCircle className="w-6 h-6" />
                </div>
              ) : result.status === 'CHECKED_IN' ? (
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-bold">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold">
                  <XCircle className="w-6 h-6" />
                </div>
              )}

              <div>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  result.status === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : result.status === 'CHECKED_IN'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  STATUS: {result.status}
                </span>
                <h3 className="text-2xl font-brand font-black text-white mt-1">
                  {result.message}
                </h3>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-white/10 sm:pl-4 font-mono text-xs">
              <span className="text-slate-400 block text-[10px]">PASS NUMBER</span>
              <span className="font-bold text-white text-base text-pixel-cyan">{result.ticketNumber}</span>
            </div>
          </div>

          {/* Participant Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-dark-900 border border-white/5 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Participant Name</span>
              <p className="font-sans font-bold text-base text-white">{result.participantName}</p>
              <p className="text-pixel-yellow">{result.registrationId}</p>
            </div>

            <div className="p-4 rounded-xl bg-dark-900 border border-white/5 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Institution & Degree</span>
              <p className="font-sans text-white font-medium">{result.collegeName}</p>
              <p className="text-slate-400">{result.course} ({result.academicYear})</p>
            </div>
          </div>

          {/* Duplicate Entry Warning if already checked in */}
          {result.status === 'CHECKED_IN' && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-xs font-mono space-y-1 text-amber-200">
              <p className="font-bold flex items-center gap-1.5 text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                DUPLICATE ENTRY ALERT:
              </p>
              <p>Checked in on: {new Date(result.checkedInAt).toLocaleString('en-IN')}</p>
              <p>Checked in by: {result.checkedInBy}</p>
              <p className="text-slate-300 font-sans pt-1">
                This pass has already been used once. Please re-verify the identity of the attendee before permitting reentry.
              </p>
            </div>
          )}

          {/* Event Staff Action: Confirm Entry Check-In */}
          {result.status === 'ACTIVE' && (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-300">
                Authentic LNCT Event Pass. Ready for campus entry validation.
              </p>

              {(isStaff || isAdmin) ? (
                <button
                  onClick={handleStaffCheckIn}
                  disabled={checkInLoading}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-display font-extrabold text-sm tracking-wider text-black bg-emerald-400 hover:bg-emerald-300 shadow-neon-yellow flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>CONFIRM PARTICIPANT CHECK-IN</span>
                </button>
              ) : (
                <span className="text-xs font-mono text-slate-400">
                  Log in as Event Staff or Admin to record official gate check-in.
                </span>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
