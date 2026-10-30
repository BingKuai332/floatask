# FloatAsk「朝日／近月」UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不破坏现有截图、OCR、模型、检索、历史与更新能力的前提下，将 FloatAsk 0.3.1 迁移为「朝日／近月」双主题 Windows 桌面界面。

**Architecture:** 保留现有 Electron 主进程业务链路与 preload IPC，以 `design-tokens.yaml` 生成共享 CSS，逐窗口迁移原生 HTML/CSS/JS。只有主题同步、工具栏窗口几何、OCR 修正和辅助功能需要进入主进程或 preload；不得把本项目改成前端框架应用。

**Tech Stack:** Electron 45.1.0、Node.js >=22.12.0、原生 HTML/CSS/JavaScript、Node `node:test`、现有 `npm run mock` 与 Electron smoke tests。

**Spec:**
- `design-mockups/graphite-system/design-tokens.yaml`
- `design-mockups/graphite-system/IMPLEMENTATION_SPEC.md`
- `design-mockups/graphite-system/floatask-graphite-system.kanva.pptd`
- `design-mockups/README.md`

## 给 Code Agent 的启动提示词

将下面整段交给具备当前仓库读写与测试能力的 Code Agent：

```text
你在 FloatAsk 仓库中实施一次既有 Electron 应用的 UI 迁移，不是重新做产品，也不是根据截图生成静态页面。

开始前必须完整阅读，顺序不可交换：
1. design-mockups/graphite-system/design-tokens.yaml
2. design-mockups/graphite-system/IMPLEMENTATION_SPEC.md
3. docs/superpowers/plans/2026-10-30-floatask-ui-implementation.md
4. design-mockups/README.md
5. design-mockups/graphite-system/floatask-graphite-system.kanva.pptd（设计源文件）；逐页看图使用 design-mockups/graphite-preview/page-1.png 至 page-50.png，页码与验收矩阵一致

设计意图：FloatAsk 是安静、清晰、克制、可靠的 Windows 悬浮工具，不是网页 dashboard，也不是工业终端。内容可读性、圆角与边框的一致性、双主题语义和真实交互状态，比装饰或单张截图的“像”更重要。朝日与近月共用布局；Windows 高对比度由系统接管配色，不属于任何一个主题。

工作约束：
- 保留现有及上游新增的 OCR、截图、SSE 流式请求、模型路由、联网检索、历史、DPAPI、更新逻辑和其他新功能；UI 迁移不得成为回退他人功能的理由。
- 五十页是当前设计基线，不是功能白名单或未来页数上限。新功能优先复用语义 token、现有组件与既定入口；确需新原语时同步扩展规范和验收矩阵。
- 不改用 React/Vue，不新建平行色板，不把设计页转成位图贴进应用，也不为未知功能提前建设插件平台。
- 不删除既有窗口操作、ID、IPC 或隐私说明；确需变更时先列出兼容方案。配置与 IPC 默认采用向后兼容的增量扩展。
- 不自行增加颜色、圆角、阴影、动效或主题分支；规范与 Electron 能力冲突时记录差异并停下确认，不静默偏离。
- 按实施计划逐 Task 小步完成。每个 Task 先写或更新失败测试，再实现，再运行相关测试与 npm test，最后提供截图和差异说明。
- 样张中的文字、记录数、延迟、尺寸示例不是硬编码业务数据；真实数据仍来自当前会话与配置。集合类 UI 不得假定提供商、来源、快捷动作或设置分区的数量永远不变。

先检查当前分支、工作区改动和用户提供的上游 ref，识别重叠文件与上游新增功能；不得 reset、clean 或覆盖他人工作。随后运行 npm test 建立基线，只输出：代码基线、需保留的新功能、现有差距、Task 1 文件改动方案和验证方法。不要一开始重写全部文件。后续每个 Task 完成后，明确列出“已实现的页面／保留的上游功能／未覆盖的页面／自动测试证据／人工走查证据”。没有实际执行过的 Windows、混合 DPI、高对比度或屏幕阅读器验收，不得声称通过。
```

## Global Constraints

- 主题显示名固定为 `朝日 · 白天`、`近月 · 深夜`、`跟随系统`，功能标签“白天／深夜”保留。
- 圆角只允许 `16 / 12 / 10 / 8 px` 与全圆角；共边嵌套遵循 `R内 = R外 − 间距`，禁止覆盖矩形修补轮廓。
- 浮层、普通控件、激活态分别使用 `floating / control / active` 描边；禁止琥珀色、网格、扫描线、发光与霓虹渐变。
- 紧凑答案窗为 `480 × 360 DIP`；扩展答案窗标题栏、上下文和输入区固定，仅回答视口滚动。
- 工具栏展开 `328 × 52 DIP`，左右收起 `44 × 64 DIP`，上下收起 `64 × 44 DIP`；吸附阈值 `24 DIP`，展开间距 `8 DIP`。
- 键盘焦点为 `2 DIP active 外描边 + 2 DIP 偏移`，不得被父容器裁剪；disabled 不进入 Tab 顺序。
- Windows 高对比度使用系统色板，优先于朝日／近月；跨主题设计预览必须标注“系统接管配色 · 非朝日／近月主题色”。减少动态不得移除功能反馈；流式内容不得逐字播报。
- 保留 `src/main/ai.js`、`search.js`、`capture.js`、`powershell.js`、`prompt.js` 的业务行为，UI 迁移不得成为重写这些模块的理由。
- 所有可见文案进入现有 i18n；示例数据不得硬编码为真实历史、截图大小、网络延迟或模型结果。
- 字体必须本地可用并保留许可信息，不依赖运行时 CDN；无法落实时记录差异，不得静默换成另一套设计。

## Review Focus

- **长回答、代码与表格同时出现：** 只能滚动回答视口及必要的代码／表格容器，外窗和 composer 不跳动；由 Task 4 的长内容 smoke case 固定。
- **跨屏与不同 DPI：** 窗口使用目标屏工作区和 DIP，不重复缩放、不覆盖任务栏；由 Task 6 的几何单测与 Task 12 的实机清单固定。
- **菜单内 Esc 与焦点返回：** 第一次 Esc 只关闭菜单并回到触发按钮，第二次才关闭答案窗；由 Task 3 的键盘 smoke case 固定。
- **流式回答与屏幕阅读器：** 视觉文本持续更新，但 live region 只播报完成、错误与恢复动作；由 Task 4 的 DOM 测试和 Task 12 的人工走查固定。
- **系统高对比度：** 黑色预览不是朝日色板，真实 forced-colors 环境中不得被主题变量覆盖；由 Task 2 的 CSS 测试与 Task 12 的实机清单固定。
- **上游已经新增功能：** 新功能必须被识别、保留并接入同一语义系统，不得被五十页基线回退；由下方基线流程和 Task 13 的 diff 检查固定。

## 实施前置：上游基线与冲突防护

1. 只读执行 `git status --short --branch`、`git remote -v`、`git log --oneline --decorate -n 20` 与 `git diff --stat`；若用户提供了上游 ref，再用三方 diff 识别上游新增、当前修改和重叠文件。未提供最新 ref 时明确写出这一限制，不假装已同步远端。
2. 开始改动前输出基线清单：当前 commit、上游 ref／commit、本地未提交工作、重叠文件、上游新增功能、需要保留的 IPC／配置／测试。不得使用 `git reset --hard`、`git clean` 或整文件覆盖来消除冲突。
3. 对重叠文件按功能合并，不按“旧 UI／新 UI”选边。上游新增测试必须先保留并运行；UI 迁移需要改变其行为时，单独说明原因和兼容方案。
4. `theme.css` 是生成物：冲突在 `design-tokens.yaml` 与生成器源中解决，再重新生成；不得手工拼接两段生成 CSS，也不得让上游业务修复在生成过程中丢失。
5. 每个 Task 的 diff 只包含本任务所需改动。发现范围外的上游功能或新配置时，将其登记到保留清单并补充对应验收，不静默删除。

## 新功能扩展契约

- **复用顺序：** 先复用现有语义 token 和组件，再增加已有组件的受控 variant；只有全新信息结构或交互原语才新增设计。新增原语必须同步 token／规范／样张／矩阵，不能在代码里私自成形。
- **入口开放但层级稳定：** 新模型服务扩展现有 provider 数据；新内容块进入回答视口；新设置能力注册到有顺序的设置导航；新工具动作默认进入“更多”或溢出菜单。胶囊一级动作、窗口主操作和阅读区域不得因功能增多而无限扩张。
- **集合不固定数量：** provider、来源、quick chips、历史筛选、设置项和菜单项使用数据驱动渲染、稳定 ID 与 i18n key；禁止依赖 `nth-child`、固定数组长度或“正好六张卡片”的布局假设。数量超出当前设计时使用滚动、换行或溢出，不缩小字号硬塞。
- **兼容优先：** 新配置字段提供默认值与非法值回退；新 IPC 采用增量添加，保留既有调用；未知状态显示可恢复的通用状态，不导致窗口空白。已有 token 改名或删除前先保留别名并记录弃用。
- **轻量验证：** 用一个虚构 provider、一个额外来源和一个额外设置项做扩展 fixture，证明增加数量不会破坏几何、键盘顺序和双主题；不实现真实插件系统。
- **五十页可增长：** 新功能若能由现有页面覆盖，只更新对应验收行；若引入新原语或新系统状态，再追加设计页和验收行。页数增加不属于偏离设计。

---

### Task 1: 建立唯一 token 到 CSS 的生成链

**Files:**
- Create: `scripts/build-theme.js`
- Create: `tests/design-tokens.test.js`
- Modify: `src/renderer/theme.css`
- Modify: `package.json`

**Interfaces:**
- Consumes: `design-mockups/graphite-system/design-tokens.yaml`。
- Produces: `renderTheme(tokens): string`、`node scripts/build-theme.js --check`，以及包含 `--fa-*` 语义变量的 `theme.css`。

- [ ] **Step 1: 写失败测试**：解析 YAML，断言版本 `1.4.2`，断言近月 `surface=#171A20`、朝日 `surface=#F4F3ED`、四级圆角和焦点 `2 / 2 DIP` 均进入生成 CSS；`--check` 能发现手工改动。
- [ ] **Step 2: 运行 `node --test tests/design-tokens.test.js`，确认因生成器不存在而失败。**
- [ ] **Step 3: 实现生成器**：加入最小 YAML 开发依赖与 `build:tokens` script；生成浅深主题、间距、圆角、字体、动效变量，不在组件 CSS 再定义色板。
- [ ] **Step 4: 运行 `node scripts/build-theme.js && node --test tests/design-tokens.test.js && npm test`，确认全部通过。**
- [ ] **Step 5: 提交本 Task 的生成器、生成 CSS、测试与依赖锁文件。**

### Task 2: 主题运行时、字体与系统高对比度

**Files:**
- Create: `src/renderer/theme.js`
- Create: `resources/fonts/` 中经许可确认的 Liter／MiSans 文件与许可说明
- Modify: `src/main/store.js`、`src/main/main.js`、`src/preload/preload.js`
- Modify: `scripts/build-theme.js`、`src/renderer/*.html`
- Modify: `src/shared/i18n.js`、`tests/config-update.test.js`、`tests/electron-smoke.js`

**Interfaces:**
- Consumes: Task 1 的 `--fa-*` 变量及现有 `getSettings/saveSettings`。
- Produces: 配置 `theme: 'system' | 'light' | 'dark'`，`window.floatask.onThemeUpdated(cb)`，文档根 `data-theme="light|dark"`；系统高对比度不改变该配置值。

- [ ] **Step 1: 写失败测试**：覆盖非法主题回退 `system`、配置持久化、系统主题变化广播、两个主题只切换语义变量，以及 `forced-colors: active` 中系统色优先。
- [ ] **Step 2: 运行相关单测和 smoke，确认主题接口尚不存在。**
- [ ] **Step 3: 实现主题运行时**：复用设置 IPC，在所有渲染页加载 `theme.js`；监听 `nativeTheme`，本地声明字体，用 `@media (forced-colors: active)` 和 `prefers-reduced-motion` 接管系统状态。
- [ ] **Step 4: 运行 `npm test`；用 mock 验证朝日／近月／跟随系统切换无需重启，系统高对比度示意不被当作朝日黑色组件。**
- [ ] **Step 5: 提交主题运行时、配置迁移、字体与测试。**

### Task 3: 共享控件几何、焦点与弹层行为

**Files:**
- Create: `src/renderer/controls.css`、`src/renderer/focus.js`
- Modify: 各渲染页 HTML／JS、`tests/electron-smoke.js`

**Interfaces:**
- Consumes: Task 1 的语义变量。
- Produces: 统一 `.fa-button/.fa-icon-button/.fa-input/.fa-chip/.fa-menu` 类与 `focusMenu({trigger, menu})`；菜单关闭后焦点返回 `trigger`。

- [ ] **Step 1: 写失败 smoke 断言**：按钮、输入、chips 和菜单的圆角／边框引用正确；disabled 不可 Tab；焦点外描边不被裁剪；菜单 Esc 层级与焦点返回正确。
- [ ] **Step 2: 运行 smoke，记录现有焦点与弹层失败。**
- [ ] **Step 3: 实现共享控件与焦点工具**：保持既有元素 ID 和点击逻辑，不用 `outline: none`，不新增装饰性状态。
- [ ] **Step 4: 运行 `npm test` 并用纯键盘走完结果窗和设置页；核对第 5、7、45、49 页。**
- [ ] **Step 5: 提交共享控件、键盘行为与测试。**

### Task 4: 答案窗阅读、紧凑态与流式跟随

**Files:**
- Modify: `src/renderer/result.html`、`result.css`、`result.js`
- Modify: `src/main/main.js`（仅窗口尺寸／展开状态所需部分）
- Modify: `tests/electron-smoke.js`

**Interfaces:**
- Consumes: 现有 `result:init/result:event/session:*` 和共享控件。
- Produces: 固定标题栏／上下文／composer、独立 `#messages` 视口、`data-density`、紧凑／扩展状态与“回到底部”恢复动作。

- [ ] **Step 1: 写失败 smoke**：覆盖 `480 × 360 DIP` 紧凑态、长文本只滚动 `#messages`、代码／表格内部横向溢出、向上阅读暂停跟随、回到底部恢复，以及完成时单次 live-region 播报。
- [ ] **Step 2: 运行 smoke，确认新结构与行为断言失败。**
- [ ] **Step 3: 实现结果窗迁移**：保留现有消息渲染、来源、停止、重试与模型逻辑；移除扫描线和终端装饰，不以缩小字号处理溢出。
- [ ] **Step 4: 运行 `npm test`；以 mock 长回答核对第 1、2、9、10、11、20、25、26、28 页并保存深浅截图。**
- [ ] **Step 5: 提交答案窗结构、行为与测试。**

### Task 5: 截图上下文、OCR 修正与异常恢复

**Files:**
- Modify: `src/renderer/result.html`、`result.css`、`result.js`
- Modify: `src/main/main.js`、`src/preload/preload.js`
- Modify: `tests/electron-smoke.js`

**Interfaces:**
- Consumes: 当前 session 的原始截图、原始 OCR 与模型请求链路。
- Produces: `window.floatask.correctOcr(text)`／`session:correct-ocr`，以及 `getResultState()` 中可区分的原始 OCR 与修正 OCR；修正只影响后续请求。

- [ ] **Step 1: 写失败测试**：修正 OCR 不覆盖原图和原始识别、不自动重发；后续追问使用修正文本；重新识别需确认；无 OCR／断网／检索失败保留各自恢复路径。
- [ ] **Step 2: 运行相关测试，确认修正上下文接口缺失。**
- [ ] **Step 3: 实现上下文 UI 与最小 IPC**：视觉附件明确尺寸／大小／本次发送范围，不上传默认仅本机保存的原始截图；未使用检索时不得出现引用。
- [ ] **Step 4: 运行 `npm test` 并核对第 12、13、27、29 页；验证隐私文案与实际请求一致。**
- [ ] **Step 5: 提交上下文、恢复状态与测试。**

### Task 6: 胶囊工具栏、更多菜单与窗口几何

**Files:**
- Create: `src/main/window-geometry.js`、`tests/window-geometry.test.js`
- Modify: `src/renderer/bubble.html`、`bubble.css`、`bubble.js`
- Modify: `src/main/main.js`、`src/main/store.js`、`src/preload/preload.js`
- Modify: `src/shared/i18n.js`、`tests/electron-smoke.js`

**Interfaces:**
- Consumes: 现有 `bubbleWin`、托盘、框选、历史、设置入口。
- Produces: `snapToolbar(position, size, workArea): {position, edge}`、`clampToWorkArea(bounds, workArea): bounds`、工具栏展开／收起／更多菜单状态；一级动作不重复。

- [ ] **Step 1: 写失败单测**：覆盖四边 `24 DIP` 吸附、`8 DIP` 展开间距、任务栏工作区、外接屏移除回主屏、目标 DPI 重读，以及 `480 × 360 DIP` 在 100%／125%／150% 下的物理尺寸。
- [ ] **Step 2: 运行 `node --test tests/window-geometry.test.js`，确认几何接口缺失。**
- [ ] **Step 3: 实现几何与胶囊 UI**：完整胶囊 ↔ 半胶囊、180 ms 收放、拖动／菜单打开禁止收起；菜单仅设置／隐藏／退出，朝日／近月几何相同。
- [ ] **Step 4: 运行几何单测和 `npm test`；核对第 6、7、8、23、43、47 页并保存四边吸附截图。**
- [ ] **Step 5: 提交工具栏、几何函数与测试。**

### Task 7: 框选遮罩与取景框签名

**Files:**
- Modify: `src/renderer/selection.html`、`selection.css`、`selection.js`
- Modify: `tests/electron-smoke.js`

**Interfaces:**
- Consumes: 现有 `selection:init/finishSelection/cancelSelection` 与每屏 bounds。
- Produces: 使用语义变量的全屏遮罩、直角取景框角、尺寸提示与 Esc 取消；不改变截图坐标。

- [ ] **Step 1: 写失败 smoke**：验证遮罩、尺寸提示、Esc、不同 `scaleFactor` 下返回矩形不被二次缩放。
- [ ] **Step 2: 运行 smoke，确认新视觉状态与 DPI 断言失败。**
- [ ] **Step 3: 实现框选层**：只在 Logo／头像与框选四角使用品牌签名，不加网格、扫描线或发光。
- [ ] **Step 4: 运行 `npm test` 并核对第 4、24 页；比较框选坐标与截图结果。**
- [ ] **Step 5: 提交框选层与测试。**

### Task 8: 设置页与外观阅读设置

**Files:**
- Modify: `src/renderer/settings.html`、`settings.css`、`settings.js`、`settings-advanced.js`
- Modify: `src/renderer/font.html`、`font.css`、`font.js`、`font-utils.js`
- Modify: `src/shared/i18n.js`、`tests/electron-smoke.js`

**Interfaces:**
- Consumes: 现有设置 ID、`getSettings/saveSettings/testConnection/testModelProfile` 与字体接口。
- Produces: 六区固定导航、就地连接反馈、统一“保存更改”、主题／字号／密度实时预览；设置数据模型保持兼容。

- [ ] **Step 1: 写失败 smoke**：覆盖六区导航、所有既有控件仍可操作、快捷键冲突保留旧值、主题与密度即时预览、主按钮和选中态语义色一致。
- [ ] **Step 2: 运行 smoke，确认新导航与外观设置断言失败。**
- [ ] **Step 3: 实现设置页迁移**：不重排业务优先级，不把异常藏入高级配置；代码继续等宽字体，密度不改变控件尺寸。
- [ ] **Step 4: 运行 `npm test` 并核对第 3、15、16、17、18、21、30、31、32、33 页。**
- [ ] **Step 5: 提交设置页、阅读设置与测试。**

### Task 9: 首次配置三步流程

**Files:**
- Modify: `src/renderer/settings.html`、`settings.css`、`settings.js`
- Modify: `src/main/store.js`、`src/shared/i18n.js`
- Modify: `tests/electron-smoke.js`

**Interfaces:**
- Consumes: 现有 `onboarded`、模型测试、快捷键与本机 OCR／视觉设置。
- Produces: `onboardingStep: 1 | 2 | 3` 的 UI 状态；上一步／关闭／稍后配置保留输入，再次进入从未完成步骤继续。

- [ ] **Step 1: 写失败 smoke**：覆盖三步前进后退、失败保留输入、Ollama 可空 Key、完成页唯一主动作以及重新进入恢复步骤。
- [ ] **Step 2: 运行 smoke，确认三步状态尚未实现。**
- [ ] **Step 3: 实现首次配置**：不在日志或诊断暴露密钥；完成页为“开始第一次框选”，完整设置只是次入口。
- [ ] **Step 4: 运行 `npm test` 并核对第 34、35、39、40 页的深浅主题与失败状态。**
- [ ] **Step 5: 提交首次配置与测试。**

### Task 10: 更新、失败恢复、关于与诊断

**Files:**
- Modify: `src/renderer/settings.html`、`settings.css`、`settings.js`、`settings-advanced.js`
- Modify: `src/main/main.js`、`src/preload/preload.js`
- Modify: `src/shared/i18n.js`、`tests/electron-smoke.js`

**Interfaces:**
- Consumes: 现有 `updates:*`、应用版本、外部链接与更新器状态。
- Produces: 版本信息→下载→SHA-256→确认安装的统一状态展示，以及 `window.floatask.getDiagnostics(): Promise<string>`；返回内容仅含版本、系统、DPI、显示配置与脱敏错误码，可在复制前预览。

- [ ] **Step 1: 写失败测试**：校验前安装 disabled、校验失败删除安装包、安装失败保留当前版本、诊断不含 Key／OCR／截图／完整对话。
- [ ] **Step 2: 运行相关测试，确认新增界面与诊断边界断言失败。**
- [ ] **Step 3: 实现更新与关于界面**：不自动重启，不覆盖配置；GitHub／发布说明／MIT／第三方许可使用系统浏览器。
- [ ] **Step 4: 运行 `npm test` 并核对第 36、37、38、41、42 页及三种失败恢复。**
- [ ] **Step 5: 提交更新、关于与测试。**

### Task 11: 历史、收藏与隐私操作

**Files:**
- Modify: `src/renderer/history.html`、`history.css`、`history.js`
- Modify: `src/renderer/settings.html`、`settings.css`、`settings.js`
- Modify: `src/main/history.js`、`src/main/store.js`
- Modify: `tests/electron-smoke.js`

**Interfaces:**
- Consumes: 现有 `history:*` IPC、记录搜索、收藏与恢复会话。
- Produces: 列表／详情并列、同步星标、筛选与就地二次清除确认；恢复历史不自动发送请求，保留期限只清理未收藏记录。

- [ ] **Step 1: 写失败 smoke**：覆盖列表与详情收藏同步、搜索范围、筛选、恢复零模型请求、收藏不被期限清理，以及清除前显示影响范围。
- [ ] **Step 2: 运行 smoke，记录历史与隐私行为差距。**
- [ ] **Step 3: 实现历史与隐私界面**：真实缩略图保留原始截图，不用另一主题示意图冒充；清除不影响 Key 和模型配置。
- [ ] **Step 4: 运行 `npm test` 并核对第 14、17、22、32 页。**
- [ ] **Step 5: 提交历史、隐私与测试。**

### Task 12: Windows 可访问性与实机走查

**Files:**
- Modify: `src/renderer/result.html`、`result.js`、`controls.css`、`focus.js`
- Modify: `tests/electron-smoke.js`
- Create: `docs/verification/floatask-windows-ui.md`

**Interfaces:**
- Consumes: 前面 Task 的主题、焦点、窗口几何、流式状态和设置。
- Produces: 完成／错误／恢复动作的节流 live-region 播报、系统减少动态、系统高对比度以及可追溯的人工验收记录。

- [ ] **Step 1: 写失败 smoke**：流式 token 更新不触发逐字 live 播报，完成只播报一次；减少动态直接到最终状态；高对比度下文字、边界和焦点使用系统色。
- [ ] **Step 2: 运行 smoke，确认辅助行为差距。**
- [ ] **Step 3: 实现最小辅助功能修正**，不隐藏功能反馈，不用 ARIA 重复已有原生语义。
- [ ] **Step 4: 运行 `npm test`，再在 Windows 实机记录 100%／125%／150%、混合 DPI、多显示器、任务栏四边、强制高对比度、纯键盘和屏幕阅读器结果；未执行的项目保持未勾选。**
- [ ] **Step 5: 提交辅助功能、自动测试和真实验收记录。**

### Task 13: 全量回归与逐页设计验收

**Files:**
- Modify: `docs/verification/floatask-windows-ui.md`
- Create: `docs/verification/floatask-page-matrix.md`

**Interfaces:**
- Consumes: 所有前序 Task 的实现和证据。
- Produces: 下文五十页矩阵的实际状态、截图路径、测试链接与未解决差异；不以“看起来差不多”代替验收。

- [ ] **Step 1: 运行 `npm test` 与 `npm run mock`，确认既有及上游保留功能回归全部通过。**
- [ ] **Step 2: 按五十页矩阵逐页检查关联界面**，每页填写实现位置、自动测试、人工截图和差异；设计页不是五十个独立窗口。
- [ ] **Step 3: 运行扩展 fixture**：增加一个虚构 provider、一个额外来源和一个额外设置项，确认滚动／换行／溢出、键盘顺序和双主题正常，随后移除 fixture 数据。
- [ ] **Step 4: 检查 git diff 与依赖变化**，确认没有平行色板、装饰回潮、上游功能回退、业务模块无关重写或真实示例数据硬编码。
- [ ] **Step 5: 将未通过的实机项目明确列为后续问题**，不得将设计渲染成功等同于 Windows 实机通过。
- [ ] **Step 6: 提交最终验证文档和经确认的差异修正。**

## 五十页逐页验收矩阵

“通过”必须同时满足关联功能存在、几何与语义 token 正确、朝日／近月适用页面一致、真实状态可走通。页码是设计索引，不要求一一对应窗口。

| 页 | 验收对象 | 必须看到的证据 |
| --- | --- | --- |
| 01 | 长回答与来源 | 真实长文、章节、列表、来源与完整窗口操作，只有回答视口滚动 |
| 02 | 结果状态 | 加载、流式、停止、错误、重试、设置入口均可到达且无布局跳动 |
| 03 | 设置页 | 六区导航、提供商、表单、视觉开关与高级配置使用统一控件 |
| 04 | 框选与工具栏 | 遮罩、取景框角、尺寸提示、Esc 与胶囊实景，截图坐标正确 |
| 05 | 圆角与边框 | 16／12／10／8／pill、三类描边、共边嵌套，无覆盖修补 |
| 06 | 悬浮工具栏 | 展开与四边半胶囊尺寸、拖动和吸附符合 DIP 规范 |
| 07 | 更多菜单 | 三项功能、展开方向、焦点返回、Esc／外部点击关闭 |
| 08 | 收放过渡 | 180 ms、80 ms 淡出、60 ms 延迟；减少动态直接切换 |
| 09 | 紧凑答案窗 | 480 × 360 DIP、摘要、固定输入区、重新框选／置顶／展开／关闭 |
| 10 | 长内容与滚动 | 固定分区、代码复制、表格与来源，无整窗横向溢出 |
| 11 | 流式跟随 | 底部跟随、向上暂停、回到底部恢复，composer 稳定 |
| 12 | 截图与 OCR 上下文 | 原图、原 OCR、修正 OCR、视觉附件和发送范围清晰 |
| 13 | 空态与恢复 | 无 OCR、截图失败、未配置、断网、检索失败均有正确恢复路径 |
| 14 | 历史与收藏 | 搜索、筛选、列表／详情、同步收藏、恢复不重新请求 |
| 15 | 通用与快捷键 | 录制冲突保留旧值，工具栏／启动／语言／主题设置有效 |
| 16 | 联网检索 | Bing／SearXNG、连接反馈、参数与数据流向，失败可降级 |
| 17 | 历史与隐私 | 本机边界、保留期限、收藏例外、就地二次确认 |
| 18 | 外观与阅读 | 主题、字体、12／14／16、密度预览与减少动态 |
| 19 | 双主题系统 | 同构布局、语义映射、对比度、无重启切换 |
| 20 | 朝日完整答案窗 | 暖白长文、灰雾蓝主操作、辅助文字对比度与固定输入区 |
| 21 | 朝日模型设置 | 与近月同构；选中、主按钮、次操作色彩层级不混用 |
| 22 | 朝日历史 | 同构列表详情；真实历史缩略图保持原始内容并标注来源 |
| 23 | 朝日工具栏菜单 | 胶囊共边圆角、品牌“浮”字标、菜单几何与近月一致 |
| 24 | 朝日框选 | 浅色桌面上的遮罩、框角、提示与胶囊可辨识 |
| 25 | 朝日紧凑答案窗 | 480 × 360 DIP、完整窗口操作、暖白表面与浮层分离 |
| 26 | 朝日流式跟随 | 行为与近月一致，无内容或输入区跳动 |
| 27 | 朝日异常恢复 | 错误色克制，恢复动作与数据发送说明准确 |
| 28 | 朝日长内容 | 浅色代码／表格、局部横向滚动、固定 composer |
| 29 | 朝日截图上下文 | OCR 修正、视觉附件和隐私范围与近月一致 |
| 30 | 朝日通用设置 | 快捷键、工具栏、启动、语言与主题状态一致 |
| 31 | 朝日联网设置 | 服务地址、连接结果、参数与降级说明同构 |
| 32 | 朝日隐私设置 | 暖灰次操作、危险色仅用于必要操作，确认范围清楚 |
| 33 | 朝日外观阅读 | 双主题真实预览、字体与密度不改变控件几何 |
| 34 | 首次配置模型 | 三步、接口与密钥、连接失败保留输入、可稍后配置 |
| 35 | 快捷键与完成 | 快捷键验证、本机 OCR／可选上传、完成页唯一主动作 |
| 36 | 更新下载校验 | 版本、进度、SHA-256、配置保留，确认后才安装 |
| 37 | 更新失败恢复 | 三类失败、安装包处置与当前版本可用性说明准确 |
| 38 | 关于与许可 | 版本、GitHub、发布说明、MIT、第三方许可、脱敏诊断 |
| 39 | 朝日首次配置 | 与第 34 页同构，DPAPI 与恢复规则不丢失 |
| 40 | 朝日快捷键完成 | 与第 35 页同构，隐私边界与胶囊预览正确 |
| 41 | 朝日更新流程 | 与第 36 页同构，校验前 disabled 不只靠颜色表达 |
| 42 | 朝日更新与关于 | 导航、版本、许可、隐私与诊断入口完整 |
| 43 | 多显示器与边缘 | 每屏工作区、任务栏避让、24／8 DIP、外接屏移除恢复 |
| 44 | DPI 与窗口迁移 | 100%／125%／150% 物理尺寸、目标 DPI 重读、无重复缩放 |
| 45 | 键盘焦点 | 1–5 顺序、2 DIP 外描边与偏移、菜单 Esc 层级、disabled 排除 |
| 46 | 高对比度与减少动态 | 系统色优先、标识“系统接管配色”、单次完成／错误播报 |
| 47 | 朝日多显示器 | 与第 43 页同构，浅色拓扑不代表另一套窗口行为 |
| 48 | 朝日 DPI | 与第 44 页同构，DIP 与物理像素说明一致 |
| 49 | 朝日键盘焦点 | 与第 45 页同序，灰雾蓝焦点清晰且不被裁剪 |
| 50 | 朝日系统状态 | 黑色仅系统高对比度示意，有“非朝日／近月主题色”标识 |

## 完成定义

- `npm test` 通过，现有模型／OCR／检索／历史／更新 smoke 不因 UI 迁移回归。
- 每个 Task 有自动测试；涉及视觉与系统行为的页面有对应截图或实机记录。
- 五十页矩阵逐项有状态，未执行项目明确标记，未经验收不写“通过”。
- token、实施规范、设计板和索引保持同步；实现差异必须显式记录并经设计确认。
