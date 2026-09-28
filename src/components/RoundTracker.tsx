import React from 'react';
import { RoundResult } from '../game/types';

interface RoundTrackerProps {
  currentRound: number;
  totalRounds: number;
  whiteScore: number;
  blackScore: number;
  roundResults: RoundResult[];
}

const RoundTracker: React.FC<RoundTrackerProps> = ({
  currentRound,
  totalRounds,
  whiteScore,
  blackScore,
  roundResults,
}) => {
  return (
    <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-600">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-blue-300">⬜ {whiteScore}</span>
        <span className="text-sm font-bold text-gray-200">Round {currentRound}/{totalRounds}</span>
        <span className="text-xs font-bold text-red-300">{blackScore} ⬛</span>
      </div>
      <div className="flex gap-1 justify-center">
        {Array.from({ length: totalRounds }, (_, i) => {
          const round = i + 1;
          const result = roundResults.find(r => r.round === round);
          const isCurrent = round === currentRound;
          
          let bgClass = 'bg-gray-700';
          let icon = '';
          
          if (result) {
            if (result.winner === 'w') {
              bgClass = 'bg-blue-500';
              icon = '⬜';
            } else if (result.winner === 'b') {
              bgClass = 'bg-red-500';
              icon = '⬛';
            } else {
              bgClass = 'bg-yellow-600';
              icon = '½';
            }
          } else if (isCurrent) {
            bgClass = 'bg-gray-500 animate-pulse';
            icon = '▶';
          }
          
          return (
            <div
              key={i}
              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${bgClass} ${
                isCurrent && !result ? 'ring-2 ring-white/50' : ''
              }`}
            >
              {icon || round}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoundTracker;
