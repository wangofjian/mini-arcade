import { Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/Home';
import { GamePage } from './pages/GamePage';
import { NotFoundPage } from './pages/NotFound';
import { Shell } from './pages/Shell';

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/games/:slug" element={<GamePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
