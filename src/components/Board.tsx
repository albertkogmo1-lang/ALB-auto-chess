import React from 'react';
import { Color, PieceType } from '../game/types';

interface BoardProps {
  board: (string | null)[][];
  onSquareClick?: (square: string) => void;
  highlightZone?: Color | 'both' | 'pawn' | 'piece';
  occupiedSquares?: Set<string>;
  placementMode?: boolean;
  lastMove?: { from: string; to: string } | null;
}

const PIECE_UNICODE: Record<string, string> = {
  'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
  'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟',
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
};

const Board: React.FC<BoardProps> = ({ board, onSquareClick, highlightZone, occupiedSquares, placementMode, lastMove }) => {
  const getSquareColor = (rank: number, file: number): string => {
    const isLight = (rank + file) % 2 === 0;
    return isLight ? 'bg-amber-100' : 'bg-amber-700';
  };

  const getZoneHighlight = (rank: number): string => {
    if (!highlightZone) return '';
    const actualRank = 8 - rank;
    if (highlightZone === 'w' && actualRank >= 1 && actualRank <= 4) return 'ring-2 ring-inset ring-blue-400/30';
    if (highlightZone === 'b' && actualRank >= 5 && actualRank <= 8) return 'ring-2 ring-inset ring-red-400/30';
    if (highlightZone === 'pawn' && actualRank >= 2 && actualRank <= 4) return 'ring-2 ring-inset ring-blue-400/50';
    if (highlightZone === 'piece' && actualRank >= 1 && actualRank <= 4) return 'ring-2 ring-inset ring-green-400/50';
    if (highlightZone === 'both') {
      if (actualRank >= 1 && actualRank <= 4) return 'ring-2 ring-inset ring-blue-400/40';
      if (actualRank >= 5 && actualRank <= 8) return 'ring-2 ring-inset ring-red-400/40';
    }
    return '';
  };

  const getSquareName = (rank: number, file: number): string => {
    return String.fromCharCode(97 + file) + (8 - rank);
  };

  return (
    <div className="inline-block border-2 border-amber-900 rounded shadow-2xl">
      <div className="grid grid-cols-8" style={{ width: '400px', height: '400px' }}>
        {Array.from({ length: 8 }, (_, rank) =>
          Array.from({ length: 8 }, (_, file) => {
            const square = getSquareName(rank, file);
            const piece = board[rank][file];
            const isOccupied = occupiedSquares?.has(square);
            const isLastMoveFrom = lastMove?.from === square;
            const isLastMoveTo = lastMove?.to === square;
            
            let highlightClass = '';
            if (isLastMoveFrom) highlightClass = 'bg-yellow-300/60';
            if (isLastMoveTo) highlightClass = 'bg-yellow-400/70';
            
            const canPlace = placementMode && highlightZone && !isOccupied;
            const actualRank = 8 - rank;
            const inZone = highlightZone === 'w' 
              ? (actualRank >= 1 && actualRank <= 4)
              : highlightZone === 'b'
              ? (actualRank >= 5 && actualRank <= 8)
              : highlightZone === 'pawn'
              ? (actualRank >= 2 && actualRank <= 4)
              : highlightZone === 'piece'
              ? (actualRank >= 1 && actualRank <= 4)
              : highlightZone === 'both'
              ? ((actualRank >= 1 && actualRank <= 4) || (actualRank >= 5 && actualRank <= 8))
              : false;

            return (
              <div
                key={square}
                className={`
                  relative flex items-center justify-center cursor-pointer
                  ${getSquareColor(rank, file)}
                  ${getZoneHighlight(rank)}
                  ${highlightClass}
                  ${canPlace && inZone ? 'hover:bg-green-300/50 hover:ring-2 hover:ring-green-500' : ''}
                  transition-colors duration-100
                `}
                onClick={() => onSquareClick?.(square)}
              >
                {piece && (
                  <span 
                    className={`text-3xl select-none drop-shadow-md ${
                      piece === piece.toUpperCase() ? 'text-white' : 'text-gray-900'
                    }`}
                    style={{ fontSize: '2rem', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                  >
                    {PIECE_UNICODE[piece] || ''}
                  </span>
                )}
                {placementMode && inZone && !isOccupied && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-30">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  </div>
                )}
                {rank === 7 && (
                  <span className="absolute bottom-0 left-0.5 text-[8px] text-amber-900/50 font-bold">
                    {String.fromCharCode(97 + file)}
                  </span>
                )}
                {file === 0 && (
                  <span className="absolute top-0 left-0.5 text-[8px] text-amber-900/50 font-bold">
                    {8 - rank}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Board;
