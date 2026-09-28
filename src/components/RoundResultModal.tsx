import React from 'react';
import { RoundResult } from '../game/types';

interface RoundResultModalProps {
  result: RoundResult;
  onNext: () => void;
  isLastRound: boolean;
}

const RoundResultModal: React.FC<RoundResultModalProps> = ({ result, onNext, isLastRound }) => {
  const winnerText = result.winner === 'w' ? 'White Wins!' : result.winner === 'b' ? 'Black Wins!' : 'Draw!';
  const winnerColor = result.winner === 'w' ? 'text-blue-400' : result.winner === 'b' ? 'text-red-400' : 'text-yellow-400';
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-600 shadow-2xl">
        <h2 className={`text-2xl font-bold text-center ${winnerColor} mb-4`}>
          {winnerText}
        </h2>
        <div className="text-center text-gray-300 mb-4">
          Round {result.round} • {result.moves} moves
        </div>
        
        <div className="flex justify-around mb-4">
          <div className="text-center">
            <div className="text-2xl mb-1">{result.whiteCommander.emoji}</div>
            <div className="text-xs text-blue-300 font-bold">{result.whiteCommander.name}</div>
            <div className="text-[10px] text-gray-500">ELO {result.whiteCommander.elo}</div>
          </div>
          <div className="text-gray-500 self-center text-xl">VS</div>
          <div className="text-center">
            <div className="text-2xl mb-1">{result.blackCommander.emoji}</div>
            <div className="text-xs text-red-300 font-bold">{result.blackCommander.name}</div>
            <div className="text-[10px] text-gray-500">ELO {result.blackCommander.elo}</div>
          </div>
        </div>

        {/* Mini eval graph */}
        {result.evalHistory.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-1 text-center">Eval Over Game</div>
            <div className="h-16 bg-gray-900 rounded border border-gray-700 relative overflow-hidden">
              {/* Center line */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-600" />
              <svg className="w-full h-full" viewBox={`0 0 ${result.evalHistory.length} 100`} preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  points={result.evalHistory.map((eval_, i) => {
                    const x = (i / Math.max(result.evalHistory.length - 1, 1)) * result.evalHistory.length;
                    const y = 50 - (eval_ / 2);
                    return `${x},${y}`;
                  }).join(' ')}
                />
              </svg>
            </div>
          </div>
        )}

        <button
          onClick={onNext}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white font-bold
            hover:from-purple-500 hover:to-blue-500 transition-all duration-200 shadow-lg"
        >
          {isLastRound ? 'See Match Result' : 'Next Round →'}
        </button>
      </div>
    </div>
  );
};

export default RoundResultModal;
