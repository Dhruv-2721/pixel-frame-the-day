import React from 'react';
import { Camera, MapPin, Calendar, Phone, Award, Mail, Heart } from 'lucide-react';

export const Footer = ({ setView }) => {
  return (
    <footer className="border-t border-white/10 bg-dark-950 text-slate-400 relative overflow-hidden">
      {/* Decorative film sprocket border */}
      <div className="w-full h-3 border-b border-white/5 bg-dark-900 flex justify-between items-center px-4 overflow-hidden opacity-60">
        {[...Array(40)].map((_, i) => (
          <div key={i} className="w-3 h-1.5 bg-white/10 rounded-sm"></div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Col 1: About & Tagline */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-pixel-yellow flex items-center justify-center text-black font-bold">
                <Camera className="w-5 h-5" />
              </div>
              <span className="font-brand font-black text-2xl text-white tracking-wider">
                PIXEL — FRAME THE DAY
              </span>
            </div>
            <p className="text-sm text-slate-300 italic">
              "Not just a photo, but a perspective."
            </p>
            <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
              A flagship photography festival organized by LNCT Group of Colleges to celebrate youth creativity, 
              campus storytelling, and the art of seeing beyond the frame.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs font-mono text-slate-400">
              <span className="px-2.5 py-1 rounded bg-dark-800 border border-white/10">LNCT University Bhopal</span>
              <span className="px-2.5 py-1 rounded bg-dark-800 border border-white/10">LNCT Group</span>
              <span className="px-2.5 py-1 rounded bg-dark-800 border border-white/10">LN Universe</span>
              <span className="px-2.5 py-1 rounded bg-dark-800 border border-white/10">JNCT Bhopal</span>
              <span className="px-2.5 py-1 rounded bg-dark-800 border border-white/10">LNCT Vidhyapeeth Indore</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-mono tracking-wider text-pixel-cyan font-bold">
              Navigation
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => setView('home')} className="hover:text-white transition-colors">
                  Home Overview
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    setView('home');
                    setTimeout(() => document.getElementById('rounds-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
                  }} 
                  className="hover:text-white transition-colors"
                >
                  Three Competition Rounds
                </button>
              </li>
              <li>
                <button onClick={() => setView('register')} className="hover:text-pixel-yellow text-pixel-yellow transition-colors font-medium">
                  Participant Registration
                </button>
              </li>
              <li>
                <button onClick={() => setView('login')} className="hover:text-white transition-colors">
                  Participant Login
                </button>
              </li>
              <li>
                <button onClick={() => setView('verify')} className="hover:text-pixel-cyan transition-colors">
                  Ticket Authenticity Scanner
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Venue & Dates */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-mono tracking-wider text-pixel-magenta font-bold">
              Venue & Schedule
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-pixel-yellow shrink-0 mt-0.5" />
                <span>29, 30 & 31 October 2026</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-pixel-cyan shrink-0 mt-0.5" />
                <span>LNCT Group of Colleges, Raisen Road, Bhopal, Madhya Pradesh</span>
              </div>
              <div className="flex items-start gap-2">
                <Award className="w-4 h-4 text-pixel-magenta shrink-0 mt-0.5" />
                <span>Format: Individual Participation (3 Rounds)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Poster Footer Banner: DIFFERENT COLLEGE ★ SAME PASSION ★ DIFFERENT PERSPECTIVES */}
        <div className="py-4 border-y border-white/10 text-center font-mono font-bold text-xs tracking-widest text-pixel-yellow flex items-center justify-center gap-2 flex-wrap">
          <span>DIFFERENT COLLEGE</span>
          <span>★</span>
          <span>SAME PASSION</span>
          <span>★</span>
          <span>DIFFERENT PERSPECTIVES</span>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 LNCT Group of Colleges, Bhopal. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <button onClick={() => setView('login')} className="hover:text-slate-400">
              Admin Portal
            </button>
            <span className="flex items-center gap-1">
              Crafted for Photographers <Camera className="w-3.5 h-3.5 text-pixel-yellow inline" />
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
