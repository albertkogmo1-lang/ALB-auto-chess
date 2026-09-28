# Auto-Play Debugging Guide

## Issue: Auto-Play Stops Moving

If the auto-play stops making moves, follow this debugging guide to identify the problem.

## Step 1: Open Browser Console

1. Press `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
2. Click on the "Console" tab
3. Clear any existing logs (click the 🚫 icon)

## Step 2: Start a Bot vs Bot Match

1. Click "🤖 Bot vs Bot (Test Mode)"
2. Watch the console for auto-play logs

## Step 3: Check for These Log Messages

### ✅ Healthy Auto-Play Logs

You should see these messages repeating every 1 second:

```
💓 [AUTO-PLAY] Heartbeat #1
🎬 [AUTO-PLAY] === makeMove START ===
🎬 [AUTO-PLAY] Move number: 1
🎬 [AUTO-PLAY] Current turn: w
🎬 [AUTO-PLAY] Game is game over? false
🎬 [AUTO-PLAY] Move count: 0, Max moves: 100
🎯 [AUTO-PLAY] Legal moves available: 20
🎯 [AUTO-PLAY] White to move: The Legend (ELO: 2600)
🤖 [AUTO-PLAY] Calling getBestMove...
🤖 [AI] === getBestMove START ===
🤖 [AI] Commander: The Legend, ELO: 2600, Depth: 6
🤖 [AI] Found 20 legal moves
🎲 [AI] Blunder check: rolled 0.523 vs 0.01
🎲 [AI] The Legend using custom engine (depth 6)
🎲 [FALLBACK] === getBestMoveFallback START ===
🎲 [FALLBACK] Found 20 legal moves
🎲 [FALLBACK] Starting minimax search with depth 5
🎲 [FALLBACK] Evaluating move 1/20: e4
🎲 [FALLBACK] Move e4 eval: 15, time: 45.23ms
...
🎲 [FALLBACK] Search complete in 234.56ms
🎲 [FALLBACK] Best move: e4, eval: 15
🎲 [FALLBACK] === getBestMoveFallback END ===
🤖 [AI] getBestMoveFallback returned: e4
✅ [AI] The Legend plays: e4
🤖 [AUTO-PLAY] getBestMove returned: e4 (took 250.12ms)
✅ [AUTO-PLAY] Making move: e4
✅ [AUTO-PLAY] Move is legal: true
✅ [AUTO-PLAY] Move applied to game
✅ [AUTO-PLAY] === makeMove COMPLETE ===

💓 [AUTO-PLAY] Heartbeat #2
... (repeats)
```

### ❌ Problem Indicators

#### Problem 1: No Heartbeat Messages

**Symptom:** You don't see `💓 [AUTO-PLAY] Heartbeat #X` messages

**Cause:** The interval is not running

**Solution:**
- Check if you see `⏱️ [AUTO-PLAY] Interval created, ID: X`
- If not, the auto-play never started
- Check if both commanders were selected
- Look for errors in the console

#### Problem 2: Heartbeat But No Moves

**Symptom:** You see heartbeats but no move messages

**Cause:** The move function is failing silently

**Check for:**
```
❌ [AUTO-PLAY] ERROR in makeMove: [error message]
```

**Common errors:**
- Invalid chess game object
- No legal moves available
- Illegal move attempted

#### Problem 3: Game Over Too Early

**Symptom:** Auto-play stops after a few moves

**Check for:**
```
🏁 [AUTO-PLAY] Game over or max moves reached
```

**Causes:**
- Checkmate occurred
- Stalemate occurred
- Draw by repetition
- 50-move rule
- Max moves (100) reached

#### Problem 4: getBestMove Returns null

**Symptom:** You see this error:
```
❌ [AUTO-PLAY] No move returned from getBestMove!
```

**Causes:**
- Engine crashed
- Timeout in move calculation
- Invalid position

**Check:**
```
❌ [AUTO-PLAY] Game FEN: [fen string]
❌ [AUTO-PLAY] Legal moves: [array of moves]
```

#### Problem 5: Illegal Move Attempted

**Symptom:** You see this error:
```
❌ [AUTO-PLAY] Attempted illegal move!
```

**Cause:** Engine returned a move that's not in the legal moves list

**Check:**
```
❌ [AUTO-PLAY] Move: [move notation]
❌ [AUTO-PLAY] Legal moves: [array of legal moves]
```

## Step 4: Common Fixes

### Fix 1: Restart the Game

If auto-play gets stuck:
1. Click "Play Again" or refresh the page
2. Start a new Bot vs Bot match
3. Watch the console for errors

### Fix 2: Check Commander Selection

Make sure both commanders are selected:
- Look for: `🎮 [EFFECT] White commander: [name]`
- Look for: `🎮 [EFFECT] Black commander: [name]`
- If missing, the commander draft didn't complete

### Fix 3: Check Interval Status

Look for:
```
⏱️ [AUTO-PLAY] Interval created, ID: [number]
```

If you don't see this, the interval never started.

### Fix 4: Check for JavaScript Errors

Look for red error messages in the console:
```
Uncaught TypeError: ...
Uncaught ReferenceError: ...
```

These indicate code bugs that need fixing.

## Step 5: Performance Issues

### Symptom: Moves Take Too Long

**Check for:**
```
🎲 [FALLBACK] Search complete in 5000.00ms
```

**Cause:** Search depth is too high

**Solution:**
- Reduce commander depth in `src/game/types.ts`
- Current depths: 2600=6, 2400=5, 2200=4, 2000=3, 1800=2
- Try reducing by 1-2 levels

### Symptom: Browser Freezes

**Cause:** Infinite loop or excessive computation

**Solution:**
- Refresh the page
- Check for errors in console
- Reduce search depths further

## Step 6: Share Debug Information

If the problem persists, copy these logs and share them:

1. **Startup logs:**
```
🚀 [AUTO-PLAY] Starting auto-play setup
🚀 [AUTO-PLAY] Initial eval: [value]
🚀 [AUTO-PLAY] Game FEN: [fen]
🚀 [AUTO-PLAY] Game is game over? [true/false]
🚀 [AUTO-PLAY] Legal moves: [number]
```

2. **First few heartbeats:**
```
💓 [AUTO-PLAY] Heartbeat #1
...
💓 [AUTO-PLAY] Heartbeat #3
```

3. **Any error messages:**
```
❌ [AUTO-PLAY] ERROR in makeMove: [error]
```

4. **Interval status:**
```
⏱️ [AUTO-PLAY] Interval created, ID: [number]
```

## Visual Indicators

The UI shows auto-play status:
- **Green pulsing dot**: Auto-play is running
- **Move counter**: Shows current move number
- **Turn indicator**: Shows whose turn it is
- **Legal moves count**: Shows how many moves are available

If the green dot stops pulsing, auto-play has stopped.

## Expected Behavior

### Normal Flow:
1. Game starts → Placement phases
2. Commander draft → Both commanders selected
3. 1.5s delay → Auto-play starts
4. Every 1 second → One move is made
5. Game continues until checkmate/draw/max moves
6. Round result shown → Next round or match end

### Timing:
- **Move interval**: 1000ms (1 second)
- **Search time**: 50-500ms per move (depends on depth)
- **Total time per move**: ~1 second

If moves take longer than 2 seconds, there's a performance issue.

## Troubleshooting Checklist

- [ ] Console is open and showing logs
- [ ] Heartbeat messages are appearing every second
- [ ] No red error messages in console
- [ ] Both commanders are selected
- [ ] Interval was created (check for ID)
- [ ] Legal moves are available (>0)
- [ ] Game is not over (checkmate/draw)
- [ ] Move count < 100 (max moves)
- [ ] No "Game over" messages
- [ ] getBestMove is returning valid moves

## If All Else Fails

1. **Hard refresh**: `Ctrl+Shift+R` or `Cmd+Shift+R`
2. **Clear browser cache**: Delete cached files
3. **Try different browser**: Chrome, Firefox, Safari
4. **Check browser console for warnings**: Yellow warning messages
5. **Disable browser extensions**: Ad blockers can interfere
6. **Check network tab**: Ensure all resources loaded

## Contact Support

If the problem persists after following this guide:
1. Copy all console logs
2. Note which step failed
3. Describe what you see on screen
4. Share browser version and OS
5. Provide the debug information from Step 6
