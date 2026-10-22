import React, { useState } from 'react';
import { Camera, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage = ({ setView }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await login(email, password);
      if (data.user.role === 'ADMIN') {
        setView('admin');
      } else if (data.user.role === 'STAFF') {
        setView('verify');
      } else {
        setView('dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (role) => {
    setError(null);
    if (role === 'admin') {
      setEmail('admin@pixel.lnct.ac.in');
      setPassword('Admin@Pixel2026');
    } else if (role === 'staff') {
      setEmail('staff@pixel.lnct.ac.in');
      setPassword('Staff@Pixel2026');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      
      {/* Brand Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pixel-yellow to-pixel-cyan p-0.5 mx-auto mb-3 shadow-neon-yellow">
          <div className="w-full h-full bg-dark-900 rounded-[14px] flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-pixel-yellow" />
          </div>
        </div>
        <h1 className="text-3xl font-brand font-black text-white">
          SIGN IN TO PIXEL
        </h1>
        <p className="text-xs text-slate-400">
          Access your participant dashboard, ticket, or event management
        </p>
      </div>

      {/* Form Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
        
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pixel-yellow text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pixel-yellow text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-display font-bold text-sm tracking-wide text-black bg-pixel-yellow hover:bg-pixel-yellowHover shadow-neon-yellow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <span>Signing In...</span> : <span>SIGN IN</span>}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast-Login Helpers */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          <p className="text-[11px] font-mono text-slate-400 text-center uppercase tracking-wider">
            Quick Demo Accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDemoCredentials('admin')}
              className="px-3 py-2 rounded-xl text-xs font-mono font-medium bg-dark-900 hover:bg-dark-800 border border-pixel-yellow/30 text-pixel-yellow flex items-center justify-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Demo
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('staff')}
              className="px-3 py-2 rounded-xl text-xs font-mono font-medium bg-dark-900 hover:bg-dark-800 border border-pixel-cyan/30 text-pixel-cyan flex items-center justify-center gap-1.5 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              Staff Demo
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 pt-2">
          Don't have an account yet?{' '}
          <button
            onClick={() => setView('register')}
            className="text-pixel-yellow hover:underline font-bold"
          >
            Register Now
          </button>
        </div>

      </div>

    </div>
  );
};
