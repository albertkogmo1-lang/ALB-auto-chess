# 快速参考指南

## ✅ 已完成的更改

### 1. 移除了指挥官选择
- 不再显示指挥官卡片
- 不再需要选择指挥官
- 直接进入自动对弈

### 2. 始终使用最大深度
- 搜索深度：6 层（固定）
- 棋力水平：约 2200-2400 ELO
- 不会故意犯错

### 3. 充足的动画时间
- 每步棋间隔：2.5 秒
- 有足够时间显示动画
- 引擎有足够时间思考

## 🎮 如何测试

### 步骤 1：打开游戏
1. 在浏览器中打开游戏
2. 按 F12 打开控制台（可选，用于调试）

### 步骤 2：开始 Bot vs Bot
1. 点击 "🤖 Bot vs Bot (Test Mode)"
2. 等待兵放置阶段（30秒）或点击 "Ready"
3. 等待棋子放置阶段（50秒）或点击 "Ready"
4. 等待棋子展示（3秒）
5. 自动对弈将在 1.5 秒后开始

### 步骤 3：观察自动对弈
- 每步棋间隔 2.5 秒
- 评估条会实时更新
- 机器人会走出高质量的棋

## 🔍 调试信息

### 正常日志（应该看到）
```
🚀 Starting auto-play
⏱️ Auto-play interval created, ID: 123 interval: 2500 ms

⏰ Interval heartbeat #1
💓 makeMove() called, move count: 0
🎯 Current commander: Engine Depth: 6
🤖 getBestMove returned: e4
📊 Eval calculated: 0

⏰ Interval heartbeat #2
💓 makeMove() called, move count: 1
...
```

### 如果遇到问题
1. 打开控制台（F12）
2. 查看是否有红色错误
3. 查看日志在哪里停止
4. 复制所有日志并告诉我

## 📊 预期行为

### 游戏流程
1. **Pawn Placement** (30秒) - 放置兵
2. **Pawn Reveal** (3秒) - 展示兵
3. **Piece Placement** (50秒) - 放置棋子
4. **Piece Reveal** (3秒) - 展示棋子
5. **Auto-play** - 自动对弈（每步 2.5 秒）

### 引擎参数
- 搜索深度：6 层
- 犯错率：0%
- 攻击性：0.5（平衡）
- ELO：2600

### 评估条
- 显示材料优势
- ±25 每兵
- ±60-80 每轻子（马/象）
- ±100 每重子（车/后）

## 🐛 常见问题

### Q: 自动对弈没有开始？
A: 检查控制台日志，看是否有错误信息

### Q: 评估条一直是 0？
A: 这是正常的，如果双方材料相等

### Q: 机器人走棋很慢？
A: 这是正常的，深度 6 需要时间计算

### Q: 如何改变搜索深度？
A: 修改 `src/game/engines.ts` 第 266 行的 `MAX_DEPTH`

## 📝 代码位置

### 关键配置
- **MOVE_INTERVAL**: `src/App.tsx` 第 15 行（2500ms）
- **MAX_DEPTH**: `src/game/engines.ts` 第 266 行（6层）
- **defaultCommander**: `src/App.tsx` 第 83-94 行

### 自动对弈逻辑
- **startAutoPlay**: `src/App.tsx` 第 503 行
- **makeMove**: `src/App.tsx` 第 651 行
- **getBestMove**: `src/game/engines.ts` 第 269 行

## 🎯 下一步

如果自动对弈正常工作：
- ✅ 享受观看机器人对弈！
- ✅ 观察评估条的变化
- ✅ 查看机器人的高质量着法

如果自动对弈不工作：
1. 打开控制台（F12）
2. 复制所有日志
3. 告诉我日志在哪里停止
4. 我会帮你解决问题

## 📚 相关文档

- `COMPLETED_CHANGES.md` - 详细的更改总结
- `DEBUG_AUTOPLAY.md` - 调试指南
- `THREE_ENGINE_ARCHITECTURE.md` - 三引擎架构说明

---

**构建状态**: ✅ 成功
**最后更新**: 2024
**版本**: 1.0
