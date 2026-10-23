import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Camera, Check, AlertCircle, ArrowRight, ArrowLeft, ShieldCheck, User, School, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const RegisterPage = ({ setView }) => {
  const { register } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    mobile: '',
    city: 'Bhopal',
    college_type: 'LNCT', // 'LNCT' or 'OTHER'
    college_name: 'LNCT Group of Colleges, Bhopal',
    course: 'B.Tech CSE',
    academic_year: '2nd Year',
    student_id: '',
    password: '',
    confirm_password: '',
    accept_rules: true
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
      
      // Auto-adjust default values when switching college type
      if (name === 'college_type') {
        if (value === 'LNCT') {
          next.college_name = 'LNCT Group of Colleges, Bhopal';
          if (next.academic_year === '1st Year') {
            next.academic_year = '2nd Year';
          }
        } else {
          next.college_name = '';
        }
      }
      return next;
    });
    setError(null);
  };

  const validateStep1 = () => {
    if (!formData.full_name.trim()) return 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) return 'Please enter a valid email address.';
    if (!/^[6-9]\d{9}$/.test(formData.mobile.trim())) return 'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).';
    if (!formData.city.trim()) return 'Please enter your current city.';
    return null;
  };

  const validateStep2 = () => {
    if (!formData.college_name.trim()) return 'Please enter your college or university name.';
    if (!formData.course.trim()) return 'Please specify your degree / course (e.g. B.Tech, B.Com, BCA).';
    if (!formData.student_id.trim()) return 'Please enter your Student ID or Enrollment number.';

    if (formData.college_type === 'LNCT') {
      const allowed = ['2nd Year', '3rd Year', '4th Year'];
      if (!allowed.includes(formData.academic_year)) {
        return 'Per event rules, LNCT students must be in their 2nd, 3rd, or 4th year.';
      }
    }
    return null;
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) return setError(err);
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) return setError(err);
      setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password.length < 8) {
      return setError('Password must be at least 8 characters long.');
    }

    if (!/[A-Z]/.test(formData.password) || !/[a-z]/.test(formData.password) || !/[0-9]/.test(formData.password) || !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password)) {
      return setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
    }

    if (formData.password !== formData.confirm_password) {
      return setError('Passwords do not match.');
    }

    if (!formData.accept_rules) {
      return setError('You must accept the event rules and conditions to register.');
    }

    setLoading(true);
    try {
      await register({
        full_name: formData.full_name,
        email: formData.email,
        mobile: formData.mobile,
        city: formData.city,
        college_type: formData.college_type,
        college_name: formData.college_name,
        course: formData.course,
        academic_year: formData.academic_year,
        student_id: formData.student_id,
        password: formData.password,
        accept_rules: formData.accept_rules
      });

      // Fire celebratory confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Direct to participant dashboard
      setView('dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      
      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-pixel-yellow text-black flex items-center justify-center mx-auto mb-3 shadow-neon-yellow">
          <Camera className="w-6 h-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-brand font-black text-white">
          PARTICIPANT REGISTRATION
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Join PIXEL — FRAME THE DAY • 29, 30 & 31 October 2026
        </p>
      </div>

      {/* Multi-step progress bar */}
      <div className="flex items-center justify-between mb-8 px-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 1 ? 'bg-pixel-yellow text-black shadow-neon-yellow' : 'bg-dark-800 text-slate-400'}`}>
            {step > 1 ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <span className="text-xs font-mono hidden sm:inline text-slate-300">Personal</span>
        </div>
        <div className={`flex-1 h-0.5 mx-2 ${step >= 2 ? 'bg-pixel-yellow' : 'bg-dark-800'}`}></div>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 2 ? 'bg-pixel-cyan text-black shadow-neon-cyan' : 'bg-dark-800 text-slate-400'}`}>
            {step > 2 ? <Check className="w-4 h-4" /> : '2'}
          </div>
          <span className="text-xs font-mono hidden sm:inline text-slate-300">College</span>
        </div>
        <div className={`flex-1 h-0.5 mx-2 ${step >= 3 ? 'bg-pixel-cyan' : 'bg-dark-800'}`}></div>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step === 3 ? 'bg-pixel-magenta text-white shadow-neon-magenta' : 'bg-dark-800 text-slate-400'}`}>
            3
          </div>
          <span className="text-xs font-mono hidden sm:inline text-slate-300">Security</span>
        </div>
      </div>

      {/* Form Container */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl">
        
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <div className="space-y-0.5">
              <p className="font-bold">Validation Warning</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* STEP 1: Personal Details */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-white/10 pb-2 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-pixel-yellow flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Step 1: Personal Information
                </h3>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pixel-yellow text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pixel-yellow text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    WhatsApp / Mobile Number *
                  </label>
                  <input
                    type="tel"
                    name="mobile"
                    maxLength={10}
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="10-digit mobile (e.g. 9876543210)"
                    className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pixel-yellow text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Bhopal, Indore, Jabalpur"
                  className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pixel-yellow text-sm"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 rounded-xl font-display font-bold text-sm bg-pixel-yellow text-black hover:bg-pixel-yellowHover shadow-neon-yellow flex items-center gap-2"
                >
                  <span>Continue to College Info</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: College & Academic Details */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-white/10 pb-2 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-pixel-cyan flex items-center gap-2">
                  <School className="w-4 h-4" />
                  Step 2: College & Academic Details
                </h3>
              </div>

              {/* College Type Toggle */}
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2">
                  Are you from LNCT Group or another institution? *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleChange({ target: { name: 'college_type', value: 'LNCT' } })}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      formData.college_type === 'LNCT'
                        ? 'bg-pixel-yellow/10 border-pixel-yellow text-pixel-yellow font-bold'
                        : 'bg-dark-900 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <p className="text-sm font-bold">LNCT Group</p>
                    <p className="text-[10px] text-slate-400">2nd to 4th Year students only</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange({ target: { name: 'college_type', value: 'OTHER' } })}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      formData.college_type === 'OTHER'
                        ? 'bg-pixel-cyan/10 border-pixel-cyan text-pixel-cyan font-bold'
                        : 'bg-dark-900 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <p className="text-sm font-bold">Other College</p>
                    <p className="text-[10px] text-slate-400">All academic years welcome</p>
                  </button>
                </div>
              </div>

              {/* Specific LNCT Eligibility Rule Banner */}
              {formData.college_type === 'LNCT' && (
                <div className="p-3 rounded-xl bg-pixel-yellow/10 border border-pixel-yellow/30 text-xs text-amber-200">
                  ⚡ <strong>LNCT Rule:</strong> Per event guidelines, LNCT 1st year students are restricted. Only 2nd, 3rd, and 4th year LNCT students can participate.
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  College / Institute Name *
                </label>
                <input
                  type="text"
                  name="college_name"
                  value={formData.college_name}
                  onChange={handleChange}
                  placeholder="e.g. LNCT Main Bhopal, Oriental, MANIT, etc."
                  className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pixel-cyan text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Course / Degree *
                  </label>
                  <input
                    type="text"
                    name="course"
                    value={formData.course}
                    onChange={handleChange}
                    placeholder="e.g. B.Tech CSE, BCA, B.Sc"
                    className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pixel-cyan text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Current Academic Year *
                  </label>
                  <select
                    name="academic_year"
                    value={formData.academic_year}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white focus:outline-none focus:border-pixel-cyan text-sm"
                  >
                    {formData.college_type === 'OTHER' && (
                      <option value="1st Year">1st Year (Other Colleges)</option>
                    )}
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    {formData.college_type === 'OTHER' && (
                      <option value="Postgraduate">Postgraduate / Other</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Enrollment Number / Student ID *
                </label>
                <input
                  type="text"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  placeholder="e.g. 0103CS221045 or College Roll ID"
                  className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pixel-cyan text-sm font-mono"
                  required
                />
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-3 rounded-xl text-slate-400 hover:text-white flex items-center gap-2 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 rounded-xl font-display font-bold text-sm bg-pixel-cyan text-black hover:bg-cyan-400 shadow-neon-cyan flex items-center gap-2"
                >
                  <span>Continue to Security</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Security & Submission */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-white/10 pb-2 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-pixel-magenta flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Step 3: Account Security & Rules Acceptance
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Create Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 8 chars, 1 uppercase, 1 number, 1 symbol"
                    className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pixel-magenta text-sm"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Must include A-Z, a-z, 0-9 & special symbol (!@#$%)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pixel-magenta text-sm"
                    required
                  />
                </div>
              </div>

              {/* Rules and guidelines agreement */}
              <div className="p-4 rounded-xl bg-dark-900/90 border border-white/10 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="accept_rules"
                    checked={formData.accept_rules}
                    onChange={handleChange}
                    className="mt-1 w-4 h-4 rounded border-white/20 bg-dark-800 text-pixel-yellow focus:ring-pixel-yellow"
                  />
                  <span className="text-xs text-slate-300 leading-relaxed">
                    I agree to the PIXEL 2026 photography competition guidelines, confirm individual participation, 
                    and understand that payment verification through the official QR code is required to receive an official E-Ticket.
                  </span>
                </label>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-3 rounded-xl text-slate-400 hover:text-white flex items-center gap-2 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3.5 rounded-xl font-display font-extrabold text-sm tracking-wider text-black bg-pixel-yellow hover:bg-pixel-yellowHover shadow-neon-yellow transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Registering...</span>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>COMPLETE REGISTRATION</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </form>

        <div className="mt-6 text-center text-xs text-slate-400 pt-4 border-t border-white/10">
          Already registered?{' '}
          <button
            onClick={() => setView('login')}
            className="text-pixel-yellow hover:underline font-bold"
          >
            Sign in to your dashboard
          </button>
        </div>

      </div>

    </div>
  );
};
