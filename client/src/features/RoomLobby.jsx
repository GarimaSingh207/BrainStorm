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

  const accessToken = localStorage.getItem('accessToken');
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

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
    return () => { socket.off('room:joined'); socket.off('room:presence'); socket.off('room:state_update'); socket.off('room:error'); };
  }, [code]);

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
      <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-6xl glass-panel !p-6 flex justify-between items-center mb-12">
        <h2 className="text-3xl sm:text-5xl font-black uppercase text-text-main text-outline tracking-tighter">Lobby: <span className="text-accent">{code}</span></h2>
        <button onClick={handleLeave} className="btn btn-secondary !py-2 !px-6 !text-xl">Leave</button>
      </motion.div>
      {errorMessage && <div className="w-full max-w-6xl p-4 mb-6 bg-red-500/20 border-4 border-red-500 rounded-2xl text-center text-red-200 font-bold">💥 {errorMessage}</div>}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="glass-panel lg:col-span-2 !p-8 border-primary">
          <h3 className="text-4xl font-black uppercase mb-8 border-b-8 border-surface-highlight pb-4 flex justify-between items-center"><span>Star Explorers</span><span className="text-xl font-bold text-primary normal-case">({room.participants.length} connected)</span></h3>
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
        </motion.div>
        <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="glass-panel !p-8 flex flex-col justify-between border-secondary">
          <div>
            <h3 className="text-4xl font-black uppercase mb-8 border-b-8 border-surface-highlight pb-4">Mission Control</h3>
            <p className="text-xl font-bold mb-4">Room Name: <span className="text-primary">{room.name}</span></p>
            <p className="text-xl font-bold mb-4">Players: <span className="text-accent">{room.participants.length}</span> / 10</p>
            <p className="text-xl font-bold mb-4">Status: <span className="text-accent uppercase">{room.status}</span></p>
          </div>
          <div className="flex flex-col gap-4 mt-8">
            <button onClick={handleReady} className={`btn w-full text-2xl uppercase ${isUserReady ? 'btn-secondary !bg-[#ffafd8]/90' : 'btn-primary'}`}>{isUserReady ? 'Cancel Ready' : 'Ready Up'}</button>
            <button onClick={() => navigate(`/room/${code}/upload`)} className="btn btn-secondary w-full text-xl uppercase !bg-accent !text-surface border-accent shadow-glow-primary hover:scale-[1.02]">Refine & Upload 🚀</button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
