# 紧急调试指南：自动对弈不工作 + 评估条不变

## 问题
1. 自动对弈不工作（机器人不走棋）
2. 评估条一直显示相等（不变化）

## 已添加的调试日志

我已经添加了全面的控制台日志来追踪整个流程。现在请按照以下步骤操作：

## 🔍 调试步骤

### 第1步：打开浏览器控制台
1. 按 `F12` 键
2. 点击 "Console"（控制台）标签
3. 点击 🚫 图标清空控制台

### 第2步：开始 Bot vs Bot 游戏
1. 点击 "🤖 Bot vs Bot (Test Mode)"
2. 等待游戏开始

### 第3步：观察控制台日志

你应该看到以下日志序列：

#### ✅ 正常流程（应该看到的日志）：

```
🎯 Auto-play useEffect triggered {phase: 'commander-draft', white: 'The Legend', black: 'The Advanced'}
✅ Both commanders selected, starting auto-play in 1.5s
⏰ Timeout fired, calling startAutoPlay()
🚀 startAutoPlay() called
=== START AUTO PLAY ===
🚀 Starting auto-play
⏱️ Auto-play interval created, ID: 123 interval: 1000 ms

⏰ Interval heartbeat #1
💓 makeMove() called, move count: 0
🎯 Current commander: The Legend ELO: 2600
🤖 getBestMove called for The Legend ELO: 2600
📊 Legal moves: 20
✅ getBestMove returning: e4
🤖 getBestMove returned: e4
📊 getEvalForPosition called with FEN: rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR...
📊 Material score: 0 Normalized eval: 0
📊 Eval calculated: 0

⏰ Interval heartbeat #2
💓 makeMove() called, move count: 1
...
```

#### ❌ 异常流程（问题所在）：

**情况A：没有看到 "⏰ Interval heartbeat"**
- 问题：setInterval 没有触发
- 原因：可能是 React 组件重新渲染导致 interval 被清除

**情况B：看到 "⏰ Interval heartbeat" 但没有 "💓 makeMove() called"**
- 问题：makeMove 函数内部出错
- 查看是否有红色的错误信息

**情况C：看到 "💓 makeMove() called" 但没有 "🤖 getBestMove returned"**
- 问题：getBestMove 抛出异常
- 查看是否有红色的错误信息

**情况D：看到 "❌ makeMove() error:"**
- 问题：makeMove 内部发生错误
- 查看错误详情和堆栈跟踪

**情况E：看到 "📊 Material score: 0" 一直是 0**
- 问题：评估函数没有正确计算
- 可能是 FEN 格式有问题

## 📋 请提供以下信息

请复制控制台中**所有**的日志信息（从游戏开始到最后一条日志），然后告诉我：

1. **你看到了哪些日志？**（复制粘贴所有日志）
2. **日志在哪里停止了？**（最后一条日志是什么？）
3. **有没有红色的错误信息？**（如果有，复制错误信息）

## 🎯 常见错误及解决方案

### 错误1："Cannot read property 'x' of undefined"
**原因：** 访问了未定义的属性
**解决：** 检查 getBestMove 返回值是否为 null

### 错误2："Maximum call stack size exceeded"
**原因：** minimax 递归太深导致栈溢出
**解决：** 减少搜索深度或添加递归限制

### 错误3："Invalid FEN"
**原因：** FEN 字符串格式错误
**解决：** 检查 buildFenFromPlacement 函数

### 错误4：Interval heartbeat 只出现一次
**原因：** makeMove 抛出异常导致 interval 停止
**解决：** 查看错误信息并修复

## 🔧 快速修复尝试

如果问题持续，请尝试以下操作：

1. **硬刷新页面**：`Ctrl + Shift + R` (Windows/Linux) 或 `Cmd + Shift + R` (Mac)
2. **清除浏览器缓存**
3. **尝试不同的浏览器**（Chrome、Firefox、Edge）
4. **检查浏览器控制台是否有其他错误**

## 📊 评估条问题

如果评估条一直显示 0 或不变：

1. 检查是否看到 "📊 getEvalForPosition called" 日志
2. 检查 "📊 Material score" 是否为 0
3. 如果 material score 一直是 0，说明棋盘上没有棋子或 FEN 有问题
4. 检查 "📊 Eval calculated" 的值

## 🚀 下一步

请提供完整的控制台日志，我将根据日志内容精确定位问题并提供修复方案。

**重要：** 请确保复制从游戏开始到最后一条日志的所有内容，这样我才能看到完整的执行流程。
