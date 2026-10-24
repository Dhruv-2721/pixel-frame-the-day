import React, { useState, useEffect } from 'react';
import { 
  Camera, Calendar, MapPin, Users, Award, ChevronRight, Sparkles, 
  Clock, ShieldCheck, HelpCircle, Phone, ArrowRight, Aperture, Eye, Image as ImageIcon 
} from 'lucide-react';
import { api } from '../services/api';

export const HomePage = ({ setView }) => {
  const [settings, setSettings] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.getEventSettings();
        setSettings(data.event);
        setAnnouncements(data.announcements || []);
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    };
    loadSettings();

    // Event countdown (October 29, 2026, 09:00:00)
    const targetDate = new Date('2026-10-29T09:00:00').getTime();
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setCountdown({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-24 pb-20 overflow-hidden">
      
      {/* HERO SECTION */}
      <section className="relative pt-8 pb-16 md:pt-16 md:pb-24">
        {/* Background ambient lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-pixel-yellow/15 blur-[120px] pointer-events-none rounded-full"></div>
        <div className="absolute top-1/2 right-10 w-[400px] h-[300px] bg-pixel-cyan/10 blur-[100px] pointer-events-none rounded-full"></div>

        {/* Top-Right Corner Official Festival Logo */}
        <div className="hidden sm:flex absolute top-4 right-6 lg:top-6 lg:right-12 z-20 items-center">
          <div className="bg-white/95 hover:bg-white px-3 py-1.5 rounded-2xl shadow-xl border border-white/20 transition-all hover:scale-105 flex items-center gap-2.5 backdrop-blur">
            <img 
              src="/ln_universe_logo.png" 
              alt="LN UNIVERSE" 
              className="h-9 lg:h-11 w-auto object-contain" 
            />
            <div className="border-l border-slate-300 pl-2 text-left">
              <span className="text-[9px] font-mono font-bold tracking-wider text-purple-700 uppercase block">Presenting</span>
              <span className="text-[11px] font-brand font-black text-slate-900 tracking-tight block">LN UNIVERSE</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Header pill badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-6">
            <div className="bg-white/95 hover:bg-white px-3 py-1 rounded-full shadow-sm flex items-center gap-2 transition-transform hover:scale-105">
              <img src="/ln_universe_logo.png" alt="LN Universe" className="h-5 sm:h-6 w-auto object-contain" />
              <span className="text-[11px] font-brand font-bold text-slate-900">LN UNIVERSE</span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-dark-800 border border-white/10 text-slate-300 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-pixel-yellow animate-ping"></span>
              LNCT Group of Colleges, Bhopal
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-pixel-cyan/10 border border-pixel-cyan/30 text-pixel-cyan">
              Capture ★ Discover ★ Exhibit
            </span>
            {settings?.fee && (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-pixel-magenta/15 border border-pixel-magenta/30 text-pixel-magenta">
                Entry Fee: ₹{settings.fee}
              </span>
            )}
          </div>

          {/* Oversized Cinematic Typography Title */}
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-6xl sm:text-7xl md:text-9xl font-brand font-black tracking-tight leading-none text-white drop-shadow-2xl">
              PIXEL
            </h1>
            <div className="text-3xl sm:text-5xl md:text-7xl font-display font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pixel-yellow via-amber-300 to-pixel-yellow drop-shadow-md">
              FRAME THE DAY
            </div>
            <p className="text-lg sm:text-2xl font-sans text-slate-300 italic pt-2 max-w-2xl mx-auto">
              “Not just a photo, but a perspective.”
            </p>
          </div>

          {/* Live Countdown Timer */}
          <div className="max-w-xl mx-auto mb-10 p-4 rounded-2xl glass-panel border border-white/10 shadow-2xl">
            <div className="text-center text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-3 flex items-center justify-center gap-2">
              <Clock className="w-3.5 h-3.5 text-pixel-yellow" />
              Event Starts In: 29 October 2026
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-dark-900/90 rounded-xl p-2.5 border border-white/5">
                <span className="block font-brand font-black text-2xl sm:text-3xl text-pixel-yellow">
                  {countdown.days}
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Days</span>
              </div>
              <div className="bg-dark-900/90 rounded-xl p-2.5 border border-white/5">
                <span className="block font-brand font-black text-2xl sm:text-3xl text-white">
                  {countdown.hours}
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Hours</span>
              </div>
              <div className="bg-dark-900/90 rounded-xl p-2.5 border border-white/5">
                <span className="block font-brand font-black text-2xl sm:text-3xl text-white">
                  {countdown.minutes}
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Minutes</span>
              </div>
              <div className="bg-dark-900/90 rounded-xl p-2.5 border border-white/5">
                <span className="block font-brand font-black text-2xl sm:text-3xl text-pixel-cyan">
                  {countdown.seconds}
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Seconds</span>
              </div>
            </div>
          </div>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <button
              onClick={() => setView('register')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-display font-extrabold text-base tracking-wider text-black bg-pixel-yellow hover:bg-pixel-yellowHover shadow-neon-yellow transition-all flex items-center justify-center gap-3 group"
            >
              <Camera className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span>REGISTER NOW</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => {
                document.getElementById('rounds-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-display font-bold text-base tracking-wider text-white bg-dark-900 hover:bg-dark-800 border border-pixel-cyan/40 hover:border-pixel-cyan shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Aperture className="w-5 h-5 text-pixel-cyan animate-spin-slow" />
              <span>EXPLORE THE ROUNDS</span>
            </button>
          </div>

          {/* Event Quick Info Banner (From Poster) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pixel-yellow/15 flex items-center justify-center text-pixel-yellow shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase">Event Date</p>
                <p className="text-sm font-bold text-white">29, 30 & 31 OCTOBER</p>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pixel-cyan/15 flex items-center justify-center text-pixel-cyan shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase">Venue</p>
                <p className="text-sm font-bold text-white">LNCT Campus, Raisen Rd</p>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pixel-magenta/15 flex items-center justify-center text-pixel-magenta shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase">Target Participants</p>
                <p className="text-xs font-semibold text-white">LNCT: 2nd-4th Yr | Others: All</p>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase">Participation Format</p>
                <p className="text-sm font-bold text-white">Individual Participation</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* EVENT OVERVIEW BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-white/10 p-8 md:p-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-pixel-yellow text-black">
            EVENT OVERVIEW
          </div>
          <h2 className="text-3xl md:text-5xl font-brand font-black text-white max-w-3xl mx-auto">
            Your Lens ★ Our Campus ★ Endless Stories
          </h2>
          <p className="text-base md:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            A three-round photography experience designed to capture authentic stories, 
            explore hidden campus perspectives, test your observational creativity, 
            and showcase your photographic genius in front of a live audience and esteemed jury.
          </p>
        </div>
      </section>

      {/* THREE-ROUND SECTION (Directly matching the poster cards!) */}
      <section id="rounds-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-pixel-cyan font-semibold">
            THE PHOTOGRAPHIC JOURNEY
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-brand font-black text-white">
            THREE EXCITING ROUNDS
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Participants begin in Round 1 and advance through creative selection to the grand final exhibition.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* ROUND 1: ONE FRAME, ONE STORY (Warm Yellow/Orange Accent) */}
          <div className="rounded-3xl bg-dark-900 border-2 border-pixel-yellow/60 p-6 md:p-8 flex flex-col justify-between relative shadow-neon-yellow/20 hover:border-pixel-yellow transition-all group">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-lg text-xs font-mono font-black uppercase bg-pixel-yellow text-black">
                  ROUND 1
                </span>
                <Camera className="w-6 h-6 text-pixel-yellow" />
              </div>

              <div>
                <h3 className="text-2xl font-brand font-black text-white mb-1">
                  ONE FRAME, ONE STORY
                </h3>
                <p className="text-xs font-mono text-pixel-yellow">Reporting Time: 10:30 AM</p>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-dark-950/80 border border-white/5 space-y-1">
                  <p className="font-bold text-white uppercase text-[11px] text-pixel-yellow">TASK</p>
                  <p>Capture one photograph based on the given theme and submit it with an expressive title, tagline, or story.</p>
                </div>

                <div className="p-3 rounded-xl bg-dark-950/80 border border-white/5 space-y-1">
                  <p className="font-bold text-white uppercase text-[11px] text-pixel-yellow">PRESENTATION</p>
                  <p>60 seconds presentation per participant to explain their creative vision to the judges.</p>
                </div>

                <div className="p-3 rounded-xl bg-dark-950/80 border border-white/5 space-y-1">
                  <p className="font-bold text-white uppercase text-[11px] text-pixel-yellow">KEY FOCUS</p>
                  <p>Creativity • Theme Relevance • Storytelling • Critical Thinking • Presentation</p>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/10">
              <span className="text-[11px] font-mono text-slate-400">All registered participants start here</span>
            </div>
          </div>

          {/* ROUND 2: THE SHUTTER HUNT (Electric Cyan Accent) */}
          <div className="rounded-3xl bg-dark-900 border-2 border-pixel-cyan/60 p-6 md:p-8 flex flex-col justify-between relative shadow-neon-cyan/20 hover:border-pixel-cyan transition-all group">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-lg text-xs font-mono font-black uppercase bg-pixel-cyan text-black">
                  ROUND 2
                </span>
                <Eye className="w-6 h-6 text-pixel-cyan" />
              </div>

              <div>
                <h3 className="text-2xl font-brand font-black text-white mb-1">
                  THE SHUTTER HUNT
                </h3>
                <p className="text-xs font-mono text-pixel-cyan">Shortlisted from Round 1</p>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-dark-950/80 border border-white/5 space-y-1">
                  <p className="font-bold text-white uppercase text-[11px] text-pixel-cyan">CONCEPT</p>
                  <p>Each participant receives a unique one-line secret message, explores the campus, and captures a photo that best represents it within the time limit.</p>
                </div>

                <div className="p-3 rounded-xl bg-dark-950/80 border border-white/5 space-y-1">
                  <p className="font-bold text-white uppercase text-[11px] text-pixel-cyan">EXAMPLE MESSAGES</p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300 italic">
                    <li>“A picture of a place where time feels still”</li>
                    <li>“Find something that shows contrast”</li>
                    <li>“Capture the silent hard work”</li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-dark-950/80 border border-white/5 space-y-1">
                  <p className="font-bold text-white uppercase text-[11px] text-pixel-cyan">KEY FOCUS</p>
                  <p>Creative Interpretation • Observation Skills • Originality • Speed</p>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/10">
              <span className="text-[11px] font-mono text-slate-400">Advances to Round 3</span>
            </div>
          </div>

          {/* ROUND 3: FINAL FRAME EXHIBITION (Vivid Magenta Accent) */}
          <div className="rounded-3xl bg-dark-900 border-2 border-pixel-magenta/60 p-6 md:p-8 flex flex-col justify-between relative shadow-neon-magenta/20 hover:border-pixel-magenta transition-all group">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-lg text-xs font-mono font-black uppercase bg-pixel-magenta text-white">
                  ROUND 3
                </span>
                <ImageIcon className="w-6 h-6 text-pixel-magenta" />
              </div>

              <div>
                <h3 className="text-2xl font-brand font-black text-white mb-1">
                  FINAL FRAME EXHIBITION
                </h3>
                <p className="text-xs font-mono text-pixel-magenta">Grand Finale & Exhibition</p>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-dark-950/80 border border-white/5 space-y-1">
                  <p className="font-bold text-white uppercase text-[11px] text-pixel-magenta">SUBMISSION</p>
                  <p>Bring up to 4 of your best photographs, printed or displayed on your phone or laptop.</p>
                </div>

                <div className="p-3 rounded-xl bg-dark-950/80 border border-white/5 space-y-1">
                  <p className="font-bold text-white uppercase text-[11px] text-pixel-magenta">EXHIBITION STALL</p>
                  <p>Present your own stall, explain the story behind each image, and engage the judges and live audience.</p>
                </div>

                <div className="p-3 rounded-xl bg-dark-950/80 border border-white/5 space-y-1">
                  <p className="font-bold text-white uppercase text-[11px] text-pixel-magenta">KEY FOCUS</p>
                  <p>Creativity • Image Quality • Storytelling • Presentation • Audience Engagement</p>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/10">
              <span className="text-[11px] font-mono text-slate-400">Winners crowned at final ceremony</span>
            </div>
          </div>

        </div>
      </section>

      {/* PRIZES & RECOGNITION */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-8 md:p-10 rounded-3xl border border-pixel-yellow/30 relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center md:text-left">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-pixel-yellow/15 text-pixel-yellow border border-pixel-yellow/30">
                Prizes & Recognition
              </span>
              <h3 className="text-3xl md:text-4xl font-brand font-black text-white">
                Talent Gets Recognised
              </h3>
              <p className="text-sm text-slate-300 max-w-md">
                Trophies, prestigious certificates from LNCT Group, and cash awards for the finest campus photographers.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
              <div className="bg-dark-900 border border-pixel-yellow/40 rounded-2xl p-4 text-center">
                <Award className="w-8 h-8 text-pixel-yellow mx-auto mb-2" />
                <p className="text-sm font-bold text-white">1st Place</p>
                <p className="text-[10px] font-mono text-pixel-yellow">Champion</p>
              </div>

              <div className="bg-dark-900 border border-slate-400/40 rounded-2xl p-4 text-center">
                <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-white">2nd Place</p>
                <p className="text-[10px] font-mono text-slate-400">Runner Up</p>
              </div>

              <div className="bg-dark-900 border border-amber-600/40 rounded-2xl p-4 text-center">
                <Award className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-white">3rd Place</p>
                <p className="text-[10px] font-mono text-amber-500">2nd Runner Up</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COORDINATORS SECTION */}
      <section id="coordinators-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-3xl sm:text-4xl font-brand font-black text-white">
            EVENT COORDINATORS
          </h2>
          <p className="text-sm text-slate-400">
            Reach out to our organizing team for queries, venue assistance, and registrations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Student Coordinators */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-xs uppercase font-mono tracking-wider text-pixel-cyan font-bold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Student Coordinators
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-dark-900 border border-white/5 space-y-2">
                <p className="font-bold text-white text-base">Parth Ranjan</p>
                <a 
                  href="tel:6207595113"
                  className="flex items-center gap-2 text-xs font-mono text-pixel-yellow hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  +91 6207595113
                </a>
              </div>

              <div className="p-4 rounded-xl bg-dark-900 border border-white/5 space-y-2">
                <p className="font-bold text-white text-base">Prathvish Singh</p>
                <a 
                  href="tel:8109794298"
                  className="flex items-center gap-2 text-xs font-mono text-pixel-yellow hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  +91 8109794298
                </a>
              </div>
            </div>
          </div>

          {/* Teacher Coordinators */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-xs uppercase font-mono tracking-wider text-pixel-magenta font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Faculty Mentors • Guiding Every Frame
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-dark-900 border border-white/5 font-medium text-slate-200">
                Prof. Neha Singh Rajput
              </div>
              <div className="p-3 rounded-lg bg-dark-900 border border-white/5 font-medium text-slate-200">
                Prof. Yogesh Verma
              </div>
              <div className="p-3 rounded-lg bg-dark-900 border border-white/5 font-medium text-slate-200">
                Prof. Sudhir Geed
              </div>
              <div className="p-3 rounded-lg bg-dark-900 border border-white/5 font-medium text-slate-200">
                Dr. Saurabh Chandra
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FAQS & RULES */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-3xl font-brand font-black text-white">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p className="text-sm text-slate-400">Everything you need to know about PIXEL 2026</p>
        </div>

        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-pixel-yellow shrink-0" />
              Who is eligible to participate?
            </h4>
            <p className="text-xs text-slate-300 pl-6 leading-relaxed">
              Per official guidelines: Students from <strong>LNCT Group of Colleges</strong> must be in their <strong>2nd, 3rd, 4th, or 5th year</strong>. 
              Participants from <strong>other colleges and universities</strong> are welcome across all academic years!
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-pixel-cyan shrink-0" />
              What cameras are allowed?
            </h4>
            <p className="text-xs text-slate-300 pl-6 leading-relaxed">
              Any camera! Smartphones, DSLRs, Mirrorless, and Point-and-Shoot cameras are all permitted. 
              Evaluation focuses on composition, storytelling, perspective, and creativity rather than expensive gear.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-pixel-magenta shrink-0" />
              How do I complete payment and get my E-Ticket?
            </h4>
            <p className="text-xs text-slate-300 pl-6 leading-relaxed">
              After registration, access your dashboard to view the official event payment QR code. 
              Pay via any UPI app (GPay, PhonePe, Paytm), and submit your transaction reference (UTR) along with a screenshot of the payment. 
              Once verified by our team, your official cryptographic E-Ticket with QR code will be generated instantly for download.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="rounded-3xl bg-gradient-to-tr from-pixel-yellow/10 via-dark-900 to-pixel-cyan/10 border border-pixel-yellow/30 p-10 space-y-6">
          <h2 className="text-4xl md:text-5xl font-brand font-black text-white">
            READY TO FRAME YOUR PERSPECTIVE?
          </h2>
          <p className="text-sm md:text-base text-slate-300 max-w-xl mx-auto">
            Limited slots available for participants across Bhopal and Central India. Secure your spot now!
          </p>
          <button
            onClick={() => setView('register')}
            className="px-8 py-4 rounded-xl font-display font-extrabold text-base tracking-wider text-black bg-pixel-yellow hover:bg-pixel-yellowHover shadow-neon-yellow transition-all inline-flex items-center gap-3"
          >
            <Sparkles className="w-5 h-5" />
            REGISTER FOR PIXEL 2026
          </button>
        </div>
      </section>

    </div>
  );
};
