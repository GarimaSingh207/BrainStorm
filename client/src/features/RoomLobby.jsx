import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { getSocket } from '../services/socket';
import FloatingElements from '../components/FloatingElements';

function getAvatarEmoji(userId) {
  const emojis = ['👽', '🤖', '👾', '🦊', '🐯', '🐸', '🐨', '🐼', '🦖', '🦄', '🦁', '🦉', '🐙', '🐝', '🦥', '🦘'];
  let sum = 0; for (let i = 0; i < userId.length; i++) sum += userId.charCodeAt(i);
  return emojis[sum % emojis.length];
}

export default function RoomLobby() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState({ code: null, name: null, status: null, participants: [] });
  const [isUserReady, setIsUserReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Host Modal State
  const [showHostModal, setShowHostModal] = useState(false);
  const [topicName, setTopicName] = useState('');
  const [searchEnrichment, setSearchEnrichment] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync Countdown State
  const [countdown, setCountdown] = useState(null);

  const accessToken = localStorage.getItem('accessToken');
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  
  const isHost = room.participants.find(p => p.userId === currentUser?.id)?.role === 'host';
  const allReady = room.participants.length > 0 && room.participants.every(p => p.isReady);

  async function fetchRoom() {
    try {
      const res = await api.get(`/rooms/${code}`);
      const dbRoom = res.data.room;
      const hostIdStr = typeof dbRoom.hostId === 'object' ? dbRoom.hostId._id : dbRoom.hostId;
      const participants = dbRoom.participants.map(p => {
        const pId = typeof p.userId === 'object' ? p.userId._id : p.userId;
        return { userId: pId, username: typeof p.userId === 'object' ? p.userId.username : undefined, role: hostIdStr === pId ? 'host' : 'player', isReady: p.isReady };
      });
      setRoom({ code: dbRoom.code, name: dbRoom.name, status: dbRoom.status, participants });
      const me = participants.find(p => p.userId === currentUser?.id);
      if (me) setIsUserReady(me.isReady);
    } catch (err) { console.error('Failed to fetch room', err); }
  }

  useEffect(() => {
    if (!accessToken || !currentUser) return navigate('/');
    setIsLoading(true);
    const socket = getSocket(accessToken);
    fetchRoom().then(() => { setIsLoading(false); socket.emit('room:join', { roomCode: code }); });
    socket.on('room:joined', () => fetchRoom());
    socket.on('room:presence', () => fetchRoom());
    socket.on('room:state_update', ({ userId, isReady }) => {
      setRoom(prev => ({ ...prev, participants: prev.participants.map(p => p.userId === userId ? { ...p, isReady } : p) }));
      if (userId === currentUser?.id) setIsUserReady(isReady);
    });
    socket.on('room:error', ({ message }) => setErrorMessage(message));
    
    socket.on('room:start_countdown', () => {
      setCountdown(5);
    });

    return () => { 
      socket.off('room:joined'); 
      socket.off('room:presence'); 
      socket.off('room:state_update'); 
      socket.off('room:error'); 
      socket.off('room:start_countdown');
    };
  }, [code]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      navigate(`/room/${code}/play`);
    }
  }, [countdown, code, navigate]);

  function handleReady() {
    const socket = getSocket(accessToken);
    const nextReady = !isUserReady;
    socket.emit('room:ready', { roomCode: code, isReady: nextReady });
    setIsUserReady(nextReady);
  }

  function handleLeave() {
    const socket = getSocket(accessToken);
    socket.emit('room:leave', { roomCode: code });
    navigate('/');
  }

  // File Upload Logic
  function addFiles(newFiles) { setFiles(prev => [...prev, ...Array.from(newFiles)]); setErrorMessage(''); setUploadSuccess(false); }
  function removeFile(indexToRemove) { setFiles(prev => prev.filter((_, idx) => idx !== indexToRemove)); }
  function handleDragOver(e) { e.preventDefault(); setIsDragOver(true); }
  function handleDragLeave() { setIsDragOver(false); }
  function handleDrop(e) { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files); }
  function handleFileInputChange(e) { if (e.target.files.length > 0) addFiles(e.target.files); }

  async function uploadSelectedFiles() {
    if (files.length === 0) return;
    setIsUploading(true);
    setErrorMessage('');
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      await api.post(`/rooms/${code}/upload_files`, formData);
      setFiles([]);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to upload files.');
    } finally {
      setIsUploading(false);
    }
  }

  // Host Generation Logic
  async function handleHostGenerate() {
    setIsGenerating(true);
    setErrorMessage('');
    try {
      // 1. Refine materials
      await api.post(`/rooms/${code}/upload`, { topicName, searchEnrichment: searchEnrichment ? 'true' : 'false' });
      // 2. Generate quiz
      await api.post(`/rooms/${code}/generate`);
      // 3. Emit start countdown
      const socket = getSocket(accessToken);
      socket.emit('room:start_countdown', { roomCode: code });
      setShowHostModal(false);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to process and generate game.');
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-8 text-text-main">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="text-8xl mb-8">🌀</motion.div>
        <p className="text-3xl font-black uppercase tracking-widest text-accent text-pulse-glow">Opening Arena Lobby...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas p-8 flex flex-col items-center relative overflow-hidden">
      <FloatingElements />
      
      {/* Full-screen countdown overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas/90 backdrop-blur-xl">
            <h2 className="text-5xl font-black uppercase text-accent mb-8">Game starting in...</h2>
            <motion.div key={countdown} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="text-[15rem] font-black text-primary text-outline">
              {countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Host Generation Modal */}
      <AnimatePresence>
        {showHostModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHostModal(false)} className="absolute inset-0 bg-canvas/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, y: 50, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 50, opacity: 0 }} className="glass-panel w-full max-w-xl border-accent relative z-10 !p-10 flex flex-col items-center">
              <h3 className="text-4xl font-black uppercase text-accent mb-2 text-outline">Configure Game</h3>
              <p className="text-lg font-bold text-text-muted mb-8 text-center">Set RAG filter and options before starting.</p>
              
              <div className="w-full flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xl font-black uppercase text-primary">🎯 RAG Topic Filter</label>
                  <input type="text" placeholder="e.g. Cell Division" value={topicName} onChange={(e) => setTopicName(e.target.value)} className="bg-surface border-4 border-surface-highlight focus:border-accent text-xl font-bold rounded-2xl py-3 px-4 text-text-main focus:outline-none transition-all duration-200" />
                </div>
                <div className="flex items-center gap-4 bg-surface-highlight/30 p-4 rounded-xl border-4 border-surface-highlight">
                  <input type="checkbox" id="searchEnrichment" checked={searchEnrichment} onChange={(e) => setSearchEnrichment(e.target.checked)} className="w-6 h-6 rounded cursor-pointer accent-accent" />
                  <label htmlFor="searchEnrichment" className="text-xl font-black uppercase text-secondary cursor-pointer select-none">🌐 Web Search Enrichment</label>
                </div>
              </div>

              <div className="flex w-full gap-4 mt-8">
                <button type="button" onClick={() => setShowHostModal(false)} className="btn btn-secondary !text-xl !py-3 !px-8 flex-1 !border-surface-highlight">Cancel</button>
                <button type="button" onClick={handleHostGenerate} disabled={isGenerating} className="btn btn-primary !bg-accent !text-surface !border-accent flex-1 !text-xl !py-3 !px-8 disabled:opacity-50">
                  {isGenerating ? 'Generating...' : 'Start Game 🚀'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-6xl glass-panel !p-6 flex justify-between items-center mb-8">
        <h2 className="text-3xl sm:text-5xl font-black uppercase text-text-main text-outline tracking-tighter">Lobby: <span className="text-accent">{code}</span></h2>
        <button onClick={handleLeave} className="btn btn-secondary !py-2 !px-6 !text-xl">Leave</button>
      </motion.div>
      
      {errorMessage && <div className="w-full max-w-6xl p-4 mb-6 bg-red-500/20 border-4 border-red-500 rounded-2xl text-center text-red-200 font-bold">💥 {errorMessage}</div>}
      
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="glass-panel lg:col-span-2 !p-8 border-primary flex flex-col gap-8">
          <div>
            <h3 className="text-3xl font-black uppercase mb-6 border-b-8 border-surface-highlight pb-4 flex justify-between items-center"><span>Star Explorers</span><span className="text-xl font-bold text-primary normal-case">({room.participants.length} connected)</span></h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              <AnimatePresence>
                {room.participants.map((player) => {
                  const isMe = player.userId === currentUser?.id;
                  return (
                    <motion.div key={player.userId} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} whileHover={{ scale: 1.05 }} className={`bg-surface-highlight border-4 ${player.isReady ? 'border-accent shadow-glow-primary' : 'border-primary'} rounded-3xl p-6 flex flex-col items-center shadow-island relative`}>
                      <div className="w-20 h-20 rounded-full bg-accent mb-4 border-4 border-surface flex items-center justify-center text-4xl relative">
                        {getAvatarEmoji(player.userId)}
                        {player.role === 'host' && <div className="absolute -top-3 -right-3 text-3xl" title="Host">👑</div>}
                      </div>
                      <span className="font-black text-xl uppercase truncate max-w-full text-center">{isMe ? <span className="text-accent">You</span> : (player.username || 'Explorer')}</span>
                      <span className={`text-xs font-black mt-2 tracking-widest uppercase ${player.isReady ? 'text-accent' : 'text-text-muted'}`}>{player.isReady ? 'READY' : 'NOT READY'}</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          <div className="bg-surface-highlight/30 p-6 rounded-[2rem] border-4 border-surface-highlight">
            <h3 className="text-2xl font-black uppercase mb-4 text-secondary">Contribute Materials</h3>
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => document.getElementById('fileInput').click()} className={`w-full p-8 border-[6px] border-dashed rounded-[2rem] cursor-pointer transition-all duration-300 ${isDragOver ? 'border-primary bg-primary/20 scale-[1.02] shadow-glow-primary' : 'border-surface-highlight bg-surface hover:border-accent hover:scale-[1.01]'}`}>
              <input id="fileInput" type="file" multiple accept=".txt,.md,.pdf,.json,.csv" onChange={handleFileInputChange} className="hidden" />
              <div className="flex flex-col items-center justify-center text-center">
                <div className="text-5xl mb-2">📥</div>
                <p className="text-lg font-black uppercase text-text-main">{isDragOver ? 'DROP IT!' : 'DRAG & DROP OR CLICK TO SELECT FILES'}</p>
              </div>
            </div>
            
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {files.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="bg-surface border-2 border-primary px-3 py-1 rounded-full font-bold flex items-center gap-2 text-sm">
                        <span>📄 {file.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="text-text-muted hover:text-red-400 font-black">✕</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={uploadSelectedFiles} disabled={isUploading} className="btn btn-secondary w-full text-lg uppercase !bg-secondary !text-canvas !border-secondary">
                    {isUploading ? 'Uploading...' : 'Upload Selected Files 🚀'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            {uploadSuccess && <div className="mt-4 text-center font-black text-accent uppercase">Files uploaded successfully! ✅</div>}
          </div>
        </motion.div>

        <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="glass-panel !p-8 flex flex-col justify-between border-secondary">
          <div>
            <h3 className="text-3xl font-black uppercase mb-8 border-b-8 border-surface-highlight pb-4">Mission Control</h3>
            <p className="text-xl font-bold mb-4">Room Name: <span className="text-primary">{room.name}</span></p>
            <p className="text-xl font-bold mb-4">Players: <span className="text-accent">{room.participants.length}</span> / 10</p>
            <p className="text-xl font-bold mb-4">Status: <span className="text-accent uppercase">{room.status}</span></p>
          </div>
          <div className="flex flex-col gap-4 mt-8">
            <button onClick={handleReady} className={`btn w-full text-2xl uppercase ${isUserReady ? 'btn-secondary !bg-[#ffafd8]/90 text-surface' : 'btn-primary'}`}>
              {isUserReady ? 'Cancel Ready' : 'Ready Up'}
            </button>
            {isHost && (
              <button 
                onClick={() => setShowHostModal(true)} 
                disabled={!allReady} 
                className={`btn w-full text-xl uppercase ${allReady ? 'btn-secondary !bg-accent !text-surface border-accent shadow-glow-primary hover:scale-[1.02]' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
                title={!allReady ? "Waiting for everyone to be ready" : "Configure and start the game"}
              >
                {allReady ? 'Configure & Start 🚀' : 'Waiting for Players...'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
