import React, { useState, useEffect } from 'react';
import { Trophy, Award, X, Sparkles, Camera, Star, Filter } from 'lucide-react';
import { api } from '../services/api';

export const LeaderboardModal = ({ isOpen, onClose }) => {
  const [roundFilter, setRoundFilter] = useState('1');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const data = await api.getLeaderboard({ round: roundFilter });
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [isOpen, roundFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-dark-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-dark-950 via-dark-900 to-dark-950 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-pixel-yellow/10 border border-pixel-yellow/30 flex items-center justify-center text-pixel-yellow">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold tracking-widest text-pixel-yellow uppercase">
                  OFFICIAL RANKINGS
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  LIVE
                </span>
              </div>
              <h2 className="text-2xl font-bold font-syne text-white">
                PIXEL 2026 Leaderboard
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Round Tabs */}
        <div className="bg-dark-950/60 p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setRoundFilter('1')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                roundFilter === '1'
                  ? 'bg-pixel-yellow text-black shadow-lg shadow-pixel-yellow/20'
                  : 'bg-dark-800 text-slate-300 hover:bg-dark-700'
              }`}
            >
              ROUND 1: ONE FRAME, ONE STORY
            </button>
            <button
              onClick={() => setRoundFilter('2')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                roundFilter === '2'
                  ? 'bg-pixel-yellow text-black shadow-lg shadow-pixel-yellow/20'
                  : 'bg-dark-800 text-slate-300 hover:bg-dark-700'
              }`}
            >
              ROUND 2: SHUTTER HUNT
            </button>
            <button
              onClick={() => setRoundFilter('3')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                roundFilter === '3'
                  ? 'bg-pixel-yellow text-black shadow-lg shadow-pixel-yellow/20'
                  : 'bg-dark-800 text-slate-300 hover:bg-dark-700'
              }`}
            >
              ROUND 3: FINAL EXHIBITION
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Judged on 4 criteria &bull; Total: 100 pts
          </div>
        </div>

        {/* Content Table / Cards */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-pixel-yellow border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-mono text-slate-400">Loading verified scores...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Camera className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">No Evaluated Submissions Yet</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Judging for Round {roundFilter} is currently underway. Evaluated photographs and scores will appear here in real-time as judges submit their evaluations.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {leaderboard.map((item, index) => {
                let rankBadge = (
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-slate-300 text-sm">
                    #{index + 1}
                  </div>
                );

                if (index === 0) {
                  rankBadge = (
                    <div className="w-9 h-9 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 font-bold text-base shadow-lg shadow-amber-400/20">
                      🥇
                    </div>
                  );
                } else if (index === 1) {
                  rankBadge = (
                    <div className="w-9 h-9 rounded-full bg-slate-300/20 border-2 border-slate-300 flex items-center justify-center text-slate-200 font-bold text-base">
                      🥈
                    </div>
                  );
                } else if (index === 2) {
                  rankBadge = (
                    <div className="w-9 h-9 rounded-full bg-amber-700/20 border-2 border-amber-600 flex items-center justify-center text-amber-500 font-bold text-base">
                      🥉
                    </div>
                  );
                }

                return (
                  <div
                    key={item.submission_id}
                    className="p-4 rounded-xl bg-dark-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center space-x-4">
                      {rankBadge}

                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700">
                        <img
                          src={item.photo_path}
                          alt={item.photo_title}
                          className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => window.open(item.photo_path, '_blank')}
                        />
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-100 text-base">{item.photo_title}</h4>
                        <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1">
                          <span className="text-pixel-yellow font-semibold">{item.full_name}</span>
                          <span>&bull;</span>
                          <span>{item.college_name}</span>
                          <span>&bull;</span>
                          <span className="font-mono text-slate-500">{item.registration_id}</span>
                        </div>
                        {item.judge_feedback && (
                          <p className="text-xs text-slate-400 italic mt-1.5">
                            "{item.judge_feedback}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 self-end md:self-center">
                      <div className="hidden sm:grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
                        <div className="bg-dark-900 px-2 py-1 rounded border border-slate-800">
                          <div className="text-slate-500">Creativity</div>
                          <div className="font-bold text-slate-200">{item.score_creativity}</div>
                        </div>
                        <div className="bg-dark-900 px-2 py-1 rounded border border-slate-800">
                          <div className="text-slate-500">Theme</div>
                          <div className="font-bold text-slate-200">{item.score_theme}</div>
                        </div>
                        <div className="bg-dark-900 px-2 py-1 rounded border border-slate-800">
                          <div className="text-slate-500">Story</div>
                          <div className="font-bold text-slate-200">{item.score_storytelling}</div>
                        </div>
                        <div className="bg-dark-900 px-2 py-1 rounded border border-slate-800">
                          <div className="text-slate-500">Tech</div>
                          <div className="font-bold text-slate-200">{item.score_technical}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-mono text-slate-400 uppercase">Total Score</div>
                        <div className="text-2xl font-black font-mono text-pixel-yellow">
                          {item.total_score}<span className="text-xs text-slate-500 font-normal">/100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
