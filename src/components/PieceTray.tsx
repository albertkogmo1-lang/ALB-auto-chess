import React from 'react';
import { PieceType, Color } from '../game/types';

interface PieceTrayProps {
  pieces: { type: PieceType; count: number }[];
  selectedPiece: PieceType | null;
  onSelect: (piece: PieceType) => void;
  color: Color;
}

const PIECE_UNICODE: Record<string, Record<string, string>> = {
  w: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
  b: { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' },
};

const PieceTray: React.FC<PieceTrayProps> = ({ pieces, selectedPiece, onSelect, color }) => {
  return (
    <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-600">
      <div className="text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
        Place Pieces
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {pieces.map(({ type, count }) => {
          if (count <= 0) return null;
          const isSelected = selectedPiece === type;
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={`
                relative flex flex-col items-center justify-center w-12 h-14 rounded-lg border-2
                transition-all duration-150
                ${isSelected 
                  ? 'border-yellow-400 bg-yellow-900/40 scale-110 shadow-lg shadow-yellow-400/20' 
                  : 'border-gray-500 bg-gray-700/50 hover:border-gray-300 hover:bg-gray-600/50'}
              `}
            >
              <span className="text-2xl">{PIECE_UNICODE[color][type]}</span>
              <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {count}
              </span>
            </button>
          );
        })}
      </div>
      {selectedPiece && (
        <div className="text-center text-xs text-yellow-300 mt-2 animate-pulse">
          Click a square to place your piece
        </div>
      )}
    </div>
  );
};

export default PieceTray;
