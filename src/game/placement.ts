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
  const board: (string | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Place all pieces on the board
  const allPlacements = [
    { placement: whitePawns, color: 'w' },
    { placement: whitePieces, color: 'w' },
    { placement: blackPawns, color: 'b' },
    { placement: blackPieces, color: 'b' },
  ];
  
  for (const { placement, color } of allPlacements) {
    for (const [square, piece] of Object.entries(placement)) {
      const file = square.charCodeAt(0) - 97;
      const rank = parseInt(square[1]) - 1;
      const fenChar = color === 'w' ? piece.toUpperCase() : piece.toLowerCase();
      board[7 - rank][file] = fenChar;
    }
  }
  
  // Build FEN
  const rows: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
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
  
  return rows.join('/') + ' w - - 0 1';
}
