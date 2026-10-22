import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  Camera, Ticket, Download, Printer, ShieldCheck, QrCode, ArrowLeft, 
  MapPin, Calendar, CheckCircle2, Sparkles, AlertCircle 
} from 'lucide-react';
import { api } from '../services/api';

export const ETicketPage = ({ setView }) => {
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const ticketRef = useRef(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const data = await api.getMyTicket();
        setTicketData(data);
      } catch (err) {
        setError(err.message || 'Failed to load ticket.');
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, []);

  const handleDownloadPdf = async () => {
    if (!ticketRef.current) return;
    setDownloading(true);

    try {
      const element = ticketRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#050507'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`PIXEL_2026_Ticket_${ticketData?.ticket?.ticket_number || 'Pass'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Could not download PDF. You can also print the ticket.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4">
        <Camera className="w-10 h-10 text-pixel-yellow animate-spin mx-auto" />
        <p className="font-mono text-sm text-slate-300">Retrieving Secure E-Ticket...</p>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-brand font-black text-white">
          No Active Ticket Available
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          {error || 'Your ticket will be generated once your participation fee payment is approved by an administrator.'}
        </p>
        <button
          onClick={() => setView('dashboard')}
          className="px-6 py-3 rounded-xl bg-pixel-yellow text-black font-display font-bold text-sm shadow-neon-yellow"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { ticket, participant, event } = ticketData;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          onClick={() => setView('dashboard')}
          className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-dark-900 border border-white/10 hover:border-white/30 text-xs font-bold font-mono text-slate-200 flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Pass</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-pixel-yellow hover:bg-pixel-yellowHover text-black text-xs font-bold font-mono shadow-neon-yellow flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* TICKET PASS CONTAINER (Styled as a premium photography festival pass) */}
      <div 
        ref={ticketRef}
        className="rounded-3xl bg-[#09090c] border-2 border-pixel-yellow/60 shadow-2xl overflow-hidden relative text-white"
        style={{
          boxShadow: '0 0 40px rgba(255, 230, 0, 0.15)'
        }}
      >
        {/* Top Perforation / Film Strip Motif */}
        <div className="h-6 bg-black border-b border-white/15 flex justify-between items-center px-4 overflow-hidden">
          {[...Array(24)].map((_, i) => (
            <div key={i} className="w-3 h-2 bg-dark-800 rounded-sm border border-white/10"></div>
          ))}
        </div>

        {/* Ticket Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-dark-950 via-dark-900 to-dark-950 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-pixel-yellow text-black">
                OFFICIAL ENTRY PASS
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-pixel-cyan/20 text-pixel-cyan border border-pixel-cyan/40">
                LNCT GROUP
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-brand font-black tracking-tight text-white">
              PIXEL — FRAME THE DAY
            </h1>
            <p className="text-xs text-pixel-yellow font-sans italic">
              “Not just a photo, but a perspective.”
            </p>
          </div>

          <div className="text-right sm:border-l sm:border-white/10 sm:pl-6">
            <p className="text-[10px] font-mono text-slate-400 uppercase">TICKET NUMBER</p>
            <p className="text-lg sm:text-xl font-mono font-black text-pixel-cyan tracking-wider">
              {ticket.ticket_number}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> VERIFIED PASS
            </span>
          </div>
        </div>

        {/* Ticket Body: Two-Column Layout (Info + QR Pass) */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-[#0d0d12]">
          
          {/* Left: Participant & Venue Information (8 Cols) */}
          <div className="md:col-span-8 space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-white/10">
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  PARTICIPANT NAME
                </p>
                <p className="text-xl font-brand font-black text-white">
                  {participant.full_name}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  REGISTRATION ID
                </p>
                <p className="text-base font-mono font-bold text-pixel-yellow">
                  {participant.registration_id}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 block uppercase text-[10px]">INSTITUTION / COLLEGE</span>
                <span className="text-slate-200 font-bold">{participant.college_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[10px]">COURSE & YEAR</span>
                <span className="text-slate-200 font-bold">{participant.course} • {participant.academic_year}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-pixel-yellow shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold">{event.dates}</span>
                  <span className="text-slate-400 block text-[11px]">Round 1 Reporting: 10:30 AM</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-pixel-cyan shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold">{event.venue}</span>
                  <span className="text-slate-400 block text-[11px]">Bhopal, Madhya Pradesh</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right: High-Density Gate QR Code (4 Cols) */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-white text-black text-center space-y-3 shadow-xl">
            <p className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-700">
              SCAN AT EVENT GATE
            </p>

            {ticket.qr_image_url ? (
              <img
                src={ticket.qr_image_url}
                alt="Gate Check-In QR"
                className="w-44 h-44 object-contain rounded-lg border border-slate-300"
              />
            ) : (
              <div className="w-44 h-44 bg-slate-100 flex items-center justify-center">
                <QrCode className="w-16 h-16 text-slate-400" />
              </div>
            )}

            <div className="font-mono text-[9px] text-slate-500 uppercase tracking-tighter">
              CRYPTO-HASH: {ticket.verification_hash?.slice(0, 16)}...
            </div>
          </div>

        </div>

        {/* Ticket Footer Banner / Perforated divider */}
        <div className="p-4 bg-dark-950 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
          <span>Non-transferable • Single person entry</span>
          <span className="text-pixel-yellow">LNCT Group of Colleges Photography Festival</span>
          <span>Status: {ticket.status}</span>
        </div>

        {/* Bottom Film Strip Sprockets */}
        <div className="h-6 bg-black border-t border-white/15 flex justify-between items-center px-4 overflow-hidden">
          {[...Array(24)].map((_, i) => (
            <div key={i} className="w-3 h-2 bg-dark-800 rounded-sm border border-white/10"></div>
          ))}
        </div>

      </div>

      {/* Ticket Verification Shortcut */}
      <div className="text-center pt-2">
        <button
          onClick={() => setView('verify')}
          className="text-xs font-mono text-pixel-cyan hover:underline inline-flex items-center gap-1.5"
        >
          <QrCode className="w-3.5 h-3.5" />
          Test live gate scanner with Ticket #{ticket.ticket_number}
        </button>
      </div>

    </div>
  );
};
