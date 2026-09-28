import { Chess, Move } from 'chess.js';
import { Commander } from './types';
import { getStockfish, StockfishService } from './stockfish';

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

export function evaluatePosition(game: Chess): number {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? -99999 : 99999;
  }
  if (game.isDraw()) return 0;

  let score = 0;
  const board = game.board();

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
  const mobilityBonus = currentMoves * 2;
  score += game.turn() === 'w' ? mobilityBonus : -mobilityBonus;

  return score;
}

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

// Map ELO to Stockfish parameters
// Optimized for browser-based play with practical search depths
function eloToStockfishParams(elo: number): { depth: number; skillLevel: number } {
  // Stockfish skill level: 0-20 (20 = full strength)
  // Search depth: affects how far it looks ahead
  
  // 2600 ELO (Super GM): Depth 14
  if (elo >= 2600) return { depth: 14, skillLevel: 20 };
  
  // 2400 ELO (International/Senior Master): Depth 11
  if (elo >= 2400) return { depth: 11, skillLevel: 18 };
  
  // 2200 ELO (Master): Depth 8
  if (elo >= 2200) return { depth: 8, skillLevel: 14 };
  
  // 2000 ELO (Expert): Depth 6
  if (elo >= 2000) return { depth: 6, skillLevel: 10 };
  
  // 1800 ELO (Class A/Advanced): Depth 4
  if (elo >= 1800) return { depth: 4, skillLevel: 6 };
  
  // Below 1800: Reduced depth for weaker play
  return { depth: 3, skillLevel: 3 };
}

// Fallback custom engine
function getBestMoveFallback(game: Chess, commander: Commander): Move | null {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Check for blunder - make a random move
  if (Math.random() < commander.blunderRate) {
    const randomIndex = Math.floor(Math.random() * moves.length);
    return moves[randomIndex];
  }

  const isMaximizing = game.turn() === 'w';
  let bestMove: Move | null = null;
  let bestEval = isMaximizing ? -Infinity : Infinity;

  // Score moves with aggression bonus for captures
  const scoredMoves = moves.map(move => {
    let score = 0;
    if (move.captured) {
      score += PIECE_VALUES[move.captured] * commander.aggression;
    }
    if (move.san.includes('+')) score += 20 * commander.aggression;
    return { move, bonus: score };
  });

  // Sort by bonus for better move ordering
  scoredMoves.sort((a, b) => b.bonus - a.bonus);

  for (const { move, bonus } of scoredMoves) {
    game.move(move);
    let evalScore = minimax(game, commander.depth - 1, -Infinity, Infinity, !isMaximizing);
    game.undo();

    // Apply aggression bonus
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

// Stockfish-powered move selection
let stockfishInstance: StockfishService | null = null;
let stockfishInitAttempted = false;

async function initializeStockfish(): Promise<StockfishService | null> {
  if (stockfishInitAttempted) return stockfishInstance;
  
  stockfishInitAttempted = true;
  try {
    stockfishInstance = await getStockfish();
    console.log('✅ Stockfish initialized successfully');
  } catch (error) {
    console.warn('⚠️ Stockfish failed to initialize, using fallback engine');
    stockfishInstance = null;
  }
  return stockfishInstance;
}

export async function getBestMove(game: Chess, commander: Commander): Promise<Move | null> {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) {
    console.log('⚠️ No legal moves available');
    return null;
  }

  console.log(`🎯 ${commander.name} (${commander.elo} ELO) has ${moves.length} legal moves`);

  // Check for blunder - make a random move (applies to both engines)
  if (Math.random() < commander.blunderRate) {
    console.log(`💀 ${commander.name} blundered! (rate: ${(commander.blunderRate * 100).toFixed(0)}%)`);
    const randomIndex = Math.floor(Math.random() * moves.length);
    return moves[randomIndex];
  }

  // Use custom engine by default (more reliable)
  console.log(`🎲 ${commander.name} using custom engine (depth ${commander.depth})`);
  const fallbackMove = getBestMoveFallback(game, commander);
  if (fallbackMove) {
    console.log(`✅ ${commander.name} plays: ${fallbackMove.san}`);
  }
  return fallbackMove;
}

export function getEvalForPosition(fen: string): number {
  const game = new Chess(fen);
  const raw = evaluatePosition(game);
  // Normalize to -100 to 100 range
  return Math.max(-100, Math.min(100, raw / 30));
}

export function getStockfishEval(fen: string): number {
  // Use custom eval for reliability
  const customEval = getEvalForPosition(fen);
  console.log(`📊 Eval: ${customEval}`);
  return customEval;
}
