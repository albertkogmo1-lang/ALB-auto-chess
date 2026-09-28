import { PieceType, Color } from './types';

export function getDeploymentSquares(color: Color): string[] {
  const squares: string[] = [];
  const startRow = color === 'w' ? 1 : 5;
  const endRow = color === 'w' ? 4 : 8;
  for (let row = startRow; row <= endRow; row++) {
    for (let col = 0; col < 8; col++) {
      squares.push(String.fromCharCode(97 + col) + row);
    }
  }
  return squares;
}

export function getPawnDeploymentSquares(color: Color): string[] {
  const squares: string[] = [];
  // Pawns in rows 2-4 (white) or 5-7 (black)
  const startRow = color === 'w' ? 2 : 5;
  const endRow = color === 'w' ? 4 : 7;
  for (let row = startRow; row <= endRow; row++) {
    for (let col = 0; col < 8; col++) {
      squares.push(String.fromCharCode(97 + col) + row);
    }
  }
  return squares;
}

export function getPieceDeploymentSquares(color: Color): string[] {
  const squares: string[] = [];
  // Pieces (Queen, Rook, Bishop, Knight) can be placed in rows 1-4 (white) or 5-8 (black)
  const startRow = color === 'w' ? 1 : 5;
  const endRow = color === 'w' ? 4 : 8;
  for (let row = startRow; row <= endRow; row++) {
    for (let col = 0; col < 8; col++) {
      squares.push(String.fromCharCode(97 + col) + row);
    }
  }
  return squares;
}

export function getKingDeploymentSquares(color: Color): string[] {
  const squares: string[] = [];
  // King can only be placed in rows 1-2 (white) or 7-8 (black)
  const startRow = color === 'w' ? 1 : 7;
  const endRow = color === 'w' ? 2 : 8;
  for (let row = startRow; row <= endRow; row++) {
    for (let col = 0; col < 8; col++) {
      squares.push(String.fromCharCode(97 + col) + row);
    }
  }
  return squares;
}

export function getEmptySquares(
  deploymentZone: string[],
  occupiedSquares: Set<string>
): string[] {
  return deploymentZone.filter(sq => !occupiedSquares.has(sq));
}

export function autoPlaceRandom(
  pieces: PieceType[],
  availableSquares: string[]
): Record<string, string> {
  const placement: Record<string, string> = {};
  const shuffled = [...availableSquares].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < pieces.length && i < shuffled.length; i++) {
    placement[shuffled[i]] = pieces[i];
  }
  
  return placement;
}

export function getStandardPieceSet(): PieceType[] {
  return ['r', 'n', 'b', 'b', 'n', 'r', 'q', 'k'];
}

export function getPawnSet(): PieceType[] {
  return ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'];
}

export function buildFenFromPlacement(
  whitePawns: Record<string, string>,
  whitePieces: Record<string, string>,
  blackPawns: Record<string, string>,
  blackPieces: Record<string, string>
): string {
  console.log('Building FEN from placement...');
  console.log('Input - White pawns:', whitePawns);
  console.log('Input - White pieces:', whitePieces);
  console.log('Input - Black pawns:', blackPawns);
  console.log('Input - Black pieces:', blackPieces);
  
  const board: (string | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Place all pieces on the board
  const allPlacements = [
    { placement: whitePawns, color: 'w' },
    { placement: whitePieces, color: 'w' },
    { placement: blackPawns, color: 'b' },
    { placement: blackPieces, color: 'b' },
  ];
  
  let totalPieces = 0;
  for (const { placement, color } of allPlacements) {
    for (const [square, piece] of Object.entries(placement)) {
      const file = square.charCodeAt(0) - 97;
      const rank = parseInt(square[1]) - 1;
      const fenChar = color === 'w' ? piece.toUpperCase() : piece.toLowerCase();
      board[7 - rank][file] = fenChar;
      totalPieces++;
    }
  }
  
  console.log('Total pieces placed on board:', totalPieces);
  console.log('Board state:', board);
  
  // Build FEN - FEN starts with rank 8 (top of board) and goes to rank 1 (bottom)
  const rows: string[] = [];
  for (let rank = 0; rank < 8; rank++) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      if (board[rank][file]) {
        if (empty > 0) {
          row += empty;
          empty = 0;
        }
        row += board[rank][file];
      } else {
        empty++;
      }
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }
  
  const fen = rows.join('/') + ' w - - 0 1';
  console.log('Generated FEN string:', fen);
  
  // Log pawn positions specifically
  const whitePawnSquares = Object.keys(whitePawns);
  const blackPawnSquares = Object.keys(blackPawns);
  console.log('White pawn squares:', whitePawnSquares);
  console.log('Black pawn squares:', blackPawnSquares);
  
  // Check if pawns are on correct ranks
  whitePawnSquares.forEach(sq => {
    const rank = parseInt(sq[1]);
    console.log(`White pawn on ${sq} (rank ${rank}) - should move towards rank 8`);
  });
  blackPawnSquares.forEach(sq => {
    const rank = parseInt(sq[1]);
    console.log(`Black pawn on ${sq} (rank ${rank}) - should move towards rank 1`);
  });
  
  // Validate FEN structure
  const parts = fen.split(' ');
  if (parts.length !== 6) {
    console.error('❌ Invalid FEN structure:', fen, 'parts:', parts.length);
    return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1';
  }
  
  // Check if each rank sums to 8
  const ranks = parts[0].split('/');
  console.log('FEN ranks:', ranks);
  for (let i = 0; i < ranks.length; i++) {
    const rank = ranks[i];
    let sum = 0;
    for (const char of rank) {
      if (/[1-8]/.test(char)) {
        sum += parseInt(char);
      } else if (/[prnbqkPRNBQK]/.test(char)) {
        sum += 1;
      }
    }
    console.log(`Rank ${8-i}: "${rank}" sum=${sum}`);
    if (sum !== 8) {
      console.error(`❌ Invalid rank ${8-i} in FEN:`, rank, 'sum:', sum);
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1';
    }
  }
  
  console.log('✅ FEN validation passed');
  return fen;
}
