export type GamePhase =
  | 'menu'
  | 'pawn-placement'
  | 'pawn-reveal'
  | 'piece-placement'
  | 'piece-reveal'
  | 'auto-play'
  | 'round-result'
  | 'match-result';

export type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
export type Color = 'w' | 'b';

export interface RoundResult {
  round: number;
  winner: Color | 'draw';
  moves: number;
  evalHistory: number[];
}

export interface GameState {
  phase: GamePhase;
  currentRound: number;
  whiteScore: number;
  blackScore: number;
  roundResults: RoundResult[];
  evalBar: number; // -100 to 100, negative = black advantage
  evalHistory: number[];
  phaseTimer: number;
  whitePawns: Record<string, string>; // square -> piece type
  blackPawns: Record<string, string>;
  whitePieces: Record<string, string>;
  blackPieces: Record<string, string>;
  moveLog: string[];
}
