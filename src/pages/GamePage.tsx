import { Link, useParams } from 'react-router-dom';
import { findGame } from '../catalog';
import { NotFoundPage } from './NotFound';
import { LandscapeHint } from '../mobile/LandscapeHint';

export function GamePage() {
  const { slug } = useParams();
  const game = findGame(slug);
  if (!game) return <NotFoundPage />;
  const Game = game.component;
  return (
    <div className="game-wrap">
      <LandscapeHint />
      {game.saves ? <p className="game-save-note">{game.saves}</p> : null}
      <Game />
      <p className="game-back-foot">
        <Link to="/">返回游戏厅</Link>
      </p>
    </div>
  );
}
