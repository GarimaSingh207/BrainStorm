import { motion } from 'framer-motion';
const items = [
  { id: 1, emoji: '🧑‍🚀', size: 88, startX: '8%', startY: '10%', glow: 'primary', duration: 28, delay: 0, moveX: [0, 140, -120, 80, 0], moveY: [0, 100, 160, -80, 0] },
  { id: 2, emoji: '👩‍🚀', size: 92, startX: '78%', startY: '18%', glow: 'accent', duration: 32, delay: 2, moveX: [0, -150, 100, -60, 0], moveY: [0, 120, -140, 70, 0] },
  { id: 3, emoji: '👨‍🚀', size: 84, startX: '44%', startY: '72%', glow: 'secondary', duration: 26, delay: 4, moveX: [0, 130, -90, 50, 0], moveY: [0, -130, 80, -100, 0] },
  { id: 4, emoji: '🪐', size: 80, startX: '6%', startY: '55%', glow: 'secondary', duration: 22, delay: 1, moveX: [0, 170, 90, -120, 0], moveY: [0, -90, 150, 60, 0] },
  { id: 5, emoji: '🌌', size: 82, startX: '82%', startY: '52%', glow: 'primary', duration: 24, delay: 3, moveX: [0, -150, -80, 130, 0], moveY: [0, 120, -130, -60, 0] },
  { id: 6, emoji: '☄️', size: 80, startX: '30%', startY: '6%', glow: 'accent', duration: 20, delay: 5, moveX: [0, 110, -150, 60, 0], moveY: [0, 160, 80, -110, 0] },
  { id: 7, emoji: '🌙', size: 80, startX: '62%', startY: '78%', glow: 'secondary', duration: 30, delay: 2, moveX: [0, -120, 140, -80, 0], moveY: [0, -150, -60, 120, 0] },
  { id: 8, emoji: '🧬', size: 80, startX: '70%', startY: '8%', glow: 'primary', duration: 27, delay: 6, moveX: [0, -130, 90, -80, 0], moveY: [0, 150, 100, -110, 0] },
  { id: 9, emoji: '⚛️', size: 88, startX: '14%', startY: '36%', glow: 'accent', duration: 23, delay: 3, moveX: [0, 160, -90, 60, 0], moveY: [0, -80, 150, -130, 0] },
  { id: 10, emoji: '🔭', size: 80, startX: '50%', startY: '40%', glow: 'secondary', duration: 25, delay: 1, moveX: [0, -150, 110, -40, 0], moveY: [0, 130, -150, 80, 0] },
];
const glowClass = { primary: 'shadow-[0_0_24px_rgba(147,125,255,0.45)] border-primary/50', secondary: 'shadow-[0_0_24px_rgba(255,175,216,0.45)] border-secondary/50', accent: 'shadow-[0_0_24px_rgba(61,220,203,0.45)] border-accent/50' };
export default function FloatingElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {items.map((item) => (
        <motion.div key={item.id} initial={{ x: 0, y: 0 }} animate={{ x: item.moveX, y: item.moveY, rotate: [0, 10, -8, 5, 0] }} transition={{ duration: item.duration, repeat: Infinity, delay: item.delay, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 1] }} style={{ position: 'absolute', left: item.startX, top: item.startY, width: item.size, height: item.size }} className={`flex items-center justify-center bg-surface-elevated/40 backdrop-blur-md rounded-full border-4 ${glowClass[item.glow]}`}>
          <span style={{ fontSize: Math.round(item.size * 0.38) }}>{item.emoji}</span>
        </motion.div>
      ))}
    </div>
  );
}
