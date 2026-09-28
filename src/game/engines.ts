import { Chess, Move } from 'chess.js';
import { Commander } from './types';

// ============================================================================
// ENGINE 1: EVALUATION ENGINE (for eval bar)
// Simple, fast, material-based evaluation for human-readable display
// ============================================================================

const PIECE_VALUES_SIMPLE: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

export function getEvalForPosition(fen: string): number {
  const game = new Chess(fen);
  
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? -100 : 100;
  }
  if (game.isDraw()) return 0;
  
  // Simple material count only
  const board = game.board();
  let materialScore = 0;
  
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece) {
        const value = PIECE_VALUES_SIMPLE[piece.type];
        materialScore += piece.color === 'w' ? value : -value;
      }
    }
  }
  
  // Normalize to -100 to 100 scale
  const normalized = materialScore / 4;
  return Math.max(-100, Math.min(100, normalized));
}

// ============================================================================
// ENGINE 2 & 3: MOVE-MAKING ENGINES (for bots)
// Enhanced evaluation with positional understanding
// ============================================================================

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables for positional evaluation
const PAWN_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];

const KNIGHT_TABLE = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];

const BISHOP_TABLE = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];

const ROOK_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];

const QUEEN_TABLE = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];

const KING_TABLE = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];

function getPieceSquareValue(piece: string, square: string, isWhite: boolean): number {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1]) - 1;
  const index = isWhite ? (7 - rank) * 8 + file : rank * 8 + file;

  switch (piece) {
    case 'p': return PAWN_TABLE[index];
    case 'n': return KNIGHT_TABLE[index];
    case 'b': return BISHOP_TABLE[index];
    case 'r': return ROOK_TABLE[index];
    case 'q': return QUEEN_TABLE[index];
    case 'k': return KING_TABLE[index];
    default: return 0;
  }
}

// Enhanced evaluation for move-making
function evaluatePosition(game: Chess): number {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? -99999 : 99999;
  }
  if (game.isDraw()) return 0;

  let score = 0;
  const board = game.board();

  // Material + Positional evaluation
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece) {
        const square = String.fromCharCode(97 + file) + (8 - rank);
        const isWhite = piece.color === 'w';
        const value = PIECE_VALUES[piece.type] + getPieceSquareValue(piece.type, square, isWhite);
        score += isWhite ? value : -value;
      }
    }
  }

  // Mobility bonus
  const currentMoves = game.moves().length;
  const mobilityBonus = currentMoves * 3;
  score += game.turn() === 'w' ? mobilityBonus : -mobilityBonus;

  // King safety
  const whiteKingPos = findKing(board, 'w');
  const blackKingPos = findKing(board, 'b');
  
  if (whiteKingPos) {
    score += evaluateKingSafety(board, whiteKingPos, 'w');
  }
  if (blackKingPos) {
    score -= evaluateKingSafety(board, blackKingPos, 'b');
  }

  return score;
}

function findKing(board: any[][], color: 'w' | 'b'): { rank: number; file: number } | null {
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type === 'k' && piece.color === color) {
        return { rank, file };
      }
    }
  }
  return null;
}

function evaluateKingSafety(board: any[][], kingPos: { rank: number; file: number }, color: 'w' | 'b'): number {
  let safety = 0;
  const { rank, file } = kingPos;
  
  // Pawn shield bonus
  for (let dr = -1; dr <= 1; dr++) {
    for (let df = -1; df <= 1; df++) {
      if (dr === 0 && df === 0) continue;
      const r = rank + (color === 'w' ? dr : -dr);
      const f = file + df;
      if (r >= 0 && r < 8 && f >= 0 && f < 8) {
        const piece = board[r][f];
        if (piece && piece.type === 'p' && piece.color === color) {
          safety += 15;
        }
      }
    }
  }
  
  return safety;
}

// Minimax with alpha-beta pruning
function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluatePosition(game);
  }

  const moves = game.moves();

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const evalScore = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evalScore = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// Map ELO to search parameters
function eloToSearchDepth(elo: number): number {
  if (elo >= 2600) return 5;
  if (elo >= 2400) return 4;
  if (elo >= 2200) return 4;
  if (elo >= 2000) return 3;
  if (elo >= 1800) return 3;
  return 2;
}

// Get best move for a specific commander (Engine 2 or 3)
export function getBestMove(game: Chess, commander: Commander): Move | null {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Check for blunder
  if (Math.random() < commander.blunderRate) {
    const randomIndex = Math.floor(Math.random() * moves.length);
    return moves[randomIndex];
  }

  const depth = eloToSearchDepth(commander.elo);
  const isMaximizing = game.turn() === 'w';
  let bestMove: Move | null = null;
  let bestEval = isMaximizing ? -Infinity : Infinity;

  // Score and order moves
  const scoredMoves = moves.map(move => {
    let score = 0;
    if (move.captured) {
      score += PIECE_VALUES[move.captured] * commander.aggression;
    }
    if (move.san.includes('+')) score += 20 * commander.aggression;
    return { move, bonus: score };
  });

  scoredMoves.sort((a, b) => b.bonus - a.bonus);

  for (const { move, bonus } of scoredMoves) {
    game.move(move);
    let evalScore = minimax(game, depth - 1, -Infinity, Infinity, !isMaximizing);
    game.undo();

    evalScore += isMaximizing ? bonus : -bonus;

    if (isMaximizing) {
      if (evalScore > bestEval) {
        bestEval = evalScore;
        bestMove = move;
      }
    } else {
      if (evalScore < bestEval) {
        bestEval = evalScore;
        bestMove = move;
      }
    }
  }

  return bestMove || moves[0];
}
