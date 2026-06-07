import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import FloatingElements from '../components/FloatingElements';

export default function Home() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) { setIsLoggedIn(true); setCurrentUser(JSON.parse(storedUser)); }
  }, []);

  function saveAuth(data) {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setIsLoggedIn(true);
    setCurrentUser(data.user);
  }

  async function handleQuickPlay() {
    setIsLoading(true); setErrorMessage('');
    try {
      const guestId = Math.floor(1000 + Math.random() * 9000);
      const res = await api.post('/auth/signup', { username: `Guest_${guestId}`, email: `guest_${guestId}@brainstorm.arena`, password: `guest_secret_${guestId}` });
      saveAuth(res.data);
    } catch (err) { setErrorMessage(err.response?.data?.error || 'Failed to start guest session.'); } finally { setIsLoading(false); }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault(); setIsLoading(true); setErrorMessage('');
    try {
      if (authMode === 'login') {
        const res = await api.post('/auth/login', { email, password });
        saveAuth(res.data);
      } else {
        const res = await api.post('/auth/signup', { username, email, password });
        saveAuth(res.data);
      }
    } catch (err) { setErrorMessage(err.response?.data?.error || 'Authentication failed.'); } finally { setIsLoading(false); }
  }

  function handleLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setIsLoggedIn(false); setCurrentUser(null);
  }

  async function handleCreateRoom() {
    setIsLoading(true); setErrorMessage('');
    try {
      const res = await api.post('/rooms', { name: `${currentUser?.username || 'Star'}'s Arena`, type: 'Public', settings: { maxPlayers: 10, difficulty: 'medium', questionCount: 5 } });
      navigate(`/room/${res.data.room.code}`);
    } catch (err) { setErrorMessage(err.response?.data?.error || 'Failed to create room.'); } finally { setIsLoading(false); }
  }

  async function handleJoinSubmit(e) {
    e.preventDefault(); if (!roomCode.trim()) return;
    setIsLoading(true); setErrorMessage('');
    try {
      const code = roomCode.toUpperCase().trim();
      const res = await api.get(`/rooms/${code}`);
      if (res.data.room) { setIsJoinModalOpen(false); navigate(`/room/${code}`); }
    } catch (err) { setErrorMessage(err.response?.data?.error || 'Room not found!'); } finally { setIsLoading(false); }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-canvas flex flex-col items-center justify-center p-8">
      <FloatingElements />
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 150, repeat: Infinity, ease: 'linear' }} className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-primary-container/30 blur-[120px] -z-10" />
      <motion.div animate={{ rotate: -360 }} transition={{ duration: 200, repeat: Infinity, ease: 'linear' }} className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-secondary-container/30 blur-[100px] -z-10" />
      <div className="w-full max-w-5xl relative z-10">
        <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', bounce: 0.5 }} className="mb-8 text-center">
          <h1 className="text-[clamp(3.5rem,8vw,7rem)] leading-[0.9] font-black uppercase text-primary text-outline">BrainStorm<br /><span className="text-secondary text-outline">Arena</span></h1>
          <p className="text-xl md:text-2xl font-bold text-text-main mt-4">Upload material <span className="text-primary">→</span> Merge <span className="text-accent">→</span> Generate <span className="text-secondary">→</span> Compete</p>
        </motion.div>
        {errorMessage && <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-8 p-4 bg-red-500/20 border-4 border-red-500 rounded-2xl text-center text-red-200 font-bold text-lg">💥 {errorMessage}</motion.div>}
        <AnimatePresence mode="wait">
          {!isLoggedIn ? (
            <motion.div key="auth-panel" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel w-full max-w-2xl mx-auto border-secondary">
              <div className="flex border-b-[6px] border-surface-highlight mb-8">
                <button onClick={() => { setAuthMode('login'); setErrorMessage(''); }} className={`flex-1 py-4 font-display font-black text-2xl uppercase transition-all duration-200 ${authMode === 'login' ? 'text-secondary border-b-8 border-secondary scale-105' : 'text-text-muted hover:text-text-main'}`}>Sign In</button>
                <button onClick={() => { setAuthMode('signup'); setErrorMessage(''); }} className={`flex-1 py-4 font-display font-black text-2xl uppercase transition-all duration-200 ${authMode === 'signup' ? 'text-primary border-b-8 border-primary scale-105' : 'text-text-muted hover:text-text-main'}`}>Create Account</button>
              </div>
              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-6">
                {authMode === 'signup' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-lg font-black uppercase text-primary">Explorer Username</label>
                    <input type="text" required placeholder="e.g. CaptainCosmo" value={username} onChange={(e) => setUsername(e.target.value)} className="bg-surface border-4 border-surface-highlight focus:border-primary text-2xl font-bold rounded-2xl py-4 px-5 text-text-main focus:outline-none transition-all duration-200" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-black uppercase text-primary">Email Address</label>
                  <input type="email" required placeholder="explorer@galaxy.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-surface border-4 border-surface-highlight focus:border-primary text-2xl font-bold rounded-2xl py-4 px-5 text-text-main focus:outline-none transition-all duration-200" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-black uppercase text-primary">Master Code (Password)</label>
                  <input type="password" required placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-surface border-4 border-surface-highlight focus:border-primary text-2xl font-bold rounded-2xl py-4 px-5 text-text-main focus:outline-none transition-all duration-200" />
                </div>
                <button type="submit" disabled={isLoading} className={`btn btn-primary mt-4 w-full uppercase py-5 text-2xl ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>{isLoading ? 'Decrypting...' : authMode === 'login' ? 'Enter Arena 🚀' : 'Launch Explorer ✨'}</button>
                <div className="flex items-center gap-4 my-2"><div className="flex-1 h-1 bg-surface-highlight" /><span className="font-bold text-text-muted text-lg">OR PLAY NOW</span><div className="flex-1 h-1 bg-surface-highlight" /></div>
                <button type="button" onClick={handleQuickPlay} disabled={isLoading} className="btn btn-secondary w-full uppercase py-5 text-2xl !bg-accent !text-surface border-accent">⚡ Fast Play (Guest Account)</button>
              </form>
            </motion.div>
          ) : (
            <motion.div key="controls-panel" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel w-full max-w-4xl mx-auto border-primary !p-16 text-center">
              <div className="flex flex-col sm:flex-row items-center justify-between bg-surface-highlight/50 p-6 rounded-[2rem] border-4 border-surface-highlight mb-12">
                <div className="flex items-center gap-6 mb-4 sm:mb-0"><div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-4xl shadow-island border-4 border-surface">🧑‍🚀</div><div className="text-left"><div className="text-sm font-black text-accent uppercase tracking-widest">Active Explorer</div><div className="text-3xl font-black uppercase text-text-main">{currentUser?.username}</div></div></div>
                <button onClick={handleLogout} className="btn btn-secondary !py-2 !px-8 !text-lg !border-surface-highlight !bg-surface-highlight/80 hover:!bg-red-500/20 hover:!border-red-500 hover:text-red-200">Logout</button>
              </div>
              <div className="flex flex-col md:flex-row justify-center items-center gap-8">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCreateRoom} disabled={isLoading} className="btn btn-primary w-full md:w-auto text-3xl px-16 py-6">{isLoading ? 'Creating...' : 'Create Room'}</motion.button>
                <div className="font-black text-4xl text-surface-highlight opacity-50">OR</div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsJoinModalOpen(true)} disabled={isLoading} className="btn btn-secondary w-full md:w-auto text-3xl px-16 py-6">Join Game</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsJoinModalOpen(false); setErrorMessage(''); }} className="absolute inset-0 bg-canvas/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, y: 50, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 50, opacity: 0 }} transition={{ type: 'spring', bounce: 0.4 }} className="glass-panel w-full max-w-xl border-secondary relative z-10 !p-10 flex flex-col items-center">
              <h3 className="text-5xl font-black uppercase text-secondary mb-2 text-outline">Enter Room</h3>
              <p className="text-xl font-bold text-text-muted mb-8 text-center">Input the code below to join the arena!</p>
              <form onSubmit={handleJoinSubmit} className="w-full flex flex-col items-center gap-6">
                <input type="text" maxLength={12} placeholder="ROOM-CODE" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} className="bg-surface-highlight border-[6px] border-surface-highlight focus:border-accent text-center text-4xl font-black rounded-3xl py-5 px-6 uppercase text-accent w-full focus:outline-none transition-all duration-300" />
                <div className="flex w-full gap-4 mt-4">
                  <button type="button" onClick={() => { setIsJoinModalOpen(false); setErrorMessage(''); }} className="btn btn-secondary !text-xl !py-3 !px-8 flex-1 !border-surface-highlight">Cancel</button>
                  <button type="submit" disabled={!roomCode.trim() || isLoading} className="btn btn-primary !bg-accent !text-surface !border-accent flex-1 !text-xl !py-3 !px-8 disabled:opacity-50">{isLoading ? 'Verifying...' : 'Go! 🚀'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
