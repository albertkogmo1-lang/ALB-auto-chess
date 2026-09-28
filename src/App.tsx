import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import Board from './components/Board';
import EvalBar from './components/EvalBar';
import CommanderPanel from './components/CommanderPanel';
import PhaseTimer from './components/PhaseTimer';
import RoundTracker from './components/RoundTracker';
import PieceTray from './components/PieceTray';
import RoundResultModal from './components/RoundResultModal';
import { GameState, GamePhase, Commander, PieceType, Color, RoundResult, INITIAL_COMMANDERS } from './game/types';
import { getDeploymentSquares, getPawnDeploymentSquares, getPieceDeploymentSquares, autoPlaceRandom, getStandardPieceSet, getPawnSet, buildFenFromPlacement } from './game/placement';
import { getBestMove, getEvalForPosition, getStockfishEval } from './game/ai';

const PAWN_TIME = 30;
const PIECE_TIME = 50;
const DRAFT_TIME = 12;
const MOVE_INTERVAL = 1000; // ms between AI moves (optimized for depth 4-11 searches)
const MAX_MOVES = 100;

function getInitialBoard(): (string | null)[][] {
  return Array(8).fill(null).map(() => Array(8).fill(null));
}

function boardFromPlacement(
  whitePawns: Record<string, string>,
  whitePieces: Record<string, string>,
  blackPawns: Record<string, string>,
  blackPieces: Record<string, string>
): (string | null)[][] {
  const board = getInitialBoard();
  
  const placePiece = (square: string, piece: string, color: Color) => {
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - parseInt(square[1]);
    const fenPiece = color === 'w' ? piece.toUpperCase() : piece.toLowerCase();
    if (rank >= 0 && rank < 8 && file >= 0 && file < 8) {
      board[rank][file] = fenPiece;
    }
  };

  Object.entries(whitePawns).forEach(([sq, p]) => placePiece(sq, p, 'w'));
  Object.entries(whitePieces).forEach(([sq, p]) => placePiece(sq, p, 'w'));
  Object.entries(blackPawns).forEach(([sq, p]) => placePiece(sq, p, 'b'));
  Object.entries(blackPieces).forEach(([sq, p]) => placePiece(sq, p, 'b'));

  return board;
}

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [currentRound, setCurrentRound] = useState(1);
  const [whiteScore, setWhiteScore] = useState(0);
  const [blackScore, setBlackScore] = useState(0);
  const [gameMode, setGameMode] = useState<'player' | 'bot-vs-bot'>('player');
  const [whiteCommanders, setWhiteCommanders] = useState<Commander[]>(
    INITIAL_COMMANDERS.map(c => ({ ...c }))
  );
  const [blackCommanders, setBlackCommanders] = useState<Commander[]>(
    INITIAL_COMMANDERS.map(c => ({ ...c }))
  );
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [evalBar, setEvalBar] = useState(0);
  const [evalHistory, setEvalHistory] = useState<number[]>([]);
  const [phaseTimer, setPhaseTimer] = useState(0);
  const [maxTimer, setMaxTimer] = useState(0);

  // Placement state
  const [whitePawns, setWhitePawns] = useState<Record<string, string>>({});
  const [blackPawns, setBlackPawns] = useState<Record<string, string>>({});
  const [whitePieces, setWhitePieces] = useState<Record<string, string>>({});
  const [blackPieces, setBlackPieces] = useState<Record<string, string>>({});
  const [selectedPiece, setSelectedPiece] = useState<PieceType | null>(null);

  // Commander draft
  const [selectedCommanderWhite, setSelectedCommanderWhite] = useState<Commander | null>(null);
  const [selectedCommanderBlack, setSelectedCommanderBlack] = useState<Commander | null>(null);

  // Auto-play state
  const [game, setGame] = useState<Chess | null>(null);
  const [board, setBoard] = useState<(string | null)[][]>(getInitialBoard());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [moveLog, setMoveLog] = useState<string[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Round result
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [currentRoundResult, setCurrentRoundResult] = useState<RoundResult | null>(null);

  // Bot piece placement function (must be before handlePhaseTimeout)
  const startBotPiecePlacement = useCallback(() => {
    console.log('=== START BOT PIECE PLACEMENT ===');
    console.log('Current white pawns:', whitePawns);
    console.log('Current black pawns:', blackPawns);
    
    // Auto-place all white pieces in rows 1-4 (pieces zone, excluding pawn squares)
    const whitePieceTypes = getStandardPieceSet();
    const whitePieceZone = getPieceDeploymentSquares('w');
    const whiteOccupied = new Set(Object.keys(whitePawns));
    const whiteEmpty = whitePieceZone.filter(sq => !whiteOccupied.has(sq));
    console.log('White piece zone (rows 1-4):', whitePieceZone.length, 'squares');
    console.log('White occupied by pawns:', whiteOccupied.size);
    console.log('White empty for pieces:', whiteEmpty.length);
    const autoWhitePieces = autoPlaceRandom(whitePieceTypes, whiteEmpty);
    console.log('Auto white pieces:', autoWhitePieces);
    setWhitePieces(autoWhitePieces);
    
    // Auto-place all black pieces in rows 5-8 (pieces zone, excluding pawn squares)
    const blackPieceTypes = getStandardPieceSet();
    const blackPieceZone = getPieceDeploymentSquares('b');
    const blackOccupied = new Set(Object.keys(blackPawns));
    const blackEmpty = blackPieceZone.filter(sq => !blackOccupied.has(sq));
    console.log('Black piece zone (rows 5-8):', blackPieceZone.length, 'squares');
    console.log('Black occupied by pawns:', blackOccupied.size);
    console.log('Black empty for pieces:', blackEmpty.length);
    const autoBlackPieces = autoPlaceRandom(blackPieceTypes, blackEmpty);
    console.log('Auto black pieces:', autoBlackPieces);
    setBlackPieces(autoBlackPieces);
    
    // Show piece reveal
    setPhase('piece-reveal');
    setPhaseTimer(3);
    setMaxTimer(3);
  }, [whitePawns, blackPawns]);

  // Timer effect
  const handlePhaseTimeout = useCallback(() => {
    switch (phase) {
      case 'pawn-placement':
        // Auto-place remaining pawns in restricted zones (rows 2-4 for white, 5-7 for black)
        const whitePawnTypes = getPawnSet();
        const blackPawnTypes = getPawnSet();
        const whitePawnZone = getPawnDeploymentSquares('w');
        const blackPawnZone = getPawnDeploymentSquares('b');
        
        const whiteOccupied = new Set(Object.keys(whitePawns));
        const blackOccupied = new Set(Object.keys(blackPawns));
        
        const remainingWhitePawns = whitePawnTypes.filter((_, i) => i >= Object.keys(whitePawns).length);
        const remainingBlackPawns = blackPawnTypes.filter((_, i) => i >= Object.keys(blackPawns).length);
        
        const whiteEmpty = whitePawnZone.filter(sq => !whiteOccupied.has(sq));
        const blackEmpty = blackPawnZone.filter(sq => !blackOccupied.has(sq));
        
        const autoWhitePawns = autoPlaceRandom(remainingWhitePawns, whiteEmpty);
        const autoBlackPawns = autoPlaceRandom(remainingBlackPawns, blackEmpty);
        
        setWhitePawns(prev => ({ ...prev, ...autoWhitePawns }));
        setBlackPawns(prev => ({ ...prev, ...autoBlackPawns }));
        
        // REVEAL PAWNS - Show both sides' pawn formations
        setPhase('pawn-reveal');
        setPhaseTimer(3);
        setMaxTimer(3);
        break;

      case 'pawn-reveal':
        // After pawn reveal, move to piece placement
        if (gameMode === 'bot-vs-bot') {
          // In bot-vs-bot mode, auto-place pieces immediately
          startBotPiecePlacement();
        } else {
          setPhase('piece-placement');
          setPhaseTimer(PIECE_TIME);
          setMaxTimer(PIECE_TIME);
          setSelectedPiece(null);
        }
        break;

      case 'piece-placement': {
        // Auto-place remaining pieces in rows 1-4 (white) and 5-8 (black)
        const wpTypes = getStandardPieceSet();
        const bpTypes = getStandardPieceSet();
        const wPieceZone = getPieceDeploymentSquares('w');
        const bPieceZone = getPieceDeploymentSquares('b');
        
        const allWhiteOccupied = new Set([...Object.keys(whitePawns), ...Object.keys(whitePieces)]);
        const allBlackOccupied = new Set([...Object.keys(blackPawns), ...Object.keys(blackPieces)]);
        
        const remainingWhitePieces = wpTypes.filter((_, i) => i >= Object.keys(whitePieces).length);
        const remainingBlackPieces = bpTypes.filter((_, i) => i >= Object.keys(blackPieces).length);
        
        const wpEmpty = wPieceZone.filter(sq => !allWhiteOccupied.has(sq));
        const bpEmpty = bPieceZone.filter(sq => !allBlackOccupied.has(sq));
        
        const autoWhitePieces = autoPlaceRandom(remainingWhitePieces, wpEmpty);
        const autoBlackPieces = autoPlaceRandom(remainingBlackPieces, bpEmpty);
        
        setWhitePieces(prev => ({ ...prev, ...autoWhitePieces }));
        setBlackPieces(prev => ({ ...prev, ...autoBlackPieces }));
        
        // REVEAL ALL PIECES - Show complete formations
        setPhase('piece-reveal');
        setPhaseTimer(3);
        setMaxTimer(3);
        break;
      }

      case 'piece-reveal':
        // After piece reveal, move to commander draft
        if (gameMode === 'bot-vs-bot') {
          // In bot-vs-bot mode, auto-select commanders and start playing
          const availableWhite = whiteCommanders.filter(c => !c.used);
          const availableBlack = blackCommanders.filter(c => !c.used);
          
          if (availableWhite.length > 0) {
            const whiteCmd = availableWhite[Math.floor(Math.random() * availableWhite.length)];
            setSelectedCommanderWhite(whiteCmd);
          }
          if (availableBlack.length > 0) {
            const blackCmd = availableBlack[Math.floor(Math.random() * availableBlack.length)];
            setSelectedCommanderBlack(blackCmd);
          }
          
          // Start auto-play after a brief delay to show the commanders
          setTimeout(() => {
            setPhase('commander-draft');
            setPhaseTimer(2);
            setMaxTimer(2);
          }, 1000);
        } else {
          setPhase('commander-draft');
          setPhaseTimer(DRAFT_TIME);
          setMaxTimer(DRAFT_TIME);
        }
        break;

      case 'commander-draft':
        // Auto-select commanders if not already selected
        if (!selectedCommanderWhite) {
          const available = whiteCommanders.filter(c => !c.used);
          if (available.length > 0) {
            const random = available[Math.floor(Math.random() * available.length)];
            setSelectedCommanderWhite(random);
          }
        }
        if (!selectedCommanderBlack) {
          const available = blackCommanders.filter(c => !c.used);
          if (available.length > 0) {
            const random = available[Math.floor(Math.random() * available.length)];
            setSelectedCommanderBlack(random);
          }
        }
        // Don't call startAutoPlay here - let the useEffect handle it
        break;
    }
  }, [phase, whitePawns, blackPawns, whitePieces, blackPieces, whiteCommanders, blackCommanders, selectedCommanderWhite, selectedCommanderBlack, gameMode, startBotPiecePlacement]);

  // Timer effect
  useEffect(() => {
    if (phase === 'menu' || phase === 'match-result') return;
    if (phase === 'auto-play') return;

    if (phaseTimer <= 0) {
      handlePhaseTimeout();
      return;
    }

    const interval = setInterval(() => {
      setPhaseTimer(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [phaseTimer, phase, handlePhaseTimeout]);

  const startGame = (mode: 'player' | 'bot-vs-bot' = 'player') => {
    setGameMode(mode);
    setCurrentRound(1);
    setWhiteScore(0);
    setBlackScore(0);
    setWhiteCommanders(INITIAL_COMMANDERS.map(c => ({ ...c })));
    setBlackCommanders(INITIAL_COMMANDERS.map(c => ({ ...c })));
    setRoundResults([]);
    resetRound();
    
    if (mode === 'bot-vs-bot') {
      // Auto-fill both sides immediately
      startBotPlacement();
    } else {
      setPhase('pawn-placement');
      setPhaseTimer(PAWN_TIME);
      setMaxTimer(PAWN_TIME);
    }
  };

  const startBotPlacement = () => {
    console.log('=== START BOT PLACEMENT (PAWNS) ===');
    // Auto-place all white pawns in rows 2-4 only
    const whitePawnTypes = getPawnSet();
    const whitePawnZone = getPawnDeploymentSquares('w');
    console.log('White pawn zone (rows 2-4):', whitePawnZone.length, 'squares');
    const autoWhitePawns = autoPlaceRandom(whitePawnTypes, whitePawnZone);
    console.log('Auto white pawns:', autoWhitePawns);
    setWhitePawns(autoWhitePawns);
    
    // Auto-place all black pawns in rows 5-7 only
    const blackPawnTypes = getPawnSet();
    const blackPawnZone = getPawnDeploymentSquares('b');
    console.log('Black pawn zone (rows 5-7):', blackPawnZone.length, 'squares');
    const autoBlackPawns = autoPlaceRandom(blackPawnTypes, blackPawnZone);
    console.log('Auto black pawns:', autoBlackPawns);
    setBlackPawns(autoBlackPawns);
    
    // Show pawn reveal
    setPhase('pawn-reveal');
    setPhaseTimer(3);
    setMaxTimer(3);
  };



  const resetRound = () => {
    setWhitePawns({});
    setBlackPawns({});
    setWhitePieces({});
    setBlackPieces({});
    setSelectedPiece(null);
    setSelectedCommanderWhite(null);
    setSelectedCommanderBlack(null);
    setGame(null);
    setBoard(getInitialBoard());
    setLastMove(null);
    setMoveLog([]);
    setMoveCount(0);
    setEvalBar(0);
    setEvalHistory([]);
    setShowRoundResult(false);
    setCurrentRoundResult(null);
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  };

  const handleSquareClick = (square: string) => {
    if (phase === 'pawn-placement') {
      handlePawnPlacement(square);
    } else if (phase === 'piece-placement') {
      handlePiecePlacement(square);
    }
  };

  const handlePawnPlacement = (square: string) => {
    const actualRank = parseInt(square[1]);
    // Pawns in rows 2-4 for white
    const isWhitePawnZone = actualRank >= 2 && actualRank <= 4;

    // Player places white pawns
    if (isWhitePawnZone && !whitePawns[square] && Object.keys(whitePawns).length < 8) {
      setWhitePawns(prev => ({ ...prev, [square]: 'p' }));
    }
  };

  // Black AI auto-placement effect
  useEffect(() => {
    if (phase !== 'pawn-placement' && phase !== 'piece-placement') return;
    
    const interval = setInterval(() => {
      if (phase === 'pawn-placement' && Object.keys(blackPawns).length < 8) {
        // Pawns in rows 5-7 for black
        const blackPawnZone = getPawnDeploymentSquares('b');
        const occupied = new Set(Object.keys(blackPawns));
        const empty = blackPawnZone.filter(sq => !occupied.has(sq));
        if (empty.length > 0) {
          const randomSquare = empty[Math.floor(Math.random() * empty.length)];
          setBlackPawns(prev => ({ ...prev, [randomSquare]: 'p' }));
        }
      } else if (phase === 'piece-placement' && Object.keys(blackPieces).length < 8) {
        // Pieces in rows 5-8 for black
        const blackPieceZone = getPieceDeploymentSquares('b');
        const allOccupied = new Set([...Object.keys(blackPawns), ...Object.keys(blackPieces)]);
        const empty = blackPieceZone.filter(sq => !allOccupied.has(sq));
        if (empty.length > 0) {
          const randomSquare = empty[Math.floor(Math.random() * empty.length)];
          const remaining = getStandardPieceSet().filter((_, i) => i >= Object.keys(blackPieces).length);
          if (remaining.length > 0) {
            setBlackPieces(prev => ({ ...prev, [randomSquare]: remaining[0] }));
          }
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [phase, blackPawns, blackPieces]);

  const handleReady = () => {
    if (phase === 'pawn-placement') {
      // Auto-fill remaining white pawns in rows 2-4 only
      if (Object.keys(whitePawns).length < 8) {
        const remaining = 8 - Object.keys(whitePawns).length;
        const occupied = new Set(Object.keys(whitePawns));
        const empty = getPawnDeploymentSquares('w').filter(sq => !occupied.has(sq));
        const auto = autoPlaceRandom(Array(remaining).fill('p') as PieceType[], empty);
        setWhitePawns(prev => ({ ...prev, ...auto }));
      }
      // Also ensure black is complete in rows 5-7 only
      if (Object.keys(blackPawns).length < 8) {
        const remaining = 8 - Object.keys(blackPawns).length;
        const occupied = new Set(Object.keys(blackPawns));
        const empty = getPawnDeploymentSquares('b').filter(sq => !occupied.has(sq));
        const auto = autoPlaceRandom(Array(remaining).fill('p') as PieceType[], empty);
        setBlackPawns(prev => ({ ...prev, ...auto }));
      }
      setPhaseTimer(0); // Trigger timeout to move to next phase
    } else if (phase === 'piece-placement') {
      // Auto-fill remaining white pieces in rows 1-4
      if (Object.keys(whitePieces).length < 8) {
        const remaining = 8 - Object.keys(whitePieces).length;
        const occupied = new Set([...Object.keys(whitePawns), ...Object.keys(whitePieces)]);
        const empty = getPieceDeploymentSquares('w').filter(sq => !occupied.has(sq));
        const allPieces = getStandardPieceSet();
        const placed = Object.values(whitePieces) as PieceType[];
        const remainingPieces = [...allPieces];
        for (const p of placed) {
          const idx = remainingPieces.indexOf(p);
          if (idx !== -1) remainingPieces.splice(idx, 1);
        }
        const auto = autoPlaceRandom(remainingPieces.slice(0, remaining), empty);
        setWhitePieces(prev => ({ ...prev, ...auto }));
      }
      // Also ensure black is complete in rows 5-8
      if (Object.keys(blackPieces).length < 8) {
        const remaining = 8 - Object.keys(blackPieces).length;
        const occupied = new Set([...Object.keys(blackPawns), ...Object.keys(blackPieces)]);
        const empty = getPieceDeploymentSquares('b').filter(sq => !occupied.has(sq));
        const allPieces = getStandardPieceSet();
        const placed = Object.values(blackPieces) as PieceType[];
        const remainingPieces = [...allPieces];
        for (const p of placed) {
          const idx = remainingPieces.indexOf(p);
          if (idx !== -1) remainingPieces.splice(idx, 1);
        }
        const auto = autoPlaceRandom(remainingPieces.slice(0, remaining), empty);
        setBlackPieces(prev => ({ ...prev, ...auto }));
      }
      setPhaseTimer(0);
    } else if (phase === 'commander-draft') {
      setPhaseTimer(0);
    }
  };

  const handlePiecePlacement = (square: string) => {
    if (!selectedPiece) return;

    const actualRank = parseInt(square[1]);
    // Pieces can be placed in rows 1-4 for white
    const isWhitePieceZone = actualRank >= 1 && actualRank <= 4;

    if (isWhitePieceZone && !whitePawns[square] && !whitePieces[square]) {
      setWhitePieces(prev => ({ ...prev, [square]: selectedPiece }));
      
      // Check if all pieces placed
      if (Object.keys(whitePieces).length + 1 >= 8) {
        setSelectedPiece(null);
      }
    }
  };

  const handleCommanderSelect = (commander: Commander, color: Color) => {
    if (color === 'w') {
      setSelectedCommanderWhite(commander);
      // Auto-select black commander after a short delay (simulating opponent thinking)
      setTimeout(() => {
        const available = blackCommanders.filter(c => !c.used);
        if (available.length > 0) {
          // AI picks a commander somewhat strategically
          const pick = available[Math.floor(Math.random() * available.length)];
          setSelectedCommanderBlack(pick);
        }
        // The useEffect will handle starting auto-play when both commanders are set
      }, 1000);
    }
  };

  const startAutoPlay = useCallback(() => {
    console.log('=== START AUTO PLAY ===');
    console.log('Current phase:', phase);
    console.log('White pawns:', whitePawns);
    console.log('White pieces:', whitePieces);
    console.log('Black pawns:', blackPawns);
    console.log('Black pieces:', blackPieces);
    
    // Auto-fill any missing pieces before starting
    const finalWhitePawns = { ...whitePawns };
    const finalWhitePieces = { ...whitePieces };
    const finalBlackPawns = { ...blackPawns };
    const finalBlackPieces = { ...blackPieces };
    
    // Auto-fill white pawns if needed
    if (Object.keys(finalWhitePawns).length < 8) {
      const remaining = 8 - Object.keys(finalWhitePawns).length;
      const occupied = new Set(Object.keys(finalWhitePawns));
      const empty = getPawnDeploymentSquares('w').filter(sq => !occupied.has(sq));
      const auto = autoPlaceRandom(Array(remaining).fill('p') as PieceType[], empty);
      Object.assign(finalWhitePawns, auto);
      console.log('Auto-filled white pawns:', remaining, 'pieces');
    }
    
    // Auto-fill black pawns if needed
    if (Object.keys(finalBlackPawns).length < 8) {
      const remaining = 8 - Object.keys(finalBlackPawns).length;
      const occupied = new Set(Object.keys(finalBlackPawns));
      const empty = getPawnDeploymentSquares('b').filter(sq => !occupied.has(sq));
      const auto = autoPlaceRandom(Array(remaining).fill('p') as PieceType[], empty);
      Object.assign(finalBlackPawns, auto);
      console.log('Auto-filled black pawns:', remaining, 'pieces');
    }
    
    // Auto-fill white pieces if needed
    if (Object.keys(finalWhitePieces).length < 8) {
      const remaining = 8 - Object.keys(finalWhitePieces).length;
      const occupied = new Set([...Object.keys(finalWhitePawns), ...Object.keys(finalWhitePieces)]);
      const empty = getPieceDeploymentSquares('w').filter(sq => !occupied.has(sq));
      const allPieces = getStandardPieceSet();
      const placed = Object.values(finalWhitePieces) as PieceType[];
      const remainingPieces = [...allPieces];
      for (const p of placed) {
        const idx = remainingPieces.indexOf(p);
        if (idx !== -1) remainingPieces.splice(idx, 1);
      }
      const auto = autoPlaceRandom(remainingPieces.slice(0, remaining), empty);
      Object.assign(finalWhitePieces, auto);
      console.log('Auto-filled white pieces:', remaining, 'pieces');
    }
    
    // Auto-fill black pieces if needed
    if (Object.keys(finalBlackPieces).length < 8) {
      const remaining = 8 - Object.keys(finalBlackPieces).length;
      const occupied = new Set([...Object.keys(finalBlackPawns), ...Object.keys(finalBlackPieces)]);
      const empty = getPieceDeploymentSquares('b').filter(sq => !occupied.has(sq));
      const allPieces = getStandardPieceSet();
      const placed = Object.values(finalBlackPieces) as PieceType[];
      const remainingPieces = [...allPieces];
      for (const p of placed) {
        const idx = remainingPieces.indexOf(p);
        if (idx !== -1) remainingPieces.splice(idx, 1);
      }
      const auto = autoPlaceRandom(remainingPieces.slice(0, remaining), empty);
      Object.assign(finalBlackPieces, auto);
      console.log('Auto-filled black pieces:', remaining, 'pieces');
    }
    
    // Update state with filled pieces
    setWhitePawns(finalWhitePawns);
    setWhitePieces(finalWhitePieces);
    setBlackPawns(finalBlackPawns);
    setBlackPieces(finalBlackPieces);
    
    setPhase('auto-play');
    
    // Build the FEN from placement (using the already auto-filled pieces)
    const fen = buildFenFromPlacement(finalWhitePawns, finalWhitePieces, finalBlackPawns, finalBlackPieces);
    console.log('Generated FEN:', fen);
    console.log('White pawns placement:', finalWhitePawns);
    console.log('Black pawns placement:', finalBlackPawns);
    
    // Validate FEN before creating game
    let chessGame: Chess;
    try {
      // Test if FEN is valid by attempting to load it
      const testGame = new Chess();
      testGame.load(fen);
      chessGame = new Chess(fen);
      console.log('FEN is valid, game created successfully');
    } catch (error) {
      console.error('❌ Invalid FEN, using standard position:', error);
      console.log('Generated FEN:', fen);
      console.log('White pawns:', finalWhitePawns);
      console.log('White pieces:', finalWhitePieces);
      console.log('Black pawns:', finalBlackPawns);
      console.log('Black pieces:', finalBlackPieces);
      // If FEN is invalid, start from standard position
      chessGame = new Chess();
    }
    
    setGame(chessGame);
    setBoard(boardFromPlacement(finalWhitePawns, finalWhitePieces, finalBlackPawns, finalBlackPieces));
    
    // Calculate initial eval
    const initialEval = getEvalForPosition(chessGame.fen());
    setEvalBar(initialEval);
    setEvalHistory([initialEval]);

    // Start auto-play
    let moves = 0;
    const localEvalHistory = [initialEval];

    // Synchronous move function
    const makeMove = () => {
      console.log(`🎬 makeMove called - Move ${moves + 1}, Turn: ${chessGame.turn()}`);
      
      if (chessGame.isGameOver() || moves >= MAX_MOVES) {
        console.log('🏁 Game over or max moves reached');
        if (autoPlayRef.current) clearInterval(autoPlayRef.current);
        endRound(chessGame, localEvalHistory, moves);
        return;
      }

      const whiteCmd = selectedCommanderWhite || whiteCommanders.find(c => !c.used) || whiteCommanders[0];
      const blackCmd = selectedCommanderBlack || blackCommanders.find(c => !c.used) || blackCommanders[0];
      const currentCommander = chessGame.turn() === 'w' ? whiteCmd : blackCmd;
      console.log(`🎯 ${chessGame.turn() === 'w' ? 'White' : 'Black'} to move: ${currentCommander.name}`);

      const move = getBestMove(chessGame, currentCommander);
      if (move) {
        console.log(`✅ Move made: ${move.san}`);
        chessGame.move(move);
        setLastMove({ from: move.from, to: move.to });
        setMoveLog(prev => [...prev, move.san]);
        moves++;
        setMoveCount(moves);

        // Update board display
        const newBoard = getInitialBoard();
        const chessBoard = chessGame.board();
        for (let r = 0; r < 8; r++) {
          for (let f = 0; f < 8; f++) {
            const piece = chessBoard[r][f];
            if (piece) {
              newBoard[r][f] = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
            }
          }
        }
        setBoard(newBoard);

        // Update eval - use custom eval for reliability
        const eval_ = getStockfishEval(chessGame.fen());
        console.log(`📊 Eval after move: ${eval_}`);
        setEvalBar(eval_);
        localEvalHistory.push(eval_);
        setEvalHistory([...localEvalHistory]);
      } else {
        console.error('❌ No move returned from getBestMove!');
      }
    };

    console.log(`⏱️ Starting auto-play interval: ${MOVE_INTERVAL}ms`);
    autoPlayRef.current = setInterval(() => {
      console.log('⏰ Interval triggered');
      makeMove();
    }, MOVE_INTERVAL);
  }, [whitePawns, whitePieces, blackPawns, blackPieces, selectedCommanderWhite, selectedCommanderBlack, whiteCommanders, blackCommanders]);

  // Auto-play effect - starts when both commanders are selected
  useEffect(() => {
    if (phase === 'commander-draft' && selectedCommanderWhite && selectedCommanderBlack) {
      const timeout = setTimeout(() => {
        startAutoPlay();
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [phase, selectedCommanderWhite, selectedCommanderBlack, startAutoPlay]);

  const endRound = (chessGame: Chess, history: number[], moves: number) => {
    let winner: Color | 'draw' = 'draw';
    
    if (chessGame.isCheckmate()) {
      winner = chessGame.turn() === 'w' ? 'b' : 'w';
    } else if (chessGame.isDraw()) {
      winner = 'draw';
    } else {
      // Move limit reached - use eval
      const finalEval = history[history.length - 1];
      if (finalEval > 50) winner = 'w';
      else if (finalEval < -50) winner = 'b';
      else winner = 'draw';
    }

    if (winner === 'w') setWhiteScore(prev => prev + 1);
    else if (winner === 'b') setBlackScore(prev => prev + 1);
    else {
      setWhiteScore(prev => prev + 0.5);
      setBlackScore(prev => prev + 0.5);
    }

    const whiteCmd = selectedCommanderWhite || whiteCommanders[0];
    const blackCmd = selectedCommanderBlack || blackCommanders[0];

    const result: RoundResult = {
      round: currentRound,
      winner,
      whiteCommander: whiteCmd,
      blackCommander: blackCmd,
      moves,
      evalHistory: history,
    };

    setCurrentRoundResult(result);
    setRoundResults(prev => [...prev, result]);
    
    // Mark commanders as used
    setWhiteCommanders(prev => prev.map(c => c.id === whiteCmd.id ? { ...c, used: true } : c));
    setBlackCommanders(prev => prev.map(c => c.id === blackCmd.id ? { ...c, used: true } : c));

    setPhase('round-result');
    setShowRoundResult(true);
    
    // In bot-vs-bot mode, auto-advance after 3 seconds
    if (gameMode === 'bot-vs-bot') {
      setTimeout(() => {
        handleNextRound();
      }, 3000);
    }
  };

  const handleNextRound = () => {
    setShowRoundResult(false);
    if (currentRound >= 5) {
      setPhase('match-result');
    } else {
      setCurrentRound(prev => prev + 1);
      resetRound();
      
      if (gameMode === 'bot-vs-bot') {
        // Continue bot-vs-bot mode
        startBotPlacement();
      } else {
        setPhase('pawn-placement');
        setPhaseTimer(PAWN_TIME);
        setMaxTimer(PAWN_TIME);
      }
    }
  };

  // Get piece counts for tray
  const getPieceCounts = (isPawnPhase: boolean) => {
    if (isPawnPhase) {
      return [{ type: 'p' as PieceType, count: 8 - Object.keys(whitePawns).length }];
    }
    const placed = Object.keys(whitePieces).length;
    const allPieces = getStandardPieceSet();
    const counts: Record<string, number> = {};
    allPieces.forEach(p => { counts[p] = (counts[p] || 0) + 1; });
    
    // Subtract already placed
    Object.values(whitePieces).forEach(p => {
      if (counts[p] > 0) counts[p]--;
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({ type: type as PieceType, count }));
  };

  // Render board based on phase
  const renderBoard = () => {
    if (phase === 'auto-play' || phase === 'round-result') {
      return board;
    }
    
    // During placement, show what player has placed
    const displayBoard = getInitialBoard();
    
    // Show white placements
    Object.entries(whitePawns).forEach(([sq, piece]) => {
      const file = sq.charCodeAt(0) - 97;
      const rank = 8 - parseInt(sq[1]);
      if (rank >= 0 && rank < 8) displayBoard[rank][file] = piece.toUpperCase();
    });
    Object.entries(whitePieces).forEach(([sq, piece]) => {
      const file = sq.charCodeAt(0) - 97;
      const rank = 8 - parseInt(sq[1]);
      if (rank >= 0 && rank < 8) displayBoard[rank][file] = piece.toUpperCase();
    });

    // Show black pawns during pawn-reveal phase
    if (phase === 'pawn-reveal' || phase === 'piece-placement' || phase === 'piece-reveal') {
      Object.entries(blackPawns).forEach(([sq, piece]) => {
        const file = sq.charCodeAt(0) - 97;
        const rank = 8 - parseInt(sq[1]);
        if (rank >= 0 && rank < 8) displayBoard[rank][file] = piece.toLowerCase();
      });
    }

    // Show black pieces during piece-reveal phase
    if (phase === 'piece-reveal') {
      Object.entries(blackPieces).forEach(([sq, piece]) => {
        const file = sq.charCodeAt(0) - 97;
        const rank = 8 - parseInt(sq[1]);
        if (rank >= 0 && rank < 8) displayBoard[rank][file] = piece.toLowerCase();
      });
    }

    return displayBoard;
  };

  const getOccupiedSquares = (): Set<string> => {
    return new Set([
      ...Object.keys(whitePawns),
      ...Object.keys(whitePieces),
    ]);
  };

  // Menu screen
  if (phase === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-purple-400 to-blue-400 mb-4">
            ♟ ALB Auto-Chess
          </h1>
          <p className="text-gray-300 mb-2 text-lg">
            A 5-round chess variant with blind placement & commander drafting
          </p>
          <div className="bg-gray-800/50 rounded-xl p-4 mb-6 text-left text-sm text-gray-400 border border-gray-700">
            <p className="font-bold text-gray-200 mb-2">How to Play:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li><span className="text-blue-300">Place your pawns</span> (30s) in rows 2-4</li>
              <li><span className="text-blue-300">Place your pieces</span> (50s) anywhere in your zone</li>
              <li><span className="text-yellow-300">Pick a Commander</span> to pilot the round</li>
              <li><span className="text-purple-300">Watch the auto-play</span> unfold!</li>
              <li>5 rounds, different commanders each time</li>
            </ol>
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs text-purple-300">
                🧠 Powered by <span className="font-bold">Stockfish Engine</span> with personality-based commanders
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => startGame('player')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-bold text-xl
                hover:from-purple-500 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-purple-500/30
                hover:scale-105 active:scale-95"
            >
              ⚔️ Play vs Bot
            </button>
            <button
              onClick={() => startGame('bot-vs-bot')}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl text-white font-bold text-lg
                hover:from-green-500 hover:to-teal-500 transition-all duration-200 shadow-lg shadow-green-500/30
                hover:scale-105 active:scale-95"
            >
              🤖 Bot vs Bot (Test Mode)
            </button>
          </div>
          <div className="mt-6 grid grid-cols-5 gap-2">
            {INITIAL_COMMANDERS.map(cmd => (
              <div key={cmd.id} className="bg-gray-800/50 rounded-lg p-2 border border-gray-700">
                <div className="text-xl">{cmd.emoji}</div>
                <div className="text-[10px] text-gray-300 font-bold truncate">{cmd.name}</div>
                <div className="text-[9px] text-gray-500">ELO {cmd.elo}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Match result screen
  if (phase === 'match-result') {
    const winner = whiteScore > blackScore ? 'White' : blackScore > whiteScore ? 'Black' : 'Nobody';
    const winnerColor = whiteScore > blackScore ? 'text-blue-400' : blackScore > whiteScore ? 'text-red-400' : 'text-yellow-400';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-4">
            🏆 Match Complete!
          </h1>
          <div className={`text-3xl font-bold ${winnerColor} mb-4`}>
            {winner === 'Nobody' ? "It's a Draw!" : `${winner} Wins!`}
          </div>
          <div className="text-2xl text-gray-200 mb-6">
            <span className="text-blue-400">{whiteScore}</span>
            <span className="text-gray-500 mx-2">-</span>
            <span className="text-red-400">{blackScore}</span>
          </div>
          
          <div className="space-y-2 mb-6">
            {roundResults.map((result, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-2 border border-gray-700 text-sm">
                <span className="text-gray-400">R{result.round}</span>
                <span className="text-blue-300">{result.whiteCommander.emoji} {result.whiteCommander.name}</span>
                <span className={`font-bold ${result.winner === 'w' ? 'text-blue-400' : result.winner === 'b' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {result.winner === 'w' ? '1-0' : result.winner === 'b' ? '0-1' : '½-½'}
                </span>
                <span className="text-red-300">{result.blackCommander.name} {result.blackCommander.emoji}</span>
              </div>
            ))}
          </div>
          
          <button
            onClick={() => setPhase('menu')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-bold
              hover:from-purple-500 hover:to-blue-500 transition-all duration-200"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // Main game UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-400">
              ♟ ALB Auto-Chess
            </h1>
            {gameMode === 'bot-vs-bot' && (
              <span className="px-2 py-1 bg-green-600/30 border border-green-500 rounded text-xs text-green-300 font-bold">
                🤖 BOT vs BOT
              </span>
            )}
          </div>
          <RoundTracker
            currentRound={currentRound}
            totalRounds={5}
            whiteScore={whiteScore}
            blackScore={blackScore}
            roundResults={roundResults}
          />
        </div>

        {/* Timer */}
        {phase !== 'auto-play' && phase !== 'round-result' && (
          <div className="mb-3">
            <PhaseTimer
              timeLeft={phaseTimer}
              maxTime={maxTimer}
              phaseName={
                phase === 'pawn-placement' ? '🏁 Pawn Placement' :
                phase === 'pawn-reveal' ? '🎭 Pawn Reveal' :
                phase === 'piece-placement' ? '♟ Piece Placement' :
                phase === 'piece-reveal' ? '🎭 Full Reveal' :
                phase === 'commander-draft' ? '👑 Commander Draft' : ''
              }
            />
          </div>
        )}

        {/* Commander reveal banner */}
        {(phase === 'auto-play' || phase === 'round-result') && selectedCommanderWhite && selectedCommanderBlack && (
          <div className="mb-3 bg-gray-800/80 rounded-lg p-2 border border-gray-600 flex items-center justify-center gap-4">
            <div className="text-center">
              <span className="text-xl">{selectedCommanderWhite.emoji}</span>
              <span className="text-xs text-blue-300 ml-1 font-bold">{selectedCommanderWhite.name}</span>
            </div>
            <span className="text-yellow-400 font-bold text-sm">⚔️ VS ⚔️</span>
            <div className="text-center">
              <span className="text-xs text-red-300 mr-1 font-bold">{selectedCommanderBlack.name}</span>
              <span className="text-xl">{selectedCommanderBlack.emoji}</span>
            </div>
          </div>
        )}

        {/* Main layout */}
        <div className="flex flex-col lg:flex-row gap-3 items-start justify-center">
          {/* Left panel - White commanders */}
          <div className="w-full lg:w-56 order-2 lg:order-1">
            <CommanderPanel
              commanders={whiteCommanders}
              color="w"
              selectedCommander={selectedCommanderWhite}
              onSelect={(cmd) => handleCommanderSelect(cmd, 'w')}
              disabled={phase !== 'commander-draft'}
              isDrafting={phase === 'commander-draft'}
            />
          </div>

          {/* Center - Board + controls */}
          <div className="flex flex-col items-center gap-3 order-1 lg:order-2">
            {/* Pawn Reveal message */}
            {phase === 'pawn-reveal' && (
              <div className="text-center py-3 px-6 bg-gradient-to-r from-yellow-900/70 to-orange-900/70 rounded-lg border-2 border-yellow-500 animate-pulse shadow-lg shadow-yellow-500/30">
                <span className="text-yellow-200 font-bold text-lg">🎭 PAWNS REVEALED!</span>
                <div className="text-yellow-300 text-sm mt-1">Both sides' pawn formations are now visible</div>
              </div>
            )}

            {/* Piece Reveal message */}
            {phase === 'piece-reveal' && (
              <div className="text-center py-3 px-6 bg-gradient-to-r from-purple-900/70 to-pink-900/70 rounded-lg border-2 border-purple-500 animate-pulse shadow-lg shadow-purple-500/30">
                <span className="text-purple-200 font-bold text-lg">🎭 FULL POSITION REVEALED!</span>
                <div className="text-purple-300 text-sm mt-1">All pieces are now visible - Choose your Commander!</div>
              </div>
            )}

            {/* Auto-play status */}
            {phase === 'auto-play' && (
              <div className="text-center py-2 px-4 bg-green-900/50 rounded-lg border-2 border-green-500 flex items-center justify-center gap-3 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                  <span className="text-green-300 text-sm font-bold">
                    ▶ Move {moveCount} • {game?.turn() === 'w' ? 'White' : 'Black'} to move
                  </span>
                </div>
                <span className="text-[10px] px-2 py-1 bg-purple-800/50 border border-purple-500 rounded text-purple-300 font-bold">
                  🧠 AI Thinking...
                </span>
              </div>
            )}

            {/* Board with eval bar */}
            <div className="flex gap-2 items-center">
              <EvalBar evaluation={evalBar} height={400} />
              <Board
                board={renderBoard()}
                onSquareClick={handleSquareClick}
                highlightZone={
                  phase === 'pawn-placement' ? 'pawn' as any :
                  phase === 'piece-placement' ? 'piece' as any :
                  phase === 'pawn-reveal' ? 'both' as any :
                  phase === 'piece-reveal' ? 'both' as any :
                  undefined
                }
                occupiedSquares={getOccupiedSquares()}
                placementMode={phase === 'pawn-placement' || phase === 'piece-placement'}
                lastMove={lastMove}
              />
            </div>

            {/* Piece tray during placement */}
            {(phase === 'pawn-placement' || phase === 'piece-placement') && (
              <div className="flex flex-col items-center gap-2">
                <PieceTray
                  pieces={getPieceCounts(phase === 'pawn-placement')}
                  selectedPiece={selectedPiece}
                  onSelect={setSelectedPiece}
                  color="w"
                />
                <button
                  onClick={handleReady}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-bold
                    transition-all duration-200 shadow-lg hover:scale-105"
                >
                  ✓ Ready (Skip Timer)
                </button>
              </div>
            )}

            {/* Ready button for commander draft */}
            {phase === 'commander-draft' && selectedCommanderWhite && (
              <button
                onClick={handleReady}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-bold
                  transition-all duration-200 shadow-lg hover:scale-105"
              >
                ✓ Confirm Pick
              </button>
            )}

            {/* Move log during auto-play */}
            {phase === 'auto-play' && moveLog.length > 0 && (
              <div className="w-[400px] max-h-20 overflow-y-auto bg-gray-800/80 rounded-lg p-2 border border-gray-600">
                <div className="text-xs text-gray-400 flex flex-wrap gap-1">
                  {moveLog.slice(-20).map((move, i) => (
                    <span key={i} className={`${i % 2 === 0 ? 'text-white' : 'text-gray-300'}`}>
                      {Math.ceil((moveLog.length - 20 + i + 1) / 2)}.
                      {moveLog.length - 20 + i >= 0 && (moveLog.length - 20 + i) % 2 === 0 ? '' : ''}
                      {move}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right panel - Black commanders */}
          <div className="w-full lg:w-56 order-3">
            <CommanderPanel
              commanders={blackCommanders}
              color="b"
              selectedCommander={selectedCommanderBlack}
              disabled={true}
              isDrafting={false}
            />
          </div>
        </div>
      </div>

      {/* Round result modal */}
      {showRoundResult && currentRoundResult && (
        <RoundResultModal
          result={currentRoundResult}
          onNext={handleNextRound}
          isLastRound={currentRound >= 5}
        />
      )}
    </div>
  );
};

export default App;
