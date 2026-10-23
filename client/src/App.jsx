import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { NotificationToast } from './components/NotificationToast';
import { LeaderboardModal } from './components/LeaderboardModal';
import { HomePage } from './pages/HomePage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { ParticipantDashboard } from './pages/ParticipantDashboard';
import { ETicketPage } from './pages/ETicketPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { TicketVerificationPage } from './pages/TicketVerificationPage';

const AppContent = () => {
  const [currentView, setView] = useState('home');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const { user, loading, refreshUser, isAdmin, isStaff } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-pixel-yellow flex items-center justify-center animate-spin text-black">
          📸
        </div>
        <p className="font-mono text-sm text-pixel-yellow">Loading PIXEL 2026 Platform...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark-950 text-slate-100">
      {/* Real-time SSE Live Notifications */}
      <NotificationToast onRefresh={refreshUser} />

      {/* Global Interactive Leaderboard Modal */}
      <LeaderboardModal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />

      <Navbar 
        currentView={currentView} 
        setView={setView} 
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)} 
      />
      
      <main className="flex-1">
        {currentView === 'home' && <HomePage setView={setView} />}
        {currentView === 'register' && <RegisterPage setView={setView} />}
        {currentView === 'login' && <LoginPage setView={setView} />}
        {currentView === 'dashboard' && (user ? <ParticipantDashboard setView={setView} /> : <LoginPage setView={setView} />)}
        {currentView === 'ticket' && (user ? <ETicketPage setView={setView} /> : <LoginPage setView={setView} />)}
        {currentView === 'admin' && (isAdmin ? <AdminDashboard setView={setView} /> : <LoginPage setView={setView} />)}
        {currentView === 'verify' && ((isAdmin || isStaff) ? <TicketVerificationPage setView={setView} /> : <LoginPage setView={setView} />)}
      </main>

      <Footer setView={setView} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
