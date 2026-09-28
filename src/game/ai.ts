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

  // Material and positional evaluation
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

  // Mobility bonus - more moves = better position
  const currentMoves = game.moves().length;
  const mobilityBonus = currentMoves * 3;
  score += game.turn() === 'w' ? mobilityBonus : -mobilityBonus;

  // King safety - penalize exposed kings
  const whiteKingPos = findKing(board, 'w');
  const blackKingPos = findKing(board, 'b');
  
  if (whiteKingPos) {
    const kingSafety = evaluateKingSafety(board, whiteKingPos, 'w');
    score += kingSafety;
  }
  
  if (blackKingPos) {
    const kingSafety = evaluateKingSafety(board, blackKingPos, 'b');
    score -= kingSafety;
  }

  // Pawn structure - penalize isolated and doubled pawns
  const pawnStructure = evaluatePawnStructure(board);
  score += pawnStructure;

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
  
  // Count pawns near the king (pawn shield)
  const pawnShieldBonus = 15;
  for (let dr = -1; dr <= 1; dr++) {
    for (let df = -1; df <= 1; df++) {
      if (dr === 0 && df === 0) continue;
      const r = rank + (color === 'w' ? dr : -dr);
      const f = file + df;
      if (r >= 0 && r < 8 && f >= 0 && f < 8) {
        const piece = board[r][f];
        if (piece && piece.type === 'p' && piece.color === color) {
          safety += pawnShieldBonus;
        }
      }
    }
  }
  
  // Penalize king in center (should be castled)
  const centerDistance = Math.abs(file - 3.5) + Math.abs(rank - (color === 'w' ? 0 : 7));
  if (centerDistance < 3) {
    safety -= 20;
  }
  
  return safety;
}

function evaluatePawnStructure(board: any[][]): number {
  let score = 0;
  
  // Count pawns by file for each color
  const whitePawnsByFile = new Array(8).fill(0);
  const blackPawnsByFile = new Array(8).fill(0);
  
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type === 'p') {
        if (piece.color === 'w') {
          whitePawnsByFile[file]++;
        } else {
          blackPawnsByFile[file]++;
        }
      }
    }
  }
  
  // Penalize doubled pawns
  const doubledPawnPenalty = 20;
  for (let file = 0; file < 8; file++) {
    if (whitePawnsByFile[file] > 1) {
      score -= (whitePawnsByFile[file] - 1) * doubledPawnPenalty;
    }
    if (blackPawnsByFile[file] > 1) {
      score += (blackPawnsByFile[file] - 1) * doubledPawnPenalty;
    }
  }
  
  // Penalize isolated pawns (no pawns on adjacent files)
  const isolatedPawnPenalty = 15;
  for (let file = 0; file < 8; file++) {
    const hasAdjacentWhite = (file > 0 && whitePawnsByFile[file - 1] > 0) || 
                             (file < 7 && whitePawnsByFile[file + 1] > 0);
    const hasAdjacentBlack = (file > 0 && blackPawnsByFile[file - 1] > 0) || 
                             (file < 7 && blackPawnsByFile[file + 1] > 0);
    
    if (whitePawnsByFile[file] > 0 && !hasAdjacentWhite) {
      score -= whitePawnsByFile[file] * isolatedPawnPenalty;
    }
    if (blackPawnsByFile[file] > 0 && !hasAdjacentBlack) {
      score += blackPawnsByFile[file] * isolatedPawnPenalty;
    }
  }
  
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

// Map ELO to search parameters
// Balanced for browser performance while maintaining realistic ELO strength
function eloToStockfishParams(elo: number): { depth: number; skillLevel: number } {
  // Search depth: affects how far it looks ahead
  // With alpha-beta pruning and move ordering, these depths are feasible
  
  // 2600 ELO (Super GM): Depth 6 - Strong tactical vision
  if (elo >= 2600) return { depth: 6, skillLevel: 20 };
  
  // 2400 ELO (International Master): Depth 5 - Very strong calculation
  if (elo >= 2400) return { depth: 5, skillLevel: 18 };
  
  // 2200 ELO (Master): Depth 4 - Strong positional play
  if (elo >= 2200) return { depth: 4, skillLevel: 14 };
  
  // 2000 ELO (Expert): Depth 3 - Good tactical awareness
  if (elo >= 2000) return { depth: 3, skillLevel: 10 };
  
  // 1800 ELO (Class A): Depth 2 - Solid but limited calculation
  if (elo >= 1800) return { depth: 2, skillLevel: 6 };
  
  // Below 1800: Very shallow search
  return { depth: 1, skillLevel: 3 };
}

// Fallback custom engine
function getBestMoveFallback(game: Chess, commander: Commander): Move | null {
  console.log(`\n🎲 [FALLBACK] === getBestMoveFallback START ===`);
  console.log(`🎲 [FALLBACK] Commander: ${commander.name}, Depth: ${commander.depth}`);
  
  const startTime = performance.now();
  
  try {
    const moves = game.moves({ verbose: true });
    console.log(`🎲 [FALLBACK] Found ${moves.length} legal moves`);
    
    if (moves.length === 0) {
      console.log('⚠️ [FALLBACK] No legal moves available');
      return null;
    }

    // Check for blunder - make a random move
    if (Math.random() < commander.blunderRate) {
      console.log(`💀 [FALLBACK] Blunder! Making random move`);
      const randomIndex = Math.floor(Math.random() * moves.length);
      return moves[randomIndex];
    }

    const isMaximizing = game.turn() === 'w';
    let bestMove: Move | null = null;
    let bestEval = isMaximizing ? -Infinity : Infinity;

    console.log(`🎲 [FALLBACK] Starting minimax search with depth ${commander.depth - 1}`);
    console.log(`🎲 [FALLBACK] Evaluating ${moves.length} moves...`);

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

    let moveCount = 0;
    for (const { move, bonus } of scoredMoves) {
      moveCount++;
      console.log(`🎲 [FALLBACK] Evaluating move ${moveCount}/${moves.length}: ${move.san}`);
      
      game.move(move);
      const evalStartTime = performance.now();
      let evalScore = minimax(game, commander.depth - 1, -Infinity, Infinity, !isMaximizing);
      const evalTime = performance.now() - evalStartTime;
      game.undo();
      
      console.log(`🎲 [FALLBACK] Move ${move.san} eval: ${evalScore}, time: ${evalTime.toFixed(2)}ms`);

      // Apply aggression bonus
      evalScore += isMaximizing ? bonus : -bonus;

      if (isMaximizing) {
        if (evalScore > bestEval) {
          bestEval = evalScore;
          bestMove = move;
          console.log(`🎲 [FALLBACK] New best move: ${move.san} with eval ${bestEval}`);
        }
      } else {
        if (evalScore < bestEval) {
          bestEval = evalScore;
          bestMove = move;
          console.log(`🎲 [FALLBACK] New best move: ${move.san} with eval ${bestEval}`);
        }
      }
    }

    const totalTime = performance.now() - startTime;
    console.log(`🎲 [FALLBACK] Search complete in ${totalTime.toFixed(2)}ms`);
    console.log(`🎲 [FALLBACK] Best move: ${bestMove?.san || moves[0].san}, eval: ${bestEval}`);
    console.log(`🎲 [FALLBACK] === getBestMoveFallback END ===\n`);

    return bestMove || moves[0];
  } catch (error) {
    console.error('❌ [FALLBACK] ERROR in getBestMoveFallback:', error);
    console.error('❌ [FALLBACK] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return null;
  }
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

export function getBestMove(game: Chess, commander: Commander): Move | null {
  console.log(`\n🤖 [AI] === getBestMove START ===`);
  console.log(`🤖 [AI] Commander: ${commander.name}, ELO: ${commander.elo}, Depth: ${commander.depth}`);
  
  try {
    console.log('🤖 [AI] Getting legal moves...');
    const moves = game.moves({ verbose: true });
    console.log(`🤖 [AI] Found ${moves.length} legal moves`);
    
    if (moves.length === 0) {
      console.log('⚠️ [AI] No legal moves available');
      return null;
    }

    console.log(`🎯 [AI] ${commander.name} (${commander.elo} ELO) has ${moves.length} legal moves`);

    // Check for blunder - make a random move (applies to both engines)
    const blunderRoll = Math.random();
    console.log(`🎲 [AI] Blunder check: rolled ${blunderRoll.toFixed(3)} vs ${commander.blunderRate}`);
    if (blunderRoll < commander.blunderRate) {
      console.log(`💀 [AI] ${commander.name} blundered! (rate: ${(commander.blunderRate * 100).toFixed(0)}%)`);
      const randomIndex = Math.floor(Math.random() * moves.length);
      console.log(`💀 [AI] Random move selected: ${moves[randomIndex].san}`);
      return moves[randomIndex];
    }

    // Use custom engine by default (more reliable)
    console.log(`🎲 [AI] ${commander.name} using custom engine (depth ${commander.depth})`);
    console.log('🎲 [AI] Calling getBestMoveFallback...');
    const fallbackMove = getBestMoveFallback(game, commander);
    console.log('🎲 [AI] getBestMoveFallback returned:', fallbackMove ? fallbackMove.san : 'null');
    
    if (fallbackMove) {
      console.log(`✅ [AI] ${commander.name} plays: ${fallbackMove.san}`);
    }
    
    console.log(`🤖 [AI] === getBestMove END ===\n`);
    return fallbackMove;
  } catch (error) {
    console.error('❌ [AI] ERROR in getBestMove:', error);
    console.error('❌ [AI] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return null;
  }
}

export function getEvalForPosition(fen: string): number {
  const game = new Chess(fen);
  const raw = evaluatePosition(game);
  
  // Normalize to -100 to 100 range
  // A pawn advantage (100 centipawns) should be around +25
  // A knight advantage (320 centipawns) should be around +60
  // A rook advantage (500 centipawns) should be around +80
  // A queen advantage (900 centipawns) should be around +95
  const normalized = raw / 4;
  
  // Clamp to -100 to 100 range
  return Math.max(-100, Math.min(100, normalized));
}

export function getStockfishEval(fen: string): number {
  // Use custom eval for reliability
  const customEval = getEvalForPosition(fen);
  console.log(`📊 Eval: ${customEval}`);
  return customEval;
}
