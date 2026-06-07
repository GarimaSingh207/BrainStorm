import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import FloatingElements from '../components/FloatingElements';

export default function UploadArena() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [topicName, setTopicName] = useState('');
  const [searchEnrichment, setSearchEnrichment] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [step, setStep] = useState('idle');
  const [ragPreview, setRagPreview] = useState('');
  const [wikiEnriched, setWikiEnriched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  function addFiles(newFiles) { setFiles(prev => [...prev, ...Array.from(newFiles)]); setErrorMessage(''); }
  function removeFile(indexToRemove) { setFiles(prev => prev.filter((_, idx) => idx !== indexToRemove)); }
  function handleDragOver(e) { e.preventDefault(); setIsDragOver(true); }
  function handleDragLeave() { setIsDragOver(false); }
  function handleDrop(e) { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files); }
  function handleFileInputChange(e) { if (e.target.files.length > 0) addFiles(e.target.files); }

  async function handleProcessAndGenerate() {
    if (files.length === 0) return;
    setErrorMessage('');
    try {
      setStep('uploading');
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      formData.append('topicName', topicName);
      formData.append('searchEnrichment', searchEnrichment ? 'true' : 'false');
      const uploadRes = await api.post(`/rooms/${code}/upload`, formData);
      setStep('rag');
      await new Promise(r => setTimeout(r, 1500));
      setRagPreview(uploadRes.data.retrievedPreview || '');
      setWikiEnriched(uploadRes.data.wikipediaFetched || false);
      setStep('generating');
      await api.post(`/rooms/${code}/generate`);
      await new Promise(r => setTimeout(r, 1500));
      setStep('done');
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to refine files or generate quiz.');
      setStep('idle');
    }
  }

  return (
    <div className="min-h-screen bg-canvas p-8 flex flex-col items-center justify-center relative overflow-hidden">
      <FloatingElements />
      <motion.div animate={{ scale: [1, 1.1, 1], x: [-30, 30, -30] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-accent/20 rounded-full blur-[120px] -z-10" />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-5xl flex flex-col items-center border-accent relative">
        <h2 className="text-6xl font-black uppercase text-accent mb-4 text-outline text-center">Material Refinery</h2>
        <p className="text-2xl font-bold text-center mb-8 border-b-8 border-surface-highlight pb-6 w-full text-text-main">Feed the AI. Target specific topics with <span className="text-accent">RAG</span>.</p>
        {errorMessage && <div className="w-full p-4 mb-6 bg-red-500/20 border-4 border-red-500 rounded-2xl text-center text-red-200 font-bold">💥 Error: {errorMessage}</div>}
        {step === 'idle' ? (
          <div className="w-full flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-highlight/30 p-6 rounded-[2rem] border-4 border-surface-highlight">
              <div className="flex flex-col gap-2">
                <label className="text-xl font-black uppercase text-primary flex items-center gap-2"><span>🎯</span> RAG Topic Filter</label>
                <input type="text" placeholder="e.g. Mitochondria, Cell Division" value={topicName} onChange={(e) => setTopicName(e.target.value)} className="bg-surface border-4 border-surface-highlight focus:border-accent text-xl font-bold rounded-2xl py-3 px-4 text-text-main focus:outline-none transition-all duration-200" />
              </div>
              <div className="flex flex-col justify-center items-start pl-0 md:pl-6">
                <div className="flex items-center gap-4 mb-2">
                  <input type="checkbox" id="searchEnrichment" checked={searchEnrichment} onChange={(e) => setSearchEnrichment(e.target.checked)} className="w-6 h-6 rounded cursor-pointer accent-accent" />
                  <label htmlFor="searchEnrichment" className="text-xl font-black uppercase text-secondary cursor-pointer select-none">🌐 Web Search Enrichment</label>
                </div>
              </div>
            </div>
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => document.getElementById('fileInput').click()} className={`w-full p-16 border-[8px] border-dashed rounded-[3rem] cursor-pointer transition-all duration-300 ${isDragOver ? 'border-primary bg-primary/20 scale-105 shadow-glow-primary' : 'border-surface-highlight bg-surface hover:border-accent hover:scale-[1.01]'}`}>
              <input id="fileInput" type="file" multiple accept=".txt,.md,.pdf,.json,.csv" onChange={handleFileInputChange} className="hidden" />
              <div className="flex flex-col items-center justify-center text-center">
                <motion.div animate={isDragOver ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}} transition={{ repeat: Infinity, duration: 1.5 }} className="text-7xl mb-4">📥</motion.div>
                <p className="text-2xl font-black uppercase text-text-main">{isDragOver ? 'DROP IT HERE!' : 'DRAG & DROP OR CLICK TO UPLOAD FILES'}</p>
              </div>
            </div>
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="w-full">
                  <h3 className="text-xl font-black uppercase mb-3 text-primary">Files to refine ({files.length}):</h3>
                  <div className="flex flex-wrap gap-3">
                    {files.map((file, idx) => (
                      <motion.div key={`${file.name}-${idx}`} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0, opacity: 0 }} className="bg-surface-highlight border-4 border-primary px-4 py-2 rounded-full font-bold shadow-island flex items-center gap-3">
                        <span>📄 {file.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="text-text-muted hover:text-accent font-black text-lg">✕</button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center p-8">
            <h3 className="text-4xl font-black text-outline text-primary mb-12 uppercase tracking-widest text-center">REFINERY ENGINE ACTIVE</h3>
            <div className="w-full max-w-2xl flex flex-col gap-6">
              <div className="flex items-center gap-4 bg-surface p-6 rounded-3xl border-4 border-surface-highlight"><span className="text-3xl">{step === 'uploading' ? '🔄' : '✅'}</span><div><div className="text-lg font-black uppercase text-accent">Step 1: Uploading materials</div></div></div>
              <div className="flex items-center gap-4 bg-surface p-6 rounded-3xl border-4 border-surface-highlight"><span className="text-3xl">{step === 'uploading' ? '⏳' : step === 'rag' ? '🔄' : '✅'}</span><div><div className="text-lg font-black uppercase text-accent">Step 2: Topic-based RAG matching</div></div></div>
              <div className="flex items-center gap-4 bg-surface p-6 rounded-3xl border-4 border-surface-highlight"><span className="text-3xl">{['uploading', 'rag'].includes(step) ? '⏳' : step === 'generating' ? '🔄' : '✅'}</span><div><div className="text-lg font-black uppercase text-accent">Step 3: AI Exam Question Generation</div></div></div>
            </div>
            {step !== 'uploading' && ragPreview && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl mt-12 bg-surface p-6 rounded-[2rem] border-8 border-dashed border-accent/40 text-left">
                <div className="flex justify-between items-center mb-4"><span className="text-lg font-black uppercase text-accent">🎯 RAG Retrieved Chunks:</span>{wikiEnriched && <span className="bg-secondary text-surface px-3 py-1 rounded-full text-xs font-black uppercase">🌐 Wiki Enriched</span>}</div>
                <div className="bg-canvas/50 p-4 rounded-2xl border-4 border-surface-highlight font-mono text-sm max-h-48 overflow-y-auto text-text-main">{ragPreview}</div>
              </motion.div>
            )}
            {step === 'done' && (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="mt-12 flex flex-col items-center gap-4">
                <div className="text-5xl">🎉</div><h4 className="text-3xl font-black uppercase text-accent text-pulse-glow">REFINEMENT COMPLETE!</h4>
                <button onClick={() => navigate(`/room/${code}/play`)} className="btn btn-primary bg-accent border-accent text-surface text-2xl py-4 px-12 mt-4 shadow-glow-primary hover:scale-105">Enter Play Arena 🚀</button>
              </motion.div>
            )}
          </div>
        )}
        {step === 'idle' && (
          <div className="w-full flex justify-between mt-10 pt-6 border-t-8 border-surface-highlight">
            <button onClick={() => navigate(`/room/${code}`)} className="btn btn-secondary border-secondary">Back to Lobby</button>
            <button disabled={files.length === 0} onClick={handleProcessAndGenerate} className="btn btn-primary bg-accent border-accent text-surface w-64 disabled:opacity-50 disabled:cursor-not-allowed">Refine & Generate</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
