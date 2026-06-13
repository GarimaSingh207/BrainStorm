import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import FloatingElements from '../components/FloatingElements';

function formatTime(secs) {
  const m = Math.floor(secs / 60); const s = secs % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

export default function QuizArena() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [timerConfig, setTimerConfig] = useState({ mode: 'per_question_fixed', perQuestionSeconds: 15 });
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [globalSecondsLeft, setGlobalSecondsLeft] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [score, setScore] = useState(0);
  const [answersHistory, setAnswersHistory] = useState([]);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [leaderboardCountdown, setLeaderboardCountdown] = useState(20);
  const perQuestionTimerRef = useRef(null);
  const globalTimerRef = useRef(null);
  const leaderboardTimerRef = useRef(null);
  const questionStartRef = useRef(Date.now());

  useEffect(() => { fetchQuiz(); return () => { if (perQuestionTimerRef.current) clearInterval(perQuestionTimerRef.current); if (globalTimerRef.current) clearInterval(globalTimerRef.current); if (leaderboardTimerRef.current) clearInterval(leaderboardTimerRef.current); }; }, [code]);
  useEffect(() => {
    if (loading) return;
    if (countdown > 0) { const t = setTimeout(() => setCountdown(p => p - 1), 1000); return () => clearTimeout(t); }
    if (countdown === 0 && !isPlaying && !isFinished) { setIsPlaying(true); startSession(0); }
  }, [countdown, isPlaying, loading, isFinished]);

  useEffect(() => {
    if (!isFinished) return;
    setLeaderboardCountdown(20);
    leaderboardTimerRef.current = setInterval(() => {
      setLeaderboardCountdown(prev => {
        if (prev <= 1) {
          clearInterval(leaderboardTimerRef.current);
          navigate(`/room/${code}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (leaderboardTimerRef.current) clearInterval(leaderboardTimerRef.current); };
  }, [isFinished]);

  async function fetchQuiz() {
    try {
      setLoading(true);
      const res = await api.get(`/rooms/${code}/quiz`);
      if (res.data.questions?.length > 0) { setQuestions(res.data.questions); if (res.data.timerConfig) setTimerConfig(res.data.timerConfig); }
      else throw new Error('No questions found');
    } catch (err) {
      setQuestions([ { _id: 'q1', type: 'MCQ', content: 'Fallback Question 1?', options: [{ id: 'A', text: 'Opt A' }, { id: 'B', text: 'Opt B' }], correctAnswerId: 'A' } ]);
    } finally { setLoading(false); }
  }

  function startSession(idx) {
    questionStartRef.current = Date.now();
    if (timerConfig.mode === 'global_countdown') startGlobalTimer(timerConfig.totalSeconds || questions.length * 60);
    else startPerQuestionTimer(getSecondsForQuestion(idx));
  }

  function getSecondsForQuestion(idx) {
    if (timerConfig.mode === 'per_question_dynamic' && timerConfig.perQuestionTimes) return timerConfig.perQuestionTimes[idx] ?? 20;
    return timerConfig.perQuestionSeconds ?? 15;
  }

  function startPerQuestionTimer(secs) {
    if (perQuestionTimerRef.current) clearInterval(perQuestionTimerRef.current);
    setSecondsLeft(secs); setTimedOut(false);
    perQuestionTimerRef.current = setInterval(() => {
      setSecondsLeft(prev => { if (prev <= 1) { clearInterval(perQuestionTimerRef.current); handleTimeout(); return 0; } return prev - 1; });
    }, 1000);
  }

  function startGlobalTimer(totalSecs) {
    if (globalTimerRef.current) clearInterval(globalTimerRef.current);
    setGlobalSecondsLeft(totalSecs);
    globalTimerRef.current = setInterval(() => {
      setGlobalSecondsLeft(prev => { if (prev <= 1) { clearInterval(globalTimerRef.current); setIsPlaying(false); setIsFinished(true); return 0; } return prev - 1; });
    }, 1000);
  }

  function handleTimeout() {
    setSelectedOption(null); setTimedOut(true); setIsAnswered(true); setShowFeedback(true);
    setAnswersHistory(prev => { const currentQ = questions[currentIdx]; if (!currentQ) return prev; return [...prev, { questionIndex: currentIdx, questionText: currentQ.content, selectedId: null, correctId: currentQ.correctAnswerId, isCorrect: false, timeSpent: (Date.now() - questionStartRef.current) / 1000, timedOut: true }]; });
  }

  function handleSelectOption(optId) {
    if (isAnswered) return;
    if (perQuestionTimerRef.current) clearInterval(perQuestionTimerRef.current);
    setSelectedOption(optId); setIsAnswered(true); setShowFeedback(true);
    const currentQ = questions[currentIdx]; const isCorrect = currentQ.correctAnswerId === optId; const timeSpent = (Date.now() - questionStartRef.current) / 1000;
    if (isCorrect) setScore(p => p + 500 + Math.round((timerConfig.mode !== 'global_countdown' ? secondsLeft : 0) * 50));
    setAnswersHistory(prev => [...prev, { questionIndex: currentIdx, questionText: currentQ.content, selectedId: optId, correctId: currentQ.correctAnswerId, isCorrect, timeSpent, timedOut: false }]);
    setTotalTimeSpent(p => p + timeSpent);
  }

  function handleNext() {
    const nextIdx = currentIdx + 1;
    if (nextIdx < questions.length) {
      setCurrentIdx(nextIdx); setSelectedOption(null); setIsAnswered(false); setShowFeedback(false); setTimedOut(false); questionStartRef.current = Date.now();
      if (timerConfig.mode !== 'global_countdown') startPerQuestionTimer(getSecondsForQuestion(nextIdx));
    } else {
      if (perQuestionTimerRef.current) clearInterval(perQuestionTimerRef.current);
      if (globalTimerRef.current) clearInterval(globalTimerRef.current);
      setIsPlaying(false); setIsFinished(true);
    }
  }

  function goToLobby() {
    if (leaderboardTimerRef.current) clearInterval(leaderboardTimerRef.current);
    navigate(`/room/${code}`);
  }

  if (loading) return <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-8"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="text-8xl mb-8">🧬</motion.div><p className="text-3xl font-black uppercase text-accent">Assembling Arena...</p></div>;
  const currentQuestion = questions[currentIdx];
  const correctCount = answersHistory.filter(h => h.isCorrect).length;
  const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const avgTime = answersHistory.length > 0 ? (answersHistory.reduce((s, h) => s + h.timeSpent, 0) / answersHistory.length).toFixed(1) : '0.0';

  const getRank = (acc) => {
    if (acc === 100) return { label: '🏆 PERFECT', color: '#ffd700' };
    if (acc >= 80) return { label: '🥇 EXCELLENT', color: '#3ddccb' };
    if (acc >= 60) return { label: '🥈 GOOD JOB', color: '#a78bfa' };
    if (acc >= 40) return { label: '🥉 KEEP GOING', color: '#f97316' };
    return { label: '💪 PRACTICE MORE', color: '#ef4444' };
  };
  const rank = getRank(accuracy);

  return (
    <div className="min-h-screen bg-canvas p-4 sm:p-8 flex flex-col items-center justify-center overflow-hidden relative">
      <FloatingElements />
      <AnimatePresence mode="wait">
        {!isPlaying && !isFinished && (
          <motion.div key="countdown" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 2, opacity: 0, filter: 'blur(20px)' }} className="flex flex-col items-center z-10">
            <h2 className="text-4xl font-black uppercase text-surface-highlight mb-8">Get Ready</h2>
            <div className="text-[clamp(10rem,30vw,20rem)] font-black text-outline text-primary leading-none">{countdown}</div>
          </motion.div>
        )}
        {isPlaying && currentQuestion && (
          <motion.div key="active-quiz" initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -200, opacity: 0 }} className="w-full max-w-6xl flex flex-col gap-8 relative z-10">
            <div className="flex justify-between items-center w-full flex-wrap gap-4">
              <div className="glass-panel !rounded-full !p-6 !py-4 flex gap-4 items-center border-accent"><span className="text-4xl">⏱️</span><span className="text-4xl font-black text-accent">{timerConfig.mode === 'global_countdown' ? formatTime(globalSecondsLeft) : formatTime(secondsLeft)}</span></div>
              <div className="text-2xl font-black text-text-muted">Question {currentIdx + 1} / {questions.length}</div>
              <div className="glass-panel !rounded-full !p-6 !py-4 flex gap-4 items-center border-secondary"><span className="text-2xl font-bold uppercase text-text-muted">Score</span><span className="text-4xl font-black">{score.toLocaleString()}</span></div>
            </div>
            <div className="glass-panel border-primary w-full flex items-center justify-center min-h-[30vh]">
              <h2 className="text-[clamp(1.8rem,4vw,3.2rem)] font-black uppercase text-center text-white text-outline">{currentQuestion.content}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
              {currentQuestion.options.map((opt, i) => {
                let optionStyle = `border-[8px] bg-surface-elevated`;
                if (isAnswered) { if (opt.id === currentQuestion.correctAnswerId) optionStyle = 'border-8 border-[#3ddccb] bg-[#3ddccb]/20'; else if (selectedOption === opt.id) optionStyle = 'border-8 border-red-500 bg-red-500/20'; else optionStyle = 'border-8 border-surface-highlight bg-surface/40 opacity-40'; }
                return (
                  <motion.button key={opt.id} disabled={isAnswered} whileHover={isAnswered ? {} : { scale: 1.02, y: -5 }} onClick={() => handleSelectOption(opt.id)} className={`relative overflow-hidden rounded-[3rem] p-8 text-left shadow-island transition-all duration-300 ${optionStyle}`}>
                    <div className="flex items-center gap-6"><div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black bg-primary text-canvas">{opt.id}</div><span className="text-2xl font-bold text-white">{opt.text}</span></div>
                  </motion.button>
                );
              })}
            </div>
            <AnimatePresence>
              {showFeedback && (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col items-center gap-6 mt-4">
                  <div className={`glass-panel w-full !p-8 text-center text-3xl font-black uppercase border-8 ${timedOut ? 'border-yellow-500 text-yellow-400' : selectedOption === currentQuestion.correctAnswerId ? 'border-[#3ddccb] text-[#3ddccb]' : 'border-red-500 text-red-400'}`}>
                    {timedOut ? `⏰ TIME OUT! Correct: ${currentQuestion.correctAnswerId}` : selectedOption === currentQuestion.correctAnswerId ? `🎉 CORRECT! +${500 + Math.round(secondsLeft * 50)} PTS` : `💥 INCORRECT! Correct: ${currentQuestion.correctAnswerId}`}
                  </div>
                  <button onClick={handleNext} className="btn btn-primary !bg-accent !text-surface !border-accent !text-xl !py-3 !px-8">{currentIdx + 1 < questions.length ? 'Next Question ➡️' : 'Reveal Scorecard 🏅'}</button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        {isFinished && (
          <motion.div
            key="leaderboard"
            initial={{ scale: 0.85, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-full max-w-3xl flex flex-col gap-6 z-10"
          >
            {/* Header */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                className="text-7xl mb-3"
              >🏆</motion.div>
              <h1 className="text-5xl font-black uppercase tracking-widest text-white" style={{ textShadow: '0 0 30px rgba(255,215,0,0.5)' }}>Leaderboard</h1>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                className="text-2xl font-black mt-2 uppercase tracking-widest"
                style={{ color: rank.color }}
              >{rank.label}</motion.div>
            </div>

            {/* Score Podium */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="glass-panel !p-8 flex justify-around items-end gap-4"
              style={{ border: `3px solid ${rank.color}`, boxShadow: `0 0 40px ${rank.color}33` }}
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-4xl">🎯</span>
                <span className="text-5xl font-black" style={{ color: rank.color }}>{score.toLocaleString()}</span>
                <span className="text-xs font-black uppercase text-text-muted tracking-widest">Final Score</span>
              </div>
              <div className="w-px h-16 bg-surface-highlight opacity-40" />
              <div className="flex flex-col items-center gap-2">
                <span className="text-4xl">✅</span>
                <span className="text-5xl font-black text-[#3ddccb]">{correctCount}<span className="text-2xl text-text-muted">/{questions.length}</span></span>
                <span className="text-xs font-black uppercase text-text-muted tracking-widest">Correct</span>
              </div>
              <div className="w-px h-16 bg-surface-highlight opacity-40" />
              <div className="flex flex-col items-center gap-2">
                <span className="text-4xl">⚡</span>
                <span className="text-5xl font-black text-primary">{accuracy}<span className="text-2xl">%</span></span>
                <span className="text-xs font-black uppercase text-text-muted tracking-widest">Accuracy</span>
              </div>
              <div className="w-px h-16 bg-surface-highlight opacity-40" />
              <div className="flex flex-col items-center gap-2">
                <span className="text-4xl">⏱️</span>
                <span className="text-5xl font-black text-accent">{avgTime}<span className="text-2xl">s</span></span>
                <span className="text-xs font-black uppercase text-text-muted tracking-widest">Avg Time</span>
              </div>
            </motion.div>

            {/* Per-Question Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="glass-panel !p-6 flex flex-col gap-3"
            >
              <h3 className="text-lg font-black uppercase tracking-widest text-text-muted mb-2">Question Breakdown</h3>
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                {answersHistory.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.05 }}
                    className={`flex items-center gap-4 rounded-2xl px-4 py-3 ${h.isCorrect ? 'bg-[#3ddccb]/10 border border-[#3ddccb]/40' : h.timedOut ? 'bg-yellow-500/10 border border-yellow-500/40' : 'bg-red-500/10 border border-red-500/40'}`}
                  >
                    <span className="text-2xl flex-shrink-0">{h.isCorrect ? '✅' : h.timedOut ? '⏰' : '❌'}</span>
                    <span className="font-bold text-text-muted text-sm flex-shrink-0">Q{h.questionIndex + 1}</span>
                    <span className="text-sm font-semibold text-white truncate flex-1">{h.questionText}</span>
                    <span className="text-sm font-black text-text-muted flex-shrink-0 ml-auto">{h.timeSpent.toFixed(1)}s</span>
                    <span className={`text-sm font-black flex-shrink-0 ${h.isCorrect ? 'text-[#3ddccb]' : h.timedOut ? 'text-yellow-400' : 'text-red-400'}`}>
                      {h.isCorrect ? `+500` : h.timedOut ? 'TIMEOUT' : 'MISS'}
                    </span>
                  </motion.div>
                ))}
                {answersHistory.length === 0 && (
                  <p className="text-center text-text-muted text-sm py-4">No answers recorded</p>
                )}
              </div>
            </motion.div>

            {/* Auto-redirect countdown + Lobby button */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
              className="flex flex-col items-center gap-4"
            >
              {/* Progress bar */}
              <div className="w-full glass-panel !p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black uppercase text-text-muted tracking-widest">Returning to lobby in</span>
                  <span className="text-2xl font-black" style={{ color: leaderboardCountdown <= 5 ? '#ef4444' : '#3ddccb' }}>
                    {leaderboardCountdown}s
                  </span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '9999px',
                      background: leaderboardCountdown <= 5
                        ? 'linear-gradient(90deg, #ef4444, #f97316)'
                        : 'linear-gradient(90deg, #3ddccb, #a78bfa)',
                      width: `${(leaderboardCountdown / 20) * 100}%`,
                      transition: 'width 1s linear, background 0.3s ease'
                    }}
                  />
                </div>
              </div>

              {/* Go to Lobby Button */}
              <motion.button
                id="go-to-lobby-btn"
                onClick={goToLobby}
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.97 }}
                className="btn btn-secondary !text-xl !py-4 !px-14 flex items-center gap-3"
                style={{ border: '3px solid rgba(167,139,250,0.6)', background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}
              >
                🚪 Go to Lobby
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
