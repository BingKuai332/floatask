# 前哨 · 工业主题与工具栏吸附修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复胶囊工具栏的吸附收放问题，并新增第三个深色主题「前哨 · 工业」（ID `industrial`），视觉以 `design-mockups/industrial/qianshao-mockup.html` 为准。

**Architecture:** 工具栏改为"锚点"模型：吸附时记住半胶囊的位置，展开从锚点算，收回回到锚点。主题沿用 token 管线：`design-tokens.yaml` → `scripts/build-theme.js` → `theme.css`，每个主题都输出形状 token（`--fa-corner-shape` + 半径），前哨用 `bevel`；工业装饰集中在只对 `[data-theme="industrial"]` 生效的 `ornaments.css`；微标签只填真实数据。

**Tech Stack:** Electron 45.1.0（Chromium 156，支持 `corner-shape`）、原生 HTML/CSS/JS、`node:test`、`yaml`。

**规范来源：** `docs/superpowers/specs/2026-11-03-qianshao-industrial-theme-design.md`。实现与规范冲突时以规范为准，先停下来报告。

**通用命令（在 `D:\FloatAsk\FloatAsk` 执行）：**
- 单测：`node --test tests/<file>.test.js`
- 全部测试（含 Electron 冒烟）：`npm test`
- 重新生成主题：`npm run build:tokens`；校验：`node scripts/build-theme.js --check`

---

## 文件结构

| 文件 | 责任 | 动作 |
| --- | --- | --- |
| `src/main/window-geometry.js` | 工具栏纯几何：锚点、展开、收回、校验 | 修改 |
| `src/main/main.js` | 工具栏状态机、主题广播、首字耗时、会话 ID | 修改 |
| `src/main/store.js` | 配置：`bubbleDock`、主题白名单 | 修改 |
| `src/main/theme-preference.js` | 主题偏好的纯函数（白名单、原生主题源、解析） | 新建 |
| `src/main/history.js` | 导出 `newHistoryId()` | 修改 |
| `src/renderer/bubble.js` / `bubble.css` | 下发 `data-edge`，收起动画朝锚点 | 修改 |
| `design-mockups/graphite-system/design-tokens.yaml` | 1.5.0：前哨主题、形状、装饰 token | 修改 |
| `scripts/build-theme.js` | 输出主题形状与装饰变量、forced-colors 覆盖 | 修改 |
| `src/renderer/theme.css` | 生成物 | 重新生成 |
| `src/renderer/theme.js` | `resolveTheme` 接受 `industrial` | 修改 |
| `src/renderer/ornaments.css` | 前哨装饰层 | 新建 |
| `src/shared/short-hash.js` | 会话短哈希（主进程与渲染进程共用） | 新建 |
| 7 个 `src/renderer/*.html` | 引入 `ornaments.css`；result / history 引入 `short-hash.js` | 修改 |
| `src/renderer/result.*`、`history.*`、`settings.*`、`bubble.css` | 圆角 token 化、微标签、主题卡 | 修改 |
| `src/shared/i18n.js` | `theme.industrial` 文案 | 修改 |
| `tests/*.test.js` | 见各任务 | 修改 / 新建 |
| `design-mockups/graphite-system/IMPLEMENTATION_SPEC.md`、`design-mockups/README.md`、`README.md` | 文档同步 | 修改 |

任务顺序：0 → 1–3（工具栏修复）→ 4–9（主题）→ 10（文档）→ 11（验收）。任务 5 必须在任务 7 之前（都改 `settings.css`，任务 5 按行号操作）。

---

### Task 0: 准备工作区

**Files:** 无代码改动。

- [ ] **Step 1: 确认未提交改动的去向**

Run: `git status --short`
Expected: 约 19 个已修改文件 + 若干未跟踪文件（`src/main/hover-state.js` 等）。这些是之前未提交的工作，与本计划的 `main.js`、`window-geometry.js`、`bubble.*`、`settings.*` 重叠。**停下来询问用户**：是先提交这批改动，还是在其之上继续。未获答复前不要继续。根目录的 `tatus --short` 文件同样询问用户是否删除。

- [ ] **Step 2: 新建分支**

```bash
git switch -c feat/industrial-theme
```

- [ ] **Step 3: 基线测试**

Run: `npm test`
Expected: 全部通过。若失败，记录失败项并报告，不要在失败基线上开始。

---

### Task 1: 展开几何改为锚点模型，四边间距统一 8px

**Files:**
- Modify: `src/main/window-geometry.js`
- Test: `tests/window-geometry.test.js`

- [ ] **Step 1: 替换旧断言并写失败测试**

在 `tests/window-geometry.test.js` 中删除以下四个测试：`left and right edges expand vertically with the available direction`、`top and bottom edges expand horizontally away from the screen center`、`collapse keeps the edge associated with its expansion direction anchored`、`vertical expansion only goes upward when there is insufficient space below`。在文件末尾追加：

```js
const PAD = 10;
function visibleCapsule(bounds) {
  return { x: bounds.x + PAD, y: bounds.y + PAD, right: bounds.x + bounds.width - PAD, bottom: bounds.y + bounds.height - PAD };
}

test('dockAnchor places the half-capsule flush on its edge', () => {
  const floating = { x: 1500, y: 300, width: 328, height: 52 };
  assert.deepEqual(geometry.dockAnchor('right', floating, AREA), { x: 1876, y: 300, width: 44, height: 52 });
  assert.deepEqual(geometry.dockAnchor('left', floating, AREA), { x: 0, y: 300, width: 44, height: 52 });
  assert.deepEqual(geometry.dockAnchor('bottom', { x: 1700, y: 1020, width: 328, height: 52 }, AREA), { x: 1700, y: 1036, width: 64, height: 44 });
  assert.deepEqual(geometry.dockAnchor('top', { x: 200, y: 4, width: 328, height: 52 }, AREA), { x: 200, y: 0, width: 64, height: 44 });
});

test('dockedWindowBounds adds the shadow padding around the anchor', () => {
  assert.deepEqual(geometry.dockedWindowBounds({ x: 1876, y: 300, width: 44, height: 52 }, PAD), { x: 1866, y: 290, width: 64, height: 72 });
});

test('expansion grows from the anchor and keeps an 8 DIP gap on every edge', () => {
  const left = geometry.expansionPlacement('left', { x: 0, y: 100, width: 44, height: 52 }, AREA, PAD);
  assert.deepEqual(left, { axis: 'vertical', direction: 'down', bounds: { x: -2, y: 90, width: 72, height: 348 } });
  const right = geometry.expansionPlacement('right', { x: 1876, y: 800, width: 44, height: 52 }, AREA, PAD);
  assert.deepEqual(right, { axis: 'vertical', direction: 'up', bounds: { x: 1850, y: 514, width: 72, height: 348 } });
  const top = geometry.expansionPlacement('top', { x: 200, y: 0, width: 64, height: 44 }, AREA, PAD);
  assert.deepEqual(top, { axis: 'horizontal', direction: 'right', bounds: { x: 190, y: -2, width: 348, height: 72 } });
  const bottom = geometry.expansionPlacement('bottom', { x: 1600, y: 1036, width: 64, height: 44 }, AREA, PAD);
  assert.deepEqual(bottom, { axis: 'horizontal', direction: 'left', bounds: { x: 1326, y: 1010, width: 348, height: 72 } });

  assert.equal(visibleCapsule(left.bounds).x - AREA.x, 8);
  assert.equal(AREA.x + AREA.width - visibleCapsule(right.bounds).right, 8);
  assert.equal(visibleCapsule(top.bounds).y - AREA.y, 8);
  assert.equal(AREA.y + AREA.height - visibleCapsule(bottom.bounds).bottom, 8);
});

test('upward and leftward expansion stays aligned with the anchor end', () => {
  const anchorR = { x: 1876, y: 800, width: 44, height: 52 };
  const up = visibleCapsule(geometry.expansionPlacement('right', anchorR, AREA, PAD).bounds);
  assert.equal(up.bottom, anchorR.y + anchorR.height);
  const anchorB = { x: 1600, y: 1036, width: 64, height: 44 };
  const left = visibleCapsule(geometry.expansionPlacement('bottom', anchorB, AREA, PAD).bounds);
  assert.equal(left.right, anchorB.x + anchorB.width);
});

test('vertical expansion only goes upward when there is insufficient space below', () => {
  assert.equal(geometry.expansionPlacement('right', { x: 1876, y: 560, width: 44, height: 52 }, AREA, PAD).direction, 'down');
  assert.equal(geometry.expansionPlacement('right', { x: 1876, y: 800, width: 44, height: 52 }, AREA, PAD).direction, 'up');
});

test('repeated expand and collapse cycles never move the dock', () => {
  for (const [edge, anchor] of [
    ['right', { x: 1876, y: 900, width: 44, height: 52 }],
    ['bottom', { x: 1700, y: 1036, width: 64, height: 44 }],
    ['left', { x: 0, y: 300, width: 44, height: 52 }],
    ['top', { x: 1800, y: 0, width: 64, height: 44 }]
  ]) {
    const original = geometry.dockedWindowBounds(anchor, PAD);
    for (let i = 0; i < 3; i++) {
      geometry.expansionPlacement(edge, anchor, AREA, PAD);
      assert.deepEqual(geometry.dockedWindowBounds(anchor, PAD), original, `${edge} cycle ${i + 1}`);
    }
  }
});

test('sanitizeDock accepts only a known edge with a finite anchor', () => {
  assert.deepEqual(geometry.sanitizeDock({ edge: 'left', anchor: { x: 0.4, y: 300, width: 44, height: 52 } }), { edge: 'left', anchor: { x: 0, y: 300, width: 44, height: 52 } });
  assert.equal(geometry.sanitizeDock({ edge: 'middle', anchor: { x: 0, y: 0, width: 1, height: 1 } }), null);
  assert.equal(geometry.sanitizeDock({ edge: 'top', anchor: { x: 'a', y: 0, width: 1, height: 1 } }), null);
  assert.equal(geometry.sanitizeDock(null), null);
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/window-geometry.test.js`
Expected: FAIL，`geometry.dockAnchor is not a function` 等。

- [ ] **Step 3: 实现**

在 `src/main/window-geometry.js` 中：在 `HALF_CAPSULE_HORIZONTAL` 下方加 `const SHADOW_PADDING = 10;`；用下面的代码整体替换 `expansionPlacement` 和 `collapseStartBounds` 两个函数；更新 `module.exports`（删去 `collapseStartBounds`，加入新函数与 `SHADOW_PADDING`）。

```js
const DOCK_EDGES = ['left', 'right', 'top', 'bottom'];

function halfCapsuleSize(edge) {
  return edge === 'left' || edge === 'right'
    ? { width: HALF_CAPSULE_VERTICAL[0], height: HALF_CAPSULE_VERTICAL[1] }
    : { width: HALF_CAPSULE_HORIZONTAL[0], height: HALF_CAPSULE_HORIZONTAL[1] };
}

/** Half-capsule bounds (visible, no padding) flush on `edge`, keeping the along-edge coordinate of `capsule`. */
function dockAnchor(edge, capsule, workArea) {
  const size = halfCapsuleSize(edge);
  const anchors = {
    left: { x: workArea.x, y: capsule.y },
    right: { x: workArea.x + workArea.width - size.width, y: capsule.y },
    top: { x: capsule.x, y: workArea.y },
    bottom: { x: capsule.x, y: workArea.y + workArea.height - size.height }
  };
  return clampToWorkArea({ ...anchors[edge], ...size }, workArea);
}

/** Window bounds for a docked half-capsule: the anchor plus the transparent shadow padding. */
function dockedWindowBounds(anchor, padding = SHADOW_PADDING) {
  return { x: anchor.x - padding, y: anchor.y - padding, width: anchor.width + padding * 2, height: anchor.height + padding * 2 };
}

/**
 * Expanded window bounds for a docked capsule. The capsule grows from the
 * anchor (down/right when there is room, otherwise up/left from the anchor's
 * far end) and sits EXPANDED_EDGE_GAP DIP off its edge on all four sides.
 */
function expansionPlacement(edge, anchor, workArea, padding = SHADOW_PADDING) {
  const [length, thickness] = CAPSULE_EXPANDED;
  const vertical = edge === 'left' || edge === 'right';
  const axis = vertical ? 'vertical' : 'horizontal';
  const areaRight = workArea.x + workArea.width;
  const areaBottom = workArea.y + workArea.height;
  const direction = vertical
    ? (anchor.y + length + EXPANDED_EDGE_GAP > areaBottom ? 'up' : 'down')
    : (anchor.x + length + EXPANDED_EDGE_GAP > areaRight ? 'left' : 'right');
  const width = (vertical ? thickness : length) + padding * 2;
  const height = (vertical ? length : thickness) + padding * 2;
  let capsuleX;
  let capsuleY;
  if (vertical) {
    capsuleX = edge === 'left' ? workArea.x + EXPANDED_EDGE_GAP : areaRight - EXPANDED_EDGE_GAP - thickness;
    capsuleY = direction === 'down' ? anchor.y : anchor.y + anchor.height - length;
  } else {
    capsuleY = edge === 'top' ? workArea.y + EXPANDED_EDGE_GAP : areaBottom - EXPANDED_EDGE_GAP - thickness;
    capsuleX = direction === 'right' ? anchor.x : anchor.x + anchor.width - length;
  }
  const paddedArea = {
    x: workArea.x - padding,
    y: workArea.y - padding,
    width: workArea.width + padding * 2,
    height: workArea.height + padding * 2
  };
  return {
    axis,
    direction,
    bounds: clampToWorkArea({ x: capsuleX - padding, y: capsuleY - padding, width, height }, paddedArea)
  };
}

/** Validate a persisted dock ({ edge, anchor }); returns null when unusable. */
function sanitizeDock(dock) {
  if (!dock || !DOCK_EDGES.includes(dock.edge)) return null;
  const a = dock.anchor || {};
  if (![a.x, a.y, a.width, a.height].every(Number.isFinite)) return null;
  return { edge: dock.edge, anchor: { x: Math.round(a.x), y: Math.round(a.y), width: Math.round(a.width), height: Math.round(a.height) } };
}
```

`module.exports` 改为：

```js
module.exports = {
  SNAP_DISTANCE,
  EXPANDED_EDGE_GAP,
  SHADOW_PADDING,
  CAPSULE_EXPANDED,
  HALF_CAPSULE_VERTICAL,
  HALF_CAPSULE_HORIZONTAL,
  clampToWorkArea,
  snapToolbar,
  edgeGapPosition,
  dockAnchor,
  dockedWindowBounds,
  expansionPlacement,
  sanitizeDock,
  translateDragBounds,
  physicalSize
};
```

- [ ] **Step 4: 运行，确认通过**

Run: `node --test tests/window-geometry.test.js`
Expected: PASS（`main.js` 此时仍引用 `collapseStartBounds`，下一任务处理，暂不运行 `npm test`）。

- [ ] **Step 5: 提交**

```bash
git add src/main/window-geometry.js tests/window-geometry.test.js
git commit -m "fix(toolbar): anchor-based expansion with an 8 DIP gap on every edge"
```

---

### Task 2: 主进程状态机使用锚点，收起动画从真实边界开始

**Files:**
- Modify: `src/main/main.js`（工具栏段落，约 15–45 行与 286–420 行、`moved` 事件处理）
- Modify: `src/renderer/bubble.js`、`src/renderer/bubble.css`

- [ ] **Step 1: 更新导入与状态**

`src/main/main.js` 顶部 `require('./window-geometry')` 改为：

```js
const {
  CAPSULE_EXPANDED,
  clampToWorkArea,
  snapToolbar,
  dockAnchor,
  dockedWindowBounds,
  expansionPlacement,
  sanitizeDock,
  translateDragBounds
} = require('./window-geometry');
```

在 `let bubbleEdge = null;` 下方加：

```js
// Docked half-capsule: { edge, anchor } in DIP, anchor = visible half-capsule bounds.
let bubbleDock = null;
```

- [ ] **Step 2: 替换 `presentBubbleBounds`、`setBubbleMode`、`finalizeBubbleDock`**

用下面的代码整体替换这三个函数：

```js
function bubbleWorkArea(rect) {
  return screen.getDisplayNearestPoint({
    x: Math.round(rect.x + rect.width / 2),
    y: Math.round(rect.y + rect.height / 2)
  }).workArea;
}

function presentBubbleBounds(target, mode) {
  clearTimeout(bubbleModeTimer);
  bubbleModeTimer = null;
  bubblePendingBounds = null;
  const reduced = systemPreferences.getAnimationSettings?.().prefersReducedMotion;
  if (!shouldDeferBounds(mode, reduced)) {
    bubbleWin.setBounds(target);
    sendBubbleMode();
    return;
  }
  // Collapse: keep the current bounds while the CSS transition shrinks the
  // capsule toward its anchor, then resize the window onto the dock.
  bubblePendingBounds = target;
  sendBubbleMode();
  bubbleModeTimer = setTimeout(() => {
    if (!bubbleWin || bubbleWin.isDestroyed() || !bubblePendingBounds) return;
    const bounds = bubblePendingBounds;
    bubblePendingBounds = null;
    bubbleModeTimer = null;
    bubbleWin.setBounds(bounds);
  }, 180);
}

/** Resize/position the bubble window for the given capsule mode. */
function setBubbleMode(mode, edge) {
  bubbleMode = mode;
  bubbleEdge = edge || null;
  if (!bubbleWin || bubbleWin.isDestroyed()) return;
  const current = bubbleWin.getBounds();
  let target;
  if (mode === 'expanded' && bubbleEdge && bubbleDock) {
    const placement = expansionPlacement(bubbleDock.edge, bubbleDock.anchor, bubbleWorkArea(bubbleDock.anchor), BUBBLE_PADDING);
    bubbleAxis = placement.axis;
    bubbleDirection = placement.direction;
    target = placement.bounds;
  } else if (mode === 'expanded') {
    bubbleDock = null;
    bubbleAxis = 'horizontal';
    bubbleDirection = 'right';
    target = { x: current.x, y: current.y, width: BUBBLE_WINDOW_EXPANDED[0], height: BUBBLE_WINDOW_EXPANDED[1] };
  } else {
    if (!bubbleDock || bubbleDock.edge !== mode) {
      const cap = capsuleBounds(current.x, current.y);
      bubbleDock = { edge: mode, anchor: dockAnchor(mode, cap, bubbleWorkArea(cap)) };
    }
    target = dockedWindowBounds(bubbleDock.anchor, BUBBLE_PADDING);
  }
  presentBubbleBounds(target, mode);
}

/** After a drag ends, snap to an edge half-capsule or stay floating expanded. */
function finalizeBubbleDock(winX, winY) {
  if (!bubbleWin || bubbleWin.isDestroyed()) return;
  const cap = capsuleBounds(winX, winY);
  const area = bubbleWorkArea(cap);
  const { edge } = snapToolbar(cap, CAPSULE, area);
  bubbleDock = edge ? { edge, anchor: dockAnchor(edge, cap, area) } : null;
  store.setBubbleDock(bubbleDock);
  if (edge) setBubbleMode(edge, edge);
  else setBubbleMode('expanded', null);
}
```

（`store.setBubbleDock` 在 Task 3 加入；本任务结束前先完成 Task 3 Step 1–3 再跑全量测试，或者先在 `store.js` 加入 Task 3 的函数。）

- [ ] **Step 3: 程序化展开不再触发吸附判定**

`ensureBubble()` 内 `bubbleWin.on('moved', ...)` 的回调中，把 `if (!bubbleDragBounds) finalizeBubbleDock(x, y);` 改为：

```js
      // Expanding from a dock is a programmatic move, not a user placement.
      if (!bubbleDragBounds && !(bubbleDock && bubbleMode === 'expanded')) finalizeBubbleDock(x, y);
```

- [ ] **Step 4: 渲染进程按吸附边收起**

`src/renderer/bubble.js` 的 `api.onBubbleMode` 回调中，在 `document.body.dataset.direction = ...` 后加：

```js
  document.body.dataset.edge = originEdge || '';
```

`src/renderer/bubble.css` 在 `body[data-mode][data-direction='right'] .bubble { margin-left: 0; }` 之后加：

```css
/* While collapsing, shrink toward the docked edge so the end frame matches the dock. */
body[data-edge='right']:not([data-mode='expanded']) .bubble { margin-left: auto; }
body[data-edge='bottom']:not([data-mode='expanded']) .bubble { margin-top: auto; }
```

- [ ] **Step 5: 检查残留引用**

Run: `git grep -n "collapseStartBounds\|HALF_CAPSULE_VERTICAL\|HALF_CAPSULE_HORIZONTAL" -- src tests`
Expected: 只剩 `src/main/window-geometry.js` 与 `tests/window-geometry.test.js` 中的常量定义和断言。`main.js` 若仍有引用，删除（已由 `dockAnchor` 取代）。

- [ ] **Step 6: 提交（与 Task 3 一起验证后）**

见 Task 3 Step 5。

---

### Task 3: 保存并恢复吸附状态

**Files:**
- Modify: `src/main/store.js`
- Modify: `src/main/main.js`（`ensureBubble`）
- Test: `tests/window-geometry.test.js`（已在 Task 1 覆盖 `sanitizeDock`）

- [ ] **Step 1: store 字段**

`src/main/store.js`：
- 顶部加 `const { sanitizeDock } = require('./window-geometry');`
- 默认配置 `bubblePosition: null,` 下一行加 `bubbleDock: null,`
- 在 `save()` 处理 `bubblePosition` 的 `if / else if` 之后加：

```js
  if (Object.prototype.hasOwnProperty.call(patch, 'bubbleDock')) next.bubbleDock = sanitizeDock(patch.bubbleDock);
```

- 在 `setBubblePosition` 下方加，并加入 `module.exports`：

```js
function setBubbleDock(dock) {
  save({ bubbleDock: dock || null });
}
```

- [ ] **Step 2: 启动时恢复**

`src/main/main.js` 的 `ensureBubble()` 中，把 `await bubbleWin.loadFile(...)` 之后的 `sendBubbleMode();` 替换为：

```js
  const savedDock = sanitizeDock(store.getConfig().bubbleDock);
  if (savedDock) {
    // Re-snap to the current display so resolution or layout changes stay flush.
    bubbleDock = { edge: savedDock.edge, anchor: dockAnchor(savedDock.edge, savedDock.anchor, bubbleWorkArea(savedDock.anchor)) };
    bubbleMode = savedDock.edge;
    bubbleEdge = savedDock.edge;
    bubbleWin.setBounds(dockedWindowBounds(bubbleDock.anchor, BUBBLE_PADDING));
  }
  sendBubbleMode();
```

- [ ] **Step 3: 拖离边缘时清除**

`finalizeBubbleDock` 已在浮动时写入 `null`（Task 2）。无需额外代码。

- [ ] **Step 4: 运行全部测试**

Run: `npm test`
Expected: PASS。若 `tests/electron-smoke.js` 中有断言依赖旧的展开坐标（例如右边间距 18），把期望值改为 8 DIP 间距，并在提交说明中写明。

- [ ] **Step 5: 实机核对并提交**

Run: `npm run dev`，手动操作：把工具栏拖到右边靠下（距底部小于 400 DIP）→ 悬停展开 → 移开收回，重复 3 次；底边靠右同样操作；四边各看一次展开后与屏幕边的间距；重启应用确认仍为半胶囊。
Expected: 半胶囊位置不变，四边间距一致，收起动画无跳动，重启后保持吸附。

```bash
git add src/main/main.js src/main/store.js src/renderer/bubble.js src/renderer/bubble.css tests
git commit -m "fix(toolbar): collapse back to the remembered dock and persist it across restarts"
```

---

### Task 4: token 1.5.0 与生成器支持主题形状、装饰

**Files:**
- Modify: `design-mockups/graphite-system/design-tokens.yaml`
- Modify: `scripts/build-theme.js`
- Modify: `tests/design-tokens.test.js`
- Create: `tests/industrial-contrast.test.js`
- Regenerate: `src/renderer/theme.css`

- [ ] **Step 1: 写失败测试**

`tests/design-tokens.test.js`：
- 第一个测试的版本正则改为 `/^1\.5\.\d+$/`，theme id 断言改为 `['dark', 'industrial', 'light', 'system']`，并加 `assert.ok(tokens.themes.industrial, 'industrial theme present');`
- 追加：

```js
test('every theme block emits its corner shape and radius scale', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const css = renderTheme(loadTokens(tokensPath));
  const block = (id) => css.match(new RegExp(`\\[data-theme="${id}"\\]\\s*\\{([^}]*)\\}`))[1];
  assert.match(block('dark'), /--fa-corner-shape:\s*round;/);
  assert.match(block('light'), /--fa-corner-shape:\s*round;/);
  assert.match(block('light'), /--fa-radius-window:\s*16px;/);
  const industrial = block('industrial');
  assert.match(industrial, /color-scheme:\s*dark;/);
  assert.match(industrial, /--fa-corner-shape:\s*bevel;/);
  assert.match(industrial, /--fa-radius-container:\s*10px;/);
  assert.match(industrial, /--fa-radius-control:\s*7px;/);
  assert.match(industrial, /--fa-accent:\s*#FFE400\b/);
  assert.match(industrial, /--fa-border-accent-line:\s*#FFE40080\b/);
  assert.match(industrial, /--fa-grid-line:\s*#FFFFFF14;/);
  assert.match(industrial, /--fa-hazard:\s*repeating-linear-gradient\(45deg, #FFE400 0 4px, #141414 4px 8px\);/);
  assert.match(industrial, /--fa-font-label:\s*var\(--fa-font-code\);/);
  assert.match(css, /:root \{[^}]*--fa-corner-shape:\s*round;/);
  assert.match(css, /--fa-toolbar-logo-radius:\s*16px;/);
});

test('forced colors cover the industrial theme and drop its ornaments', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const css = renderTheme(loadTokens(tokensPath));
  const block = css.match(/@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/)[1];
  assert.match(block, /\[data-theme="industrial"\]/);
  assert.match(block, /--fa-hazard:\s*none;/);
  assert.match(block, /--fa-grid-line:\s*transparent;/);
});

test('base layer applies the theme corner shape to every element', () => {
  const { loadTokens, renderTheme } = loadBuildTheme();
  const css = renderTheme(loadTokens(tokensPath));
  assert.match(css, /\*, \*::before, \*::after \{ corner-shape: var\(--fa-corner-shape, round\); \}/);
});
```

新建 `tests/industrial-contrast.test.js`：

```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadTokens } = require('../scripts/build-theme');

const tokens = loadTokens(path.join(__dirname, '..', 'design-mockups', 'graphite-system', 'design-tokens.yaml'));
const c = tokens.themes.industrial.colors;

function lum(hex) {
  const n = hex.replace('#', '').slice(0, 6);
  const ch = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255)
    .map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function ratio(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

const pairs = [
  ['text', 'surface', 4.5], ['body', 'surface', 4.5], ['muted', 'surface', 4.5], ['faint', 'surface', 4.5],
  ['body', 'surface2', 4.5], ['muted', 'surface2', 4.5], ['accent', 'surface', 4.5], ['onPrimary', 'primaryButton', 4.5],
  ['red', 'redSoft', 4.5], ['green', 'surface', 3], ['text', 'accentSoft', 4.5]
];

for (const [fg, bg, min] of pairs) {
  test(`industrial ${fg} on ${bg} meets ${min}:1`, () => {
    assert.ok(ratio(c[fg], c[bg]) >= min, `${fg}/${bg} = ${ratio(c[fg], c[bg]).toFixed(2)}`);
  });
}
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/design-tokens.test.js tests/industrial-contrast.test.js`
Expected: FAIL（版本、主题 ID、缺少 industrial）。

- [ ] **Step 3: 更新 YAML**

`design-tokens.yaml`：`version: 1.5.0`，`updated: 2026-11-03`；`themeIds` 加 `industrial: 前哨 · 工业`；在 `themes.light` 之后加：

```yaml
  industrial:
    label: 前哨 · 工业
    colorScheme: dark
    colors:
      bg: "#0F1012"
      surface: "#17181A"
      surface2: "#1F2023"
      surface3: "#27292C"
      divider: "#2E3034"
      text: "#ECECE7"
      body: "#CFCFC9"
      muted: "#9C9D98"
      faint: "#8E8F8A"
      accent: "#FFE400"
      accentSoft: "#2E2C17"
      green: "#7FCB98"
      red: "#FF6A55"
      redSoft: "#2E1C1A"
      primaryButton: "#FFE400"
      onPrimary: "#141414"
      overlay: "#050607C2"
    borders:
      floating: {width: 1, color: "#FFFFFF24"}
      control: {width: 1, color: "#FFFFFF17"}
      active: {width: 1, color: "#FFE400B3"}
      danger: {width: 1, color: "#FF6A5566"}
      accentLine: {width: 1, color: "#FFE40080"}
    shadows:
      floating: {blur: 6, color: "#00000080", offset: [0, 2]}
      toolbar: {blur: 6, color: "#00000080", offset: [0, 2]}
    shape:
      cornerShape: bevel
      radius: {window: 16, container: 10, control: 7, small: 5, media: 6, compact: 5, mini: 3}
    ornaments:
      gridLine: "#FFFFFF14"
      gridSize: 14
      overlayGridSize: 24
      hazardA: "#FFE400"
      hazardB: "#141414"
```

`accessibility` 下加：

```yaml
  industrialOnSurface:
    text: 14.99
    body: 11.35
    muted: 6.51
    accent: 13.83
  industrialOnPrimary: 14.34
```

`accessibility.sharedGeometryRule` 改为：`所有主题共享尺寸、布局与组件状态；朝日／近月共享圆角，前哨通过 shape 覆盖圆角与切角形状。`

- [ ] **Step 4: 更新生成器**

`scripts/build-theme.js`：

1. `loadTokens` 的数值校验循环之后加：

```js
  for (const [id, theme] of Object.entries(tokens.themes)) {
    for (const [name, value] of Object.entries(theme.shape?.radius || {})) {
      if (!Number.isFinite(value)) throw new Error(`design-tokens.yaml: themes.${id}.shape.radius.${name} must be a finite number`);
    }
  }
```

2. `themeBlock(id, theme, extraSelector)` 签名改为 `themeBlock(id, theme, extraSelector, tokens)`，`color-scheme` 行改为 ``lines.push(`  color-scheme: ${theme.colorScheme || id};`);``，并在投影循环之后、别名之前加：

```js
  const radiusScale = ['window', 'container', 'control', 'small', 'media', 'compact', 'mini'];
  const radius = { ...Object.fromEntries(radiusScale.map(name => [name, tokens.radius[name]])), ...(theme.shape?.radius || {}) };
  lines.push(`  --fa-corner-shape: ${theme.shape?.cornerShape || 'round'};`);
  for (const name of radiusScale) lines.push(`  --fa-radius-${kebab(name)}: ${radius[name]}px;`);
  if (theme.ornaments) {
    const o = theme.ornaments;
    lines.push(`  --fa-grid-line: ${o.gridLine};`);
    lines.push(`  --fa-grid-size: ${o.gridSize}px;`);
    lines.push(`  --fa-overlay-grid-size: ${o.overlayGridSize}px;`);
    lines.push(`  --fa-hazard: repeating-linear-gradient(45deg, ${o.hazardA} 0 4px, ${o.hazardB} 4px 8px);`);
    lines.push('  --fa-font-label: var(--fa-font-code);');
  }
```

3. `systemMedia()` 改为 `systemMedia(themeIds)`，选择器由 `themeIds.map(id => `[data-theme="${id}"]`)` 生成（保留 `:root`），并在块内追加：

```css
    --fa-border-accent-line: Highlight;
    --fa-hazard: none;
    --fa-grid-line: transparent;
```

4. `:root` 段在 `--fa-radius-pill: 999px;` 后加 `--fa-corner-shape: round;`，在组件几何中 `--fa-toolbar-primary-radius` 后加 `--fa-toolbar-logo-radius: ${c.toolbar.collapsedLogoRadius}px;`。

5. base 段在 `* { box-sizing: border-box; }` 下一行加：

```css
*, *::before, *::after { corner-shape: var(--fa-corner-shape, round); }
```

6. `renderTheme` 末尾的数组改为：

```js
  const themeIds = Object.keys(tokens.themes);
  return [header, root, themeBlock('dark', tokens.themes.dark, ':root', tokens), themeBlock('light', tokens.themes.light, null, tokens), themeBlock('industrial', tokens.themes.industrial, null, tokens), systemMedia(themeIds), base, ''].join('\n\n');
```

- [ ] **Step 5: 生成并运行测试**

Run: `npm run build:tokens && node --test tests/design-tokens.test.js tests/industrial-contrast.test.js`
Expected: PASS。再运行 `node --test tests/window-geometry.test.js`（含 token 对账）确认 PASS。

- [ ] **Step 6: 提交**

```bash
git add design-mockups/graphite-system/design-tokens.yaml scripts/build-theme.js src/renderer/theme.css tests/design-tokens.test.js tests/industrial-contrast.test.js
git commit -m "feat(tokens): 1.5.0 adds the industrial theme with per-theme shape and ornament tokens"
```

---

### Task 5: 写死的圆角改为 token

**Files:**
- Modify: `src/renderer/settings.css`、`src/renderer/bubble.css`
- Create: `tests/radius-tokens.test.js`

- [ ] **Step 1: 写失败测试**

```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'src', 'renderer');

test('component CSS uses radius tokens instead of literal px values above 2px', () => {
  const offenders = [];
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.css') && f !== 'theme.css')) {
    fs.readFileSync(path.join(dir, file), 'utf8').split('\n').forEach((line, i) => {
      const decl = line.match(/border-radius:\s*([^;}]*)/);
      if (!decl) return;
      const literal = decl[1].replace(/var\([^)]*\)|calc\([^)]*\)/g, '').match(/\b([3-9]|\d{2,})px/);
      if (literal) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, []);
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/radius-tokens.test.js`
Expected: FAIL，列出 `settings.css` 12 行与 `bubble.css` 1 行。

- [ ] **Step 3: 替换**

运行一次性脚本（不提交）。它按行号校验原文后替换，原文不符即报错停止：

```bash
node -e "
const fs=require('fs');
const edits={'src/renderer/settings.css':[[32,'8px','var(--fa-radius-small)'],[180,'5px','var(--fa-radius-mini)'],[200,'999px','var(--fa-radius-pill)'],[233,'8px','var(--fa-radius-small)'],[246,'9px','var(--fa-radius-media)'],[262,'7px','var(--fa-radius-compact)'],[267,'6px','var(--fa-radius-compact)'],[296,'7px','var(--fa-radius-compact)'],[345,'15px','calc(var(--fa-radius-window) - 1px)'],[453,'5px','var(--fa-radius-mini)'],[472,'5px','var(--fa-radius-mini)'],[532,'4px','var(--fa-radius-mini)']],'src/renderer/bubble.css':[[185,'16px','var(--fa-toolbar-logo-radius)']]};
for(const [file,list] of Object.entries(edits)){const lines=fs.readFileSync(file,'utf8').split('\n');for(const [n,from,to] of list){const i=n-1;const needle='border-radius: '+from;if(!lines[i].includes(needle))throw new Error(file+':'+n+' expected '+needle+' got '+lines[i]);lines[i]=lines[i].replace(needle,'border-radius: '+to);}fs.writeFileSync(file,lines.join('\n'));}
console.log('ok');"
```

Expected: 输出 `ok`。说明：原先 6px / 4px 的两处分别并入 compact 7 / mini 5（规范 1.4.3 已登记的刻度），朝日 / 近月视觉差 1px。

- [ ] **Step 4: 运行测试**

Run: `node --test tests/radius-tokens.test.js && npm test`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/renderer/settings.css src/renderer/bubble.css tests/radius-tokens.test.js
git commit -m "refactor(css): route remaining literal radii through tokens"
```

---

### Task 6: 主题偏好接受 `industrial`

**Files:**
- Create: `src/main/theme-preference.js`、`tests/theme-preference.test.js`
- Modify: `src/main/store.js:112-113`、`src/main/main.js`（`resolvedTheme`、`broadcastTheme`、`settings:preview-theme`）、`src/renderer/theme.js`、`src/renderer/settings.js`（`resolvePreviewTheme`）
- Test: `tests/theme-runtime.test.js`

- [ ] **Step 1: 写失败测试**

`tests/theme-preference.test.js`：

```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const pref = require('../src/main/theme-preference');

test('industrial is a valid saved preference', () => {
  assert.deepEqual(pref.THEME_PREFERENCES, ['system', 'light', 'dark', 'industrial']);
  assert.equal(pref.normalizeThemePreference('industrial'), 'industrial');
  assert.equal(pref.normalizeThemePreference('neon'), 'system');
});

test('industrial drives native chrome as dark', () => {
  assert.equal(pref.nativeThemeSource('industrial'), 'dark');
  assert.equal(pref.nativeThemeSource('dark'), 'dark');
  assert.equal(pref.nativeThemeSource('light'), 'light');
  assert.equal(pref.nativeThemeSource('system'), 'system');
});

test('system still resolves only to light or dark', () => {
  assert.equal(pref.resolveThemeId('industrial', false), 'industrial');
  assert.equal(pref.resolveThemeId('system', true), 'dark');
  assert.equal(pref.resolveThemeId('system', false), 'light');
});
```

`tests/theme-runtime.test.js` 追加：

```js
test('resolveTheme keeps an explicit industrial preference', () => {
  assert.equal(theme.resolveTheme('industrial', false), 'industrial');
  assert.equal(theme.resolveTheme('industrial', true), 'industrial');
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/theme-preference.test.js tests/theme-runtime.test.js`
Expected: FAIL（模块不存在；`resolveTheme('industrial')` 返回 light/dark）。

- [ ] **Step 3: 实现**

`src/main/theme-preference.js`：

```js
'use strict';
// Pure theme-preference rules shared by the store and the main process.
// `system` only ever follows Windows between 朝日 (light) and 近月 (dark).

const THEME_PREFERENCES = Object.freeze(['system', 'light', 'dark', 'industrial']);

function normalizeThemePreference(value) {
  return THEME_PREFERENCES.includes(value) ? value : 'system';
}

/** Electron nativeTheme.themeSource for a preference: industrial is a dark theme. */
function nativeThemeSource(preference) {
  if (preference === 'light') return 'light';
  if (preference === 'dark' || preference === 'industrial') return 'dark';
  return 'system';
}

function resolveThemeId(preference, systemDark) {
  if (preference === 'light' || preference === 'dark' || preference === 'industrial') return preference;
  return systemDark ? 'dark' : 'light';
}

module.exports = { THEME_PREFERENCES, normalizeThemePreference, nativeThemeSource, resolveThemeId };
```

`src/main/store.js`：顶部加 `const { normalizeThemePreference } = require('./theme-preference');`，把
`if (!['system', 'light', 'dark'].includes(next.theme)) next.theme = 'system';` 改为 `next.theme = normalizeThemePreference(next.theme);`

`src/main/main.js`：顶部加 `const { THEME_PREFERENCES, normalizeThemePreference, nativeThemeSource, resolveThemeId } = require('./theme-preference');`；删除 `resolvedTheme()` 函数；`broadcastTheme()` 改为：

```js
function broadcastTheme() {
  const preference = normalizeThemePreference(themePreviewPreference ?? store.getConfig().theme);
  const source = nativeThemeSource(preference);
  if (nativeTheme.themeSource !== source) nativeTheme.themeSource = source;
  const payload = { theme: resolveThemeId(preference, nativeTheme.shouldUseDarkColors), preference };
  for (const win of [resultWin, settingsWin, bubbleWin, fontWin, historyWin, overlayWin, translateWin]) {
    if (win && !win.isDestroyed()) win.webContents.send('theme:update', payload);
  }
}
```

`settings:preview-theme` 处理器中的白名单改为 `THEME_PREFERENCES.includes(preference) ? preference : null`。运行 `git grep -n "resolvedTheme" -- src` 确认无残留。

`src/renderer/theme.js` 的 `resolveTheme` 第一行改为：

```js
    if (preference === 'light' || preference === 'dark' || preference === 'industrial') return preference;
```

`src/renderer/settings.js` 的 `resolvePreviewTheme` 第一行改为：

```js
  if (value === 'light' || value === 'dark' || value === 'industrial') return value;
```

- [ ] **Step 4: 运行测试**

Run: `node --test tests/theme-preference.test.js tests/theme-runtime.test.js && npm test`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/main/theme-preference.js src/main/store.js src/main/main.js src/renderer/theme.js src/renderer/settings.js tests/theme-preference.test.js tests/theme-runtime.test.js
git commit -m "feat(theme): accept the industrial preference end to end"
```

---

### Task 7: 设置页第四张主题卡

**Files:**
- Modify: `src/renderer/settings.html`（`#themeControl`）、`src/renderer/settings.css`（`.theme-options` 与 700px 媒体查询）、`src/shared/i18n.js`（约 292 行与 822 行）

- [ ] **Step 1: 文案**

`src/shared/i18n.js` 中文段 `'theme.darkHint': '深色主题',` 后加：

```js
    'theme.industrial': '前哨',
    'theme.industrialHint': '深色 · 切角',
```

英文段 `'theme.darkHint': 'Dark theme',` 后加：

```js
    'theme.industrial': 'Outpost',
    'theme.industrialHint': 'Dark · beveled',
```

- [ ] **Step 2: 主题卡**

`settings.html` 中 `id="themeOption-dark"` 按钮的结束标签 `</button>` 之后插入：

```html
                <button type="button" class="theme-option segmented-option" id="themeOption-industrial" data-theme-value="industrial" role="radio" aria-checked="false">
                  <span class="theme-preview" data-theme="industrial" aria-hidden="true"><span class="theme-mini-window"><i></i><span><b></b><em></em><em></em></span></span></span>
                  <span class="theme-option-copy"><b data-i18n="theme.industrial">前哨</b><small data-i18n="theme.industrialHint">深色 · 切角</small></span>
                  <span class="theme-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 12 4 4 8-9"></path></svg></span>
                </button>
```

- [ ] **Step 3: 布局**

`settings.css` 中 `.theme-options` 的 `grid-template-columns: repeat(3, minmax(0, 1fr));` 改为 `repeat(4, minmax(0, 1fr))`；700px 媒体查询中 `.theme-options { gap: 7px; }` 改为 `.theme-options { gap: 7px; grid-template-columns: repeat(2, minmax(0, 1fr)); }`。

- [ ] **Step 4: 验证**

Run: `npm test`
Expected: PASS。再 `npm run dev`，打开 设置 → 外观与阅读：四张卡一行，点击「前哨」后所有已打开窗口即时切换，重启后仍为前哨；切回「跟随系统」只在朝日 / 近月之间变化。

- [ ] **Step 5: 提交**

```bash
git add src/renderer/settings.html src/renderer/settings.css src/shared/i18n.js
git commit -m "feat(settings): add the 前哨 theme card"
```

---

### Task 8: 前哨装饰层 `ornaments.css`

**Files:**
- Create: `src/renderer/ornaments.css`、`tests/ornaments.test.js`
- Modify: 7 个 HTML（`bubble.html`、`font.html`、`history.html`、`result.html`、`selection.html`、`settings.html`、`translate.html`）

- [ ] **Step 1: 写失败测试**

```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'src', 'renderer');
const cssPath = path.join(dir, 'ornaments.css');

test('ornaments only target the industrial theme and only use tokens', () => {
  const css = fs.readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const body = css.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '');
  const selectors = [...body.matchAll(/([^{}@]+)\{/g)].map(m => m[1].trim()).filter(s => s && !s.startsWith('@'));
  assert.ok(selectors.length > 10, 'ornament rules exist');
  for (const group of selectors) {
    for (const selector of group.split(',').map(s => s.trim())) {
      assert.ok(selector.startsWith('[data-theme="industrial"]'), `unscoped selector: ${selector}`);
    }
  }
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(body.replace(/url\("data:[^"]*"\)/g, '')), 'no literal colors outside the logo data URI');
});

test('every page loads ornaments.css right after theme.css', () => {
  for (const page of ['bubble', 'font', 'history', 'result', 'selection', 'settings', 'translate']) {
    const html = fs.readFileSync(path.join(dir, `${page}.html`), 'utf8');
    assert.match(html, /href="theme\.css"><link rel="stylesheet" href="ornaments\.css">/, page);
  }
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/ornaments.test.js`
Expected: FAIL（文件不存在）。

- [ ] **Step 3: 引入样式表**

在 7 个 HTML 中，把 `href="theme.css">` 替换为 `href="theme.css"><link rel="stylesheet" href="ornaments.css">`（每个文件一处）：

```bash
node -e "const fs=require('fs');for(const p of ['bubble','font','history','result','selection','settings','translate']){const f='src/renderer/'+p+'.html';const s=fs.readFileSync(f,'utf8');if(!s.includes('href=\"theme.css\">'))throw new Error(f);fs.writeFileSync(f,s.replace('href=\"theme.css\">','href=\"theme.css\"><link rel=\"stylesheet\" href=\"ornaments.css\">'));}console.log('ok')"
```

- [ ] **Step 4: 写 `src/renderer/ornaments.css`**

```css
/* 前哨 · 工业 ornament layer. Every rule is scoped to [data-theme="industrial"]
   and uses tokens only; registered in the theme spec (decoration table).
   Colors come from theme.css; nothing here applies to 朝日 / 近月. */

/* ---------- window frame: asymmetric bevel + registration brackets ---------- */
[data-theme="industrial"] .card,
[data-theme="industrial"] .history-shell {
  position: relative;
  border-radius: 0 var(--fa-radius-window) 0 var(--fa-radius-window);
}
[data-theme="industrial"] .card::before,
[data-theme="industrial"] .card::after,
[data-theme="industrial"] .history-shell::before,
[data-theme="industrial"] .history-shell::after {
  content: "";
  position: absolute;
  z-index: 20;
  width: 10px;
  height: 10px;
  border: 0 solid var(--fa-accent);
  pointer-events: none;
}
[data-theme="industrial"] .card::before,
[data-theme="industrial"] .history-shell::before { top: 5px; left: 5px; border-width: 1.5px 0 0 1.5px; }
[data-theme="industrial"] .card::after,
[data-theme="industrial"] .history-shell::after { bottom: 5px; right: 5px; border-width: 0 1.5px 1.5px 0; }

/* ---------- title bars: hazard edge + grid ---------- */
[data-theme="industrial"] .titlebar,
[data-theme="industrial"] .history-header {
  position: relative;
  background-image:
    var(--fa-hazard),
    linear-gradient(var(--fa-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--fa-grid-line) 1px, transparent 1px);
  background-size: 7px 100%, var(--fa-grid-size) var(--fa-grid-size), var(--fa-grid-size) var(--fa-grid-size);
  background-repeat: no-repeat, repeat, repeat;
}

/* Brand mark: yellow block with the viewfinder glyph (one of two solid yellows). */
[data-theme="industrial"] .titlebar .brand-logo,
[data-theme="industrial"] .brand .brand-logo {
  object-position: -9999px 0;
  background: var(--fa-accent) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23141414' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4'/%3E%3Cpath d='M12 8.5v7M8.5 12h7'/%3E%3C/svg%3E") center / 62% no-repeat;
  border-radius: 0 var(--fa-radius-small) 0 var(--fa-radius-small);
}

/* ---------- answer window ---------- */
[data-theme="industrial"] .status-dot { width: 6px; height: 6px; border-radius: 0; }
[data-theme="industrial"] .term-label,
[data-theme="industrial"] .session-hash {
  display: inline;
  margin-left: 8px;
  font-family: var(--fa-font-label);
  font-size: 10.5px;
  font-weight: 400;
  letter-spacing: 0.02em;
}
[data-theme="industrial"] .term-label { color: var(--fa-accent); }
[data-theme="industrial"] .session-hash { color: var(--fa-faint); }

/* Conveyor strip: only while the answer is streaming. */
[data-theme="industrial"] .titlebar:has(.status-pill.working)::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 3px;
  background:
    repeating-linear-gradient(-60deg, transparent 0 3px, var(--fa-accent) 3px 5px, transparent 5px 8px) 0 0 / 9.2px 3px,
    var(--fa-divider);
  animation: fa-belt 1.1s linear infinite;
}
@keyframes fa-belt { to { background-position: 9.2px 0, 0 0; } }
@media (prefers-reduced-motion: reduce) {
  [data-theme="industrial"] .titlebar:has(.status-pill.working)::after { animation: none; }
}

/* Context row: the mono readout replaces title + meta; the toggle stays clickable. */
[data-theme="industrial"] .context-toggle .context-title,
[data-theme="industrial"] .context-toggle .context-meta { display: none; }
[data-theme="industrial"] .term-meta {
  display: inline;
  font-family: var(--fa-font-label);
  font-size: 11px;
  color: var(--fa-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
[data-theme="industrial"] .model-chip {
  font-family: var(--fa-font-label);
  border-radius: 0 var(--fa-radius-mini) 0 var(--fa-radius-mini);
}

/* Reading area: grid under text, yellow numbered headings, square bullets. */
[data-theme="industrial"] .messages {
  background-image:
    linear-gradient(var(--fa-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--fa-grid-line) 1px, transparent 1px);
  background-size: var(--fa-grid-size) var(--fa-grid-size);
  background-attachment: local;
}
[data-theme="industrial"] .md-body { counter-reset: fa-heading; }
[data-theme="industrial"] .md-body h1,
[data-theme="industrial"] .md-body h2,
[data-theme="industrial"] .md-body h3,
[data-theme="industrial"] .md-body h4 { color: var(--fa-accent); counter-increment: fa-heading; }
[data-theme="industrial"] .md-body h1::before,
[data-theme="industrial"] .md-body h2::before,
[data-theme="industrial"] .md-body h3::before {
  content: counter(fa-heading, decimal-leading-zero) " //";
  margin-right: 6px;
  font-family: var(--fa-font-label);
  font-size: 0.8em;
  font-weight: 400;
  background: none;
  width: auto;
  height: auto;
}
[data-theme="industrial"] .md-body ul { list-style: square; }
[data-theme="industrial"] .md-body li::marker { color: var(--fa-accent); }
[data-theme="industrial"] .md-body .cite {
  font-family: var(--fa-font-label);
  color: var(--fa-accent);
  border: 1px solid var(--fa-border-accent-line);
  border-radius: 0;
}
[data-theme="industrial"] .md-body blockquote { border-left: 3px solid var(--fa-accent); border-radius: 0; }
[data-theme="industrial"] .code-head,
[data-theme="industrial"] .code-lang { font-family: var(--fa-font-label); }

/* Composer: yellow hairlines, solid yellow send, keycap hints. */
[data-theme="industrial"] .quick-chip { border-color: var(--fa-border-accent-line); }
[data-theme="industrial"] .input-shell { border-color: var(--fa-border-accent-line); }
[data-theme="industrial"] .input-shell:focus-within { border-color: var(--fa-accent); }
[data-theme="industrial"] .composer-hint b {
  display: inline-flex;
  align-items: center;
  height: 17px;
  padding: 0 5px;
  border: 1px solid var(--fa-border-floating);
  border-bottom-width: 2px;
  border-radius: 0 3px 0 3px;
  background: var(--fa-surface-2);
  color: var(--fa-body);
  font-family: var(--fa-font-label);
  font-size: 10.5px;
  font-weight: 400;
}

/* Error card: hazard edge. */
[data-theme="industrial"] .error-card {
  border-left: 0;
  background-image: var(--fa-hazard);
  background-size: 8px 100%;
  background-repeat: no-repeat;
  padding-left: 22px;
}

/* ---------- settings ---------- */
[data-theme="industrial"] .settings-nav {
  counter-reset: fa-nav;
  background-image:
    linear-gradient(var(--fa-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--fa-grid-line) 1px, transparent 1px);
  background-size: var(--fa-grid-size) var(--fa-grid-size);
}
[data-theme="industrial"] .settings-nav-item { position: relative; counter-increment: fa-nav; }
[data-theme="industrial"] .settings-nav-item::before {
  content: counter(fa-nav, decimal-leading-zero);
  margin-right: 8px;
  font-family: var(--fa-font-label);
  font-size: 11px;
  color: var(--fa-faint);
}
[data-theme="industrial"] .settings-nav-item.active::before { color: var(--fa-accent); }
[data-theme="industrial"] .settings-nav-item.active::after {
  content: "";
  position: absolute;
  left: 0;
  top: 9px;
  bottom: 9px;
  width: 3px;
  background: var(--fa-accent);
}
/* Section index 05.1 / 05.2 …: panel number + position among visible sections
   (hidden panels are display:none and do not advance the counter). */
[data-theme="industrial"] .scroll-body { counter-reset: fa-section; }
[data-theme="industrial"] .section[data-panel-section] { counter-increment: fa-section; }
[data-theme="industrial"] .section[data-panel-section] .section-head h2::before {
  margin-right: 8px;
  font-family: var(--fa-font-label);
  font-size: 11px;
  font-weight: 400;
  color: var(--fa-accent);
}
[data-theme="industrial"] .section[data-panel-section="model"] .section-head h2::before { content: "01." counter(fa-section); }
[data-theme="industrial"] .section[data-panel-section="web"] .section-head h2::before { content: "02." counter(fa-section); }
[data-theme="industrial"] .section[data-panel-section="general"] .section-head h2::before { content: "03." counter(fa-section); }
[data-theme="industrial"] .section[data-panel-section="privacy"] .section-head h2::before { content: "04." counter(fa-section); }
[data-theme="industrial"] .section[data-panel-section="appearance"] .section-head h2::before { content: "05." counter(fa-section); }
[data-theme="industrial"] .section[data-panel-section="updates"] .section-head h2::before { content: "06." counter(fa-section); }
[data-theme="industrial"] .provider-card.active,
[data-theme="industrial"] .theme-option.segmented-option.active { position: relative; }
[data-theme="industrial"] .provider-card.active::after,
[data-theme="industrial"] .theme-option.segmented-option.active::after {
  content: "";
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 8px;
  height: 8px;
  border: 0 solid var(--fa-accent);
  border-width: 0 1.5px 1.5px 0;
  pointer-events: none;
}
[data-theme="industrial"] .switch i { border-radius: 0; }
[data-theme="industrial"] .switch i::after { border-radius: 0; }
[data-theme="industrial"] .theme-preview[data-theme="industrial"] {
  background-image: var(--fa-hazard);
  background-size: 5px 100%;
  background-repeat: no-repeat;
}

/* ---------- history ---------- */
[data-theme="industrial"] .record.selected { box-shadow: inset 3px 0 0 var(--fa-accent); }
[data-theme="industrial"] .record-hash {
  display: inline;
  margin-left: 6px;
  font-family: var(--fa-font-label);
  font-size: 10.5px;
  color: var(--fa-faint);
}
[data-theme="industrial"] .clear-scope {
  background-image: var(--fa-hazard);
  background-size: 8px 100%;
  background-repeat: no-repeat;
  padding-left: 22px;
}

/* ---------- selection overlay ---------- */
[data-theme="industrial"] #stage {
  background-image:
    linear-gradient(var(--fa-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--fa-grid-line) 1px, transparent 1px);
  background-size: var(--fa-overlay-grid-size) var(--fa-overlay-grid-size);
}
[data-theme="industrial"] .corner { border-color: var(--fa-accent); }
[data-theme="industrial"] .corner.tl { border-top-width: 3px; border-left-width: 3px; }
[data-theme="industrial"] .corner.tr { border-top-width: 3px; border-right-width: 3px; }
[data-theme="industrial"] .corner.bl { border-bottom-width: 3px; border-left-width: 3px; }
[data-theme="industrial"] .corner.br { border-bottom-width: 3px; border-right-width: 3px; }
[data-theme="industrial"] .size {
  background: var(--fa-accent);
  color: var(--fa-on-primary);
  border-color: var(--fa-accent);
}

/* ---------- toolbar capsule ---------- */
[data-theme="industrial"] .brand { color: var(--fa-accent); }
[data-theme="industrial"] .ask {
  background: var(--fa-primary-button);
  color: var(--fa-on-primary);
  border-color: var(--fa-primary-button);
}
[data-theme="industrial"] .ask svg { color: var(--fa-on-primary); }
```

更新失败：当前设置页没有独立的"更新失败卡"元素（失败信息走就地文字与 toast），因此规范 3.4 中"更新失败卡左缘斜纹"本次不实现，在 Task 11 的验收记录里列为后续项。

注意：`.md-body h1::before` 等在 `result.css` 里已有装饰（宽高、背景），上面的 `background: none; width: auto; height: auto;` 用于覆盖。实现时打开 `result.css` 中 `.md-body h1::before, .md-body h2::before, .md-body h3::before` 规则核对需要重置的属性，并补齐（例如 `display`、`border-radius`），保持 ornaments.css 只用 token。

- [ ] **Step 5: 运行测试**

Run: `node --test tests/ornaments.test.js && npm test`
Expected: PASS。

- [ ] **Step 6: 视觉核对**

`npm run dev` 并切到前哨，逐个窗口与 `design-mockups/industrial/qianshao-mockup.html` 对照：答案窗（生成中 / 完成 / 出错）、紧凑窗、设置外观页、历史与清除确认、框选层、工具栏展开与四边半胶囊。差异记入提交说明；超出 ornaments.css 范围的改动先报告。

- [ ] **Step 7: 提交**

```bash
git add src/renderer/ornaments.css src/renderer/*.html tests/ornaments.test.js
git commit -m "feat(theme): industrial ornament layer scoped to the 前哨 theme"
```

---

### Task 9: 微标签的真实数据

**Files:**
- Create: `src/shared/short-hash.js`、`tests/short-hash.test.js`
- Modify: `src/main/history.js`、`src/main/main.js`（会话创建约 760 / 1743 行、`session:state`、`streamChat` 调用处）
- Modify: `src/renderer/result.html`、`src/renderer/result.js`、`src/renderer/result.css`、`src/renderer/history.html`、`src/renderer/history.js`、`src/renderer/history.css`

- [ ] **Step 1: 写失败测试**

`tests/short-hash.test.js`：

```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { shortHash } = require('../src/shared/short-hash');

test('shortHash is a stable 4-digit hex label', () => {
  const id = 'h-1762150327000-ab12cd';
  assert.match(shortHash(id), /^0x[0-9A-F]{4}$/);
  assert.equal(shortHash(id), shortHash(id));
  assert.notEqual(shortHash(id), shortHash('h-1762150327000-ab12ce'));
});

test('shortHash is empty for a missing id', () => {
  assert.equal(shortHash(''), '');
  assert.equal(shortHash(null), '');
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/short-hash.test.js`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现短哈希**

`src/shared/short-hash.js`：

```js
'use strict';
// Short session label (0x3F2A) derived from a history record id. Shared by
// the main process (tests) and renderers (window.FloatAskShortHash).
(function (global) {
  function shortHash(value) {
    const text = String(value || '');
    if (!text) return '';
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return `0x${((hash ^ (hash >>> 16)) & 0xffff).toString(16).toUpperCase().padStart(4, '0')}`;
  }

  const api = { shortHash };
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.FloatAskShortHash = api;
})(typeof window !== 'undefined' ? window : globalThis);
```

Run: `node --test tests/short-hash.test.js` → PASS。

- [ ] **Step 4: 会话一开始就有历史 ID**

`src/main/history.js`：把第 92 行生成 ID 的表达式提取为函数并导出：

```js
function newHistoryId() {
  return `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
```

第 92 行改为 `if (!session.historyId) session.historyId = newHistoryId();`，`module.exports` 加入 `newHistoryId`。

先检查是否有代码把 `historyId` 有值当作"已保存"：
Run: `git grep -n "historyId" -- src/main`
Expected: 只有赋值、查找（`history.get` / `records.find`）和删除比较。若发现以真值判断"已保存"的分支，停下来报告。

`src/main/main.js` 中两处 `session = {`（约 760 行与 1743 行，均为框选 / 剪贴板答案会话）各加一行 `historyId: history.newHistoryId(),`。`session:state` 处理器返回对象中加 `historyId: session?.historyId ?? null,`。

- [ ] **Step 5: 首字耗时**

`src/main/main.js` 中 `sendResult({ type: 'start', mode });` 之后加：

```js
  const startedAt = Date.now();
  let latencySent = false;
```

`onDelta` 回调内 `full += delta;` 之后加：

```js
        if (!latencySent && session && session.id === id && session.abort === controller) {
          latencySent = true;
          sendResult({ type: 'latency', ms: Date.now() - startedAt });
        }
```

- [ ] **Step 6: 答案窗元素与渲染**

`result.html`：
- `<span class="brand-en">FLOATASK</span>` 后加 `<span id="termLabel" class="term-label" aria-hidden="true"></span>`
- `<span id="statusText">待命</span>` 后加 `<span id="sessionHash" class="session-hash" aria-hidden="true"></span>`
- `<span id="contextMeta" class="context-meta"></span>` 后加 `<span id="termMeta" class="term-meta" aria-hidden="true"></span>`
- 在 `<script src="theme.js"></script>` 前加 `<script src="../shared/short-hash.js"></script>`

`result.css` 末尾加（朝日 / 近月不显示，前哨由 ornaments.css 打开）：

```css
.term-label, .session-hash, .term-meta { display: none; }
```

`result.js`：
- `els` 加 `termLabel: document.getElementById('termLabel'), sessionHash: document.getElementById('sessionHash'), termMeta: document.getElementById('termMeta'),`
- `state` 加 `historyId: null, latencyMs: null,`
- 加函数：

```js
function updateTermLabels() {
  const turns = els.messages.querySelectorAll('.message:not(.user)').length;
  els.termLabel.textContent = `fa.term // node-${String(Math.max(1, turns)).padStart(2, '0')}`;
  els.sessionHash.textContent = window.FloatAskShortHash.shortHash(state.historyId);
  const process = state.windowInfo?.process || '';
  const chars = state.selectionText ? state.selectionText.replace(/\s+/g, '').length : 0;
  const latency = Number.isFinite(state.latencyMs) ? `${(state.latencyMs / 1000).toFixed(2)}s` : '--';
  els.termMeta.textContent = [process && `src: ${process}`, `ocr ${chars} ch`, `lat ${latency}`].filter(Boolean).join(' | ');
}
```

- `updateContext()` 末尾调用 `updateTermLabels();`
- `handleStart(mode)` 第一行加 `state.latencyMs = null;`，函数末尾调用 `updateTermLabels();`
- 事件 `switch` 中 `case 'delta':` 之前加：

```js
    case 'latency':
      state.latencyMs = Number(payload.ms);
      updateTermLabels();
      break;
```

- `refreshSessionMeta()` 中 `if (!meta) return;` 之后加 `state.historyId = meta.historyId || null; updateTermLabels();`

- [ ] **Step 7: 历史列表**

`history.html`：在 `<script src="history.js">` 前加 `<script src="../shared/short-hash.js"></script>`。
`history.css` 末尾加 `.record-hash { display: none; }`。
`history.js` 的 `renderList()` 中，在创建 `title` 的那一行之后加：

```js
  const hash=document.createElement('span'); hash.className='record-hash'; hash.textContent=window.FloatAskShortHash.shortHash(row.id);
```

并在同一循环里把 `hash` 追加到 `title` 后面：用 `grep -n "el.append" src/renderer/history.js` 找到该循环中的 `el.append(...)`，在参数列表里 `title` 后插入 `hash`；若 `title` 由 `el.appendChild(title)` 追加，紧随其后加 `title.append(hash);`。

- [ ] **Step 8: 运行测试并核对**

Run: `npm test`
Expected: PASS。`npm run dev` 切到前哨框选一次：标题栏显示 `fa.term // node-01` 与 `0x....`，上下文行 `src: … | ocr N ch | lat 0.xxs`，追问后 `node-02`；历史列表同一记录显示相同哈希。切回近月时这些标签不可见。

- [ ] **Step 9: 提交**

```bash
git add src/shared/short-hash.js src/main/history.js src/main/main.js src/renderer/result.* src/renderer/history.* tests/short-hash.test.js
git commit -m "feat(theme): real-data micro labels for the 前哨 answer window and history"
```

---

### Task 10: 文档同步

**Files:**
- Modify: `design-mockups/graphite-system/IMPLEMENTATION_SPEC.md`、`design-mockups/README.md`、`README.md`

- [ ] **Step 1: 实施规范**

`IMPLEMENTATION_SPEC.md`：
- 第 2 节「禁止：琥珀色终端风……」一行改为：`朝日／近月禁止：琥珀色终端风、网格背景、扫描线、发光边框、霓虹渐变、无功能意义的装饰标签。前哨 · 工业的装饰以第 16 节登记表为准。`
- 第 3 节首条改为：`所有主题共用布局、尺寸、间距、图标、字体层级和组件状态；朝日／近月共用圆角，前哨通过 shape token 覆盖圆角并使用 bevel 切角。`
- 新增「## 16. 第三主题：前哨 · 工业（1.5.0）」，内容：引用 `docs/superpowers/specs/2026-11-03-qianshao-industrial-theme-design.md` 第 3 节的色板、形状、装饰登记表、微标签数据来源与黄色预算；说明 `ornaments.css` 只作用于 `[data-theme="industrial"]`；跟随系统只在朝日／近月之间切换。
- 版本记录顶部加：`- 1.5.0（2026-11-03）：新增第三主题「前哨 · 工业」（ID industrial）与分主题 shape／ornaments token；胶囊工具栏改为锚点吸附，四边展开间距统一 8 DIP，吸附状态跨重启保存。`

- [ ] **Step 2: 设计资产索引**

`design-mockups/README.md`「当前主方向」末尾加一条：`第三主题「前哨 · 工业」视觉基准：industrial/qianshao-mockup.html；规范 1.5.0。设计板补页在实现完成后进行。` 文件结构表加一行 `industrial/` 的说明。

- [ ] **Step 3: 项目 README**

`README.md` 的「### 界面风格」一段改为：说明提供三套主题——朝日 · 白天、近月 · 深夜（安静克制的石墨风格）、前哨 · 工业（切角、讯号黄、警示斜纹、网格与等宽读数的工业终端风格）；设置 → 外观与阅读切换，跟随系统在朝日／近月之间自动切换；保留"不使用任何现有作品的角色、标志或素材"。

- [ ] **Step 4: 提交**

```bash
git add design-mockups/graphite-system/IMPLEMENTATION_SPEC.md design-mockups/README.md README.md
git commit -m "docs: record the 前哨 theme and anchored toolbar docking"
```

---

### Task 11: 验收

**Files:** 无新增代码（如需修复，回到对应任务并单独提交）。

- [ ] **Step 1: 自动化**

Run: `node scripts/build-theme.js --check && npm test`
Expected: `theme in sync`，全部测试通过。

- [ ] **Step 2: 截图比对**

`npm run dev`，在前哨下截图：答案窗展开（生成中、完成、出错）、紧凑窗、设置外观页、历史与清除确认、框选层、工具栏展开与四边半胶囊；朝日、近月各截答案窗与设置页各一张。保存到 `docs/verification/industrial/`，与设计稿逐板比对；朝日／近月与改动前一致（除 Task 5 记录的 1px 圆角差）。

- [ ] **Step 3: 系统状态**

- Windows 设置 → 辅助功能 → 对比度主题：开启后各窗口由系统色接管，斜纹与网格消失。
- Windows 设置 → 辅助功能 → 视觉效果 → 关闭动画效果：传送带静止，工具栏收放即时。
- 125% / 150% 缩放各检查一次工具栏吸附与间距。

- [ ] **Step 4: 记录**

在 `docs/verification/floatask-page-matrix.md` 末尾追加「前哨 · 工业」小节：列出截图、对应设计板编号、通过 / 差异。

```bash
git add docs/verification
git commit -m "docs: 前哨 theme verification captures"
```
