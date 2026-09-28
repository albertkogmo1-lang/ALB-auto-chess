# Debugging Guide: Auto-Play Not Moving

## Problem
After implementing the 3-engine architecture, auto-play stopped working. The bots are not making moves.

## Solution: Added Comprehensive Logging

I've added detailed console logging throughout the auto-play system to identify exactly where the issue is occurring.

## How to Debug

### Step 1: Open Browser Console
1. Press `F12` or right-click → Inspect → Console tab
2. Clear the console (click the 🚫 icon)

### Step 2: Start a Bot vs Bot Game
1. Click "🤖 Bot vs Bot (Test Mode)"
2. Watch the console for log messages

### Step 3: Check These Log Messages

You should see these messages in sequence:

#### Phase 1: Commander Selection
```
🎯 Auto-play useEffect triggered {phase: 'commander-draft', white: 'The Legend', black: 'The Advanced'}
✅ Both commanders selected, starting auto-play in 1.5s
```

**If you DON'T see this:**
- The useEffect is not triggering
- Check if both commanders are actually selected
- Check if phase is 'commander-draft'

#### Phase 2: Timeout Fires
```
⏰ Timeout fired, calling startAutoPlay()
🚀 startAutoPlay() called
=== START AUTO PLAY ===
```

**If you see Phase 1 but NOT Phase 2:**
- The 1.5s timeout is not firing
- The component might be unmounting before the timeout
- Check for React strict mode double-rendering issues

#### Phase 3: Auto-Play Setup
```
🚀 Starting auto-play
⏱️ Auto-play interval created, ID: [number] interval: 1000 ms
```

**If you see Phase 2 but NOT Phase 3:**
- startAutoPlay() is being called but failing
- Check for errors in the console
- The function might be throwing an exception

#### Phase 4: Move Execution
```
💓 makeMove() called, move count: 0
🎯 Current commander: The Legend ELO: 2600
🤖 getBestMove called for The Legend ELO: 2600
📊 Legal moves: 20
✅ getBestMove returning: e4
🤖 getBestMove returned: e4
```

**If you see Phase 3 but NOT Phase 4:**
- The interval is not firing
- setInterval might not be working
- Check if MOVE_INTERVAL is defined correctly

**If you see Phase 4 but getBestMove returns 'null':**
- getBestMove() is failing
- Check for errors in the engines.ts file
- The minimax function might be throwing an exception

#### Phase 5: Repeated Moves
```
💓 makeMove() called, move count: 1
💓 makeMove() called, move count: 2
💓 makeMove() called, move count: 3
...
```

**If you only see Phase 4 once:**
- The interval is only firing once
- Then stopping
- Check if makeMove() is throwing an exception
- Check if the interval is being cleared prematurely

## Common Issues and Solutions

### Issue 1: No Logs at All
**Symptom:** Console is completely empty
**Cause:** The game never reaches the commander-draft phase
**Solution:** 
- Check if the game is actually starting
- Verify the placement phases are completing
- Check if commanders are being selected

### Issue 2: Logs Stop at Phase 2
**Symptom:** See "starting auto-play in 1.5s" but nothing after
**Cause:** Component unmounts before timeout fires
**Solution:**
- This is a React lifecycle issue
- The useEffect cleanup is clearing the timeout
- Need to ensure the component stays mounted

### Issue 3: Logs Stop at Phase 3
**Symptom:** See "Auto-play interval created" but no makeMove() calls
**Cause:** setInterval is not working
**Solution:**
- Check if MOVE_INTERVAL is defined
- Verify it's a valid number (should be 1000)
- Check if there's a JavaScript error preventing execution

### Issue 4: makeMove() Called Once Then Stops
**Symptom:** See "💓 makeMove() called, move count: 0" once, then nothing
**Cause:** makeMove() is throwing an exception
**Solution:**
- Check the console for red error messages
- The exception is killing the interval
- Need to add try-catch around makeMove()

### Issue 5: getBestMove Returns Null
**Symptom:** See "🤖 getBestMove returned: null"
**Cause:** getBestMove() is failing
**Solution:**
- Check for errors in engines.ts
- The minimax function might be in an infinite loop
- The evaluation function might be throwing

## Quick Fix: Add Error Handling

If makeMove() is throwing an exception, add this wrapper:

```typescript
const makeMove = () => {
  try {
    console.log('💓 makeMove() called, move count:', movesRef.count);
    // ... existing code ...
  } catch (error) {
    console.error('❌ makeMove() error:', error);
    console.error('Stack:', error.stack);
  }
};
```

## Expected Behavior

When working correctly, you should see:

1. **Initial setup logs** (Phases 1-3)
2. **First move logs** (Phase 4)
3. **Repeated move logs** (Phase 5) every 1 second
4. **Move count incrementing**: 0, 1, 2, 3, 4, ...
5. **Board updating** after each move
6. **Eval bar updating** after each move

## Next Steps

1. Run the game with console open
2. Copy all the log messages
3. Identify where the logs stop
4. Report which phase is failing
5. I'll provide a targeted fix based on the failure point

## Files Modified

- `src/App.tsx` - Added logging to auto-play system
- `src/game/engines.ts` - Added logging to getBestMove()

## Build Status
✅ Build successful
