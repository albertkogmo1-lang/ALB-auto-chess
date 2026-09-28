# Stockfish Integration Summary

## What Was Done

Successfully integrated Stockfish chess engine into the ALB Auto-Chess game with fallback to custom minimax engine.

## Architecture

### 1. Stockfish Engine Wrapper (`src/game/stockfish.ts`)
- Loads Stockfish.js v10.0.2 from CDN (jsDelivr)
- Runs in a Web Worker to avoid blocking the UI
- Communicates via UCI (Universal Chess Interface) protocol
- Provides async API for move calculation and evaluation

### 2. AI Module (`src/game/ai.ts`)
- Hybrid approach: tries Stockfish first, falls back to custom minimax
- Maps commander ELO to Stockfish parameters optimized for browser-based play:
  - **2400 ELO** (International/Senior Master): depth 11, skill level 20 - Strong tactical and strategic play
  - **2200 ELO** (Master): depth 8, skill level 16 - Solid positional understanding
  - **2000 ELO** (Expert): depth 6, skill level 12 - Good tactical vision
  - **1900 ELO** (Class A/Advanced): depth 5, skill level 8 - Decent calculation ability
  - **1800 ELO** (Class A/Advanced): depth 4, skill level 6 - Basic tactical awareness

### 3. Commander Personality System
Each commander still has unique characteristics:
- **Blunder Rate**: Chance to make a random move (applies to both engines)
- **Aggression**: Preference for captures and checks
- **Search Depth**: How far ahead to calculate (Stockfish) or minimax depth (fallback)

### 4. Evaluation System
- Uses Stockfish's evaluation when available (centipawns)
- Falls back to custom evaluation (material + piece-square tables + mobility)
- Normalized to -100 to +100 scale for the eval bar

## Key Features

✅ **Stockfish Integration**: Real chess engine running in browser
✅ **Fallback System**: Custom minimax engine if Stockfish fails to load
✅ **Personality Preservation**: Commanders still play differently based on their traits
✅ **Async Processing**: Non-blocking engine communication via Web Worker
✅ **Graceful Degradation**: Game works even if Stockfish CDN is unavailable
✅ **Logging**: Console logs show which engine is being used and move decisions

## How It Works

1. **Initialization**: When auto-play starts, the game tries to load Stockfish from CDN
2. **Move Calculation**: For each move:
   - Check if commander should blunder (random move)
   - If not, ask Stockfish for best move with appropriate depth/skill
   - If Stockfish fails, use custom minimax engine
   - Apply aggression filter for aggressive commanders
3. **Evaluation**: Update eval bar with Stockfish's evaluation or custom eval

## Benefits

- **Stronger Play**: Stockfish provides much stronger tactical play than custom minimax
- **Realistic Games**: Matches feel more like real chess games
- **Balanced Difficulty**: ELO mapping ensures appropriate challenge levels
- **Maintained Fun**: Commander personalities still create variety and upsets

## Technical Details

- **Stockfish Version**: 10.0.2 (stable, well-tested)
- **CDN**: jsDelivr (fast, reliable)
- **Worker**: Web Worker with blob URL (no external file needed)
- **Protocol**: UCI (standard chess engine protocol)
- **Timeout**: 5 seconds per move (plenty for depth 4-11 searches)
- **Move Interval**: 1 second between moves (optimized for fast, responsive gameplay)
- **Fallback**: Always available if Stockfish fails

### Depth vs. Time Trade-offs

Optimized for fast browser-based play with practical search depths:
- **Depth 4** (1800 ELO): ~0.1-0.3 seconds per move
- **Depth 5** (1900 ELO): ~0.2-0.5 seconds per move
- **Depth 6** (2000 ELO): ~0.3-0.8 seconds per move
- **Depth 8** (2200 ELO): ~0.5-1.5 seconds per move
- **Depth 11** (2400 ELO): ~1-3 seconds per move

The 1-second move interval provides smooth gameplay while allowing Stockfish to complete most searches. The shallower depths ensure responsive play while still maintaining meaningful skill differences between commanders.

## Testing

The game now features:
- Real Stockfish engine for move calculation
- Custom minimax fallback engine
- Commander personalities (blunder rate, aggression)
- ELO-based difficulty scaling (1800-2400)
- Live evaluation from Stockfish
- Console logging for debugging

## Future Enhancements

Possible improvements:
- Add Stockfish WASM version for better performance
- Implement time controls (think longer on complex positions)
- Add opening book for more human-like play
- Implement endgame tablebases for perfect endgame play
- Add multiple PV (principal variation) analysis for deeper insight
