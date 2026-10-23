import React, { useState } from 'react';
import { Camera, QrCode, Shield, User, LogOut, Menu, X, Sparkles, CheckCircle, Clock, AlertCircle, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ currentView, setView, onOpenLeaderboard }) => {
  const { user, participant, payment, ticket, logout, isAdmin, isStaff } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getStatusBadge = () => {
    if (ticket && ticket.status !== 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle className="w-3 h-3" /> Ticket Issued
        </span>
      );
    }
    if (payment?.status === 'UNDER_REVIEW') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
          <Clock className="w-3 h-3 animate-spin" /> Verifying
        </span>
      );
    }
    if (payment?.status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <AlertCircle className="w-3 h-3" /> Action Needed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pixel-yellow/10 text-pixel-yellow border border-pixel-yellow/30">
        Payment Pending
      </span>
    );
  };

  const navTo = (viewName) => {
    setView(viewName);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 bg-dark-950/85 backdrop-blur-md border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo & Event Title */}
          <div 
            onClick={() => navTo('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            {/* LN Universe Official Festival Logo */}
            <div className="bg-white/95 hover:bg-white rounded-xl px-2 py-1 shadow-sm border border-white/20 transition-transform group-hover:scale-105 flex items-center justify-center">
              <img 
                src="/ln_universe_logo.png" 
                alt="LN Universe" 
                className="h-7 sm:h-8 w-auto object-contain" 
              />
            </div>

            <div className="h-7 w-px bg-white/15 hidden sm:block"></div>

            <div className="relative">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-pixel-yellow via-pixel-cyan to-pixel-magenta p-0.5 shadow-neon-yellow group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-dark-900 rounded-[10px] flex items-center justify-center">
                  <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-pixel-yellow group-hover:rotate-12 transition-transform" />
                </div>
              </div>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pixel-cyan opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-pixel-cyan"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-brand font-black text-xl sm:text-2xl tracking-wider text-white group-hover:text-pixel-yellow transition-colors">
                  PIXEL
                </span>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 font-bold uppercase tracking-wider rounded bg-pixel-magenta/20 text-pixel-magenta border border-pixel-magenta/40">
                  LNCT
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] uppercase font-mono tracking-widest text-slate-400">
                FRAME THE DAY • 29-31 OCT
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => navTo('home')}
              className={`text-sm font-medium transition-colors ${currentView === 'home' ? 'text-pixel-yellow font-bold' : 'text-slate-300 hover:text-white'}`}
            >
              Home
            </button>
            <button 
              onClick={() => {
                navTo('home');
                setTimeout(() => {
                  document.getElementById('rounds-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Event Rounds
            </button>
            <button 
              onClick={() => {
                navTo('home');
                setTimeout(() => {
                  document.getElementById('coordinators-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Coordinators
            </button>
            <button 
              onClick={onOpenLeaderboard}
              className="flex items-center gap-1.5 text-sm font-medium text-amber-300 hover:text-amber-200 transition-colors"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              Leaderboard
            </button>
            {(isAdmin || isStaff) && (
              <button 
                onClick={() => navTo('verify')}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${currentView === 'verify' ? 'text-pixel-cyan font-bold' : 'text-slate-300 hover:text-pixel-cyan'}`}
              >
                <QrCode className="w-4 h-4 text-pixel-cyan" />
                Gate Scanner
              </button>
            )}
          </nav>

          {/* Action / Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <>
                <button
                  onClick={() => navTo('login')}
                  className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navTo('register')}
                  className="relative group px-5 py-2.5 rounded-xl font-display font-bold text-sm tracking-wide text-black bg-pixel-yellow hover:bg-pixel-yellowHover shadow-neon-yellow transition-all flex items-center gap-2 overflow-hidden"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Register Now</span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700"></div>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button
                    onClick={() => navTo('admin')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                      currentView === 'admin' 
                        ? 'bg-pixel-yellow text-black border-pixel-yellow shadow-neon-yellow' 
                        : 'bg-dark-800 text-pixel-yellow border-pixel-yellow/30 hover:border-pixel-yellow'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin Command
                  </button>
                )}

                {user.role === 'PARTICIPANT' && (
                  <div className="flex items-center gap-2">
                    {getStatusBadge()}
                    <button
                      onClick={() => navTo('dashboard')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        currentView === 'dashboard'
                          ? 'bg-pixel-cyan text-black font-bold shadow-neon-cyan'
                          : 'bg-dark-800 text-slate-200 border border-white/10 hover:border-pixel-cyan'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      Dashboard
                    </button>
                  </div>
                )}

                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2 text-slate-400 hover:text-rose-400 bg-dark-850 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-dark-900 border-b border-white/10 px-4 pt-3 pb-6 space-y-3 animate-fadeIn">
          <button 
            onClick={() => navTo('home')}
            className="block w-full text-left py-2 text-slate-200 font-medium"
          >
            Home
          </button>
          <button 
            onClick={() => {
              navTo('home');
              setTimeout(() => {
                document.getElementById('rounds-section')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="block w-full text-left py-2 text-slate-200 font-medium"
          >
            Event Rounds
          </button>
          <button 
            onClick={() => {
              setMobileMenuOpen(false);
              if (onOpenLeaderboard) onOpenLeaderboard();
            }}
            className="flex items-center gap-2 py-2 text-amber-300 font-medium"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            Live Leaderboard
          </button>
          {(isAdmin || isStaff) && (
            <button 
              onClick={() => navTo('verify')}
              className="flex items-center gap-2 py-2 text-pixel-cyan font-medium"
            >
              <QrCode className="w-4 h-4" />
              Gate Scanner
            </button>
          )}

          <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
            {!user ? (
              <>
                <button
                  onClick={() => navTo('login')}
                  className="w-full py-2.5 rounded-xl text-center text-sm font-semibold bg-dark-800 text-white border border-white/10"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navTo('register')}
                  className="w-full py-2.5 rounded-xl text-center text-sm font-bold bg-pixel-yellow text-black shadow-neon-yellow"
                >
                  Register Now
                </button>
              </>
            ) : (
              <>
                {user.role === 'PARTICIPANT' && (
                  <button
                    onClick={() => navTo('dashboard')}
                    className="w-full py-2.5 rounded-xl text-center text-sm font-bold bg-pixel-cyan text-black"
                  >
                    Go to Participant Dashboard
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => navTo('admin')}
                    className="w-full py-2.5 rounded-xl text-center text-sm font-bold bg-pixel-yellow text-black"
                  >
                    Admin Dashboard
                  </button>
                )}
                <button
                  onClick={logout}
                  className="w-full py-2 rounded-xl text-center text-sm font-medium text-rose-400 bg-rose-500/10"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
