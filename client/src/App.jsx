import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RoomLobby from './features/RoomLobby';
import UploadArena from './features/UploadArena';
import QuizArena from './features/QuizArena';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:code" element={<RoomLobby />} />
      <Route path="/room/:code/upload" element={<UploadArena />} />
      <Route path="/room/:code/play" element={<QuizArena />} />
    </Routes>
  );
}
