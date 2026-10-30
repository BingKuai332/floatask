<div align="center">
  <img src="resources/icon.png" width="92" alt="FloatAsk icon">
  <h1>浮问 FloatAsk</h1>
  <p><strong>框一下，就懂了。</strong></p>
  <p>悬浮在任意软件、网页上的 AI 屏幕理解助手</p>
  <p>
    <img alt="Windows" src="https://img.shields.io/badge/Windows-10%2F11-0078D6?logo=windows&logoColor=white">
    <img alt="Electron" src="https://img.shields.io/badge/Electron-45-47848F?logo=electron&logoColor=white">
    <img alt="Node.js" src="https://img.shields.io/badge/Node.js-22.12%2B-339933?logo=node.js&logoColor=white">
    <img alt="License" src="https://img.shields.io/badge/License-MIT-green">
    <img alt="Status" src="https://img.shields.io/badge/Status-v0.3.2-orange">
  </p>
</div>

> 框选屏幕上任何看不懂的内容，浮问会结合窗口、上下文和联网资料，用几句话说清它是什么、有什么用、和当前场景有什么关系。然后可以在浮窗里继续追问、举例、深入，或联网核查并给出来源。

> **Windows 便携版下载**：[Releases](https://github.com/BingKuai332/floatask/releases/latest)

<p align="center">
  <img src="docs/result.png" width="330" alt="浮问解释窗口">
  <img src="docs/settings.png" width="440" alt="浮问设置界面">
</p>

## 目录

- [为什么做这个](#为什么做这个)
- [功能](#功能)
- [它是怎么工作的](#它是怎么工作的)
- [快速开始](#快速开始)
- [模型配置](#模型配置)
- [使用方式](#使用方式)
- [联网检索](#联网检索)
- [隐私与安全](#隐私与安全)
- [项目结构](#项目结构)
- [技术栈](#技术栈)
- [开发与调试](#开发与调试)
- [打包与发布](#打包与发布)
- [已知限制](#已知限制)
- [Roadmap](#roadmap)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

## 为什么做这个

现在的 AI 很好用，但“把屏幕上的东西交给 AI”这一步很割裂：

- 网页里的术语：复制 → 切到聊天窗口 → 粘贴 → 问“这是什么” → 再切回来。
- IDE 里的报错：复制一段堆栈，丢失了文件、语言、上下文。
- 图表、界面、视频字幕：根本没法复制，只能截图上传。
- 追问时：再复制一次，或者重新描述刚才的内容。

浮问把这条链路压缩成一个动作：**按 `Alt+Q`，在屏幕上框一下。**

| 场景 | 传统做法 | 浮问 |
| --- | --- | --- |
| 网页术语 | 复制、切窗口、粘贴、提问 | 框选后原地解释 |
| IDE 报错 | 复制堆栈，上下文丢失 | 框选报错，同时带上窗口标题/进程 |
| 图表 / 界面 | 截图、上传、描述 | 框选后交给视觉模型 |
| 继续追问 | 重新复制、重新描述 | 在浮窗里连续对话 |
| 想查资料 | 另开搜索，再复制回来 | 一键联网，答案带来源 |

## 功能

| 能力 | 说明 |
| --- | --- |
| **全局框选** | 默认 `Alt+Q`，在任意窗口上拖拽矩形区域；`Esc` 取消 |
| **本地 OCR** | 调用 Windows 自带 OCR，先在本机识别文字，再发给模型 |
| **上下文理解** | 自动读取前台窗口标题/进程名，把“这段内容出现在哪里”一起交给模型 |
| **结构化解释** | 默认回答“是什么 / 有什么用 / 和这里的关系 / 一句话记住” |
| **浮动对话窗** | 置顶、可拖动、可缩放；支持多轮追问、停止生成、复制回答 |
| **联网检索** | 内置必应搜索（免 Key），抓取网页正文，回答中标注来源；支持自建 SearXNG |
| **截图理解** | 可选把压缩截图发给支持视觉的模型，适合图表、界面、无法 OCR 的内容 |
| **中英双语** | 设置中即时切换简体中文 / English，窗口、菜单、状态与模型回答同步切换 |
| **历史与收藏** | 本地自动保存解释与追问，支持全文搜索、收藏、删除、保留收藏清空与恢复对话 |
| **任务模型** | 首次解释、追问、截图可分别覆盖模型、温度与输出长度，也可设置独立服务及加密 Key |
| **快捷键录制** | 直接按组合键录制，支持取消、恢复默认和保存时检测占用 |
| **自动更新** | 自动检查 GitHub Releases，校验下载、重启安装，保留用户数据并在复制失败时回滚 |
| **多模型** | DeepSeek、OpenAI、OpenRouter、Gemini、本地 Ollama，以及任何 OpenAI 兼容接口 |
| **自定义字体** | 列出 Windows 已安装字体，也支持导入 `.ttf/.otf/.ttc/.woff/.woff2`；可应用到阅读内容或整个界面 |
| **悬浮球** | 可拖动到顺手的位置；点一下框选，右键打开设置/退出 |
| **隐私优先** | 没有自建服务器；API Key 使用 Windows DPAPI 加密保存在本机 |
| **便携构建** | 可打包成独立的 Windows x64 目录，不依赖本机 Node.js |

### 界面风格

采用自研的 **工业终端 / 战术面板** 视觉：直角与切角、琥珀色标记、暗色网格、编号分区、等宽标签和细硬边框。整体气质参考战术 HUD，但不使用任何现有作品的角色、标志或素材。

## 它是怎么工作的

```mermaid
flowchart LR
  A["Alt+Q / 悬浮球"] --> B["全屏透明框选层"]
  B --> C["截取屏幕 + 裁剪"]
  C --> D["Windows OCR（本地）"]
  C --> E["前台窗口标题 / 进程"]
  D --> F["构建上下文 Prompt"]
  E --> F
  F --> G{"联网开启？"}
  G -- 是 --> H["Bing / SearXNG 检索"]
  H --> I["网页正文抽取"]
  I --> J["OpenAI 兼容接口"]
  G -- 否 --> J
  J --> K["浮动对话窗（流式输出）"]
  K --> L["多轮追问 / 重新框选 / 联网核查"]
```

几个关键设计：

1. **先截图，再 OCR，再提问**：不依赖目标软件提供可复制文本，因此 IDE、PDF 阅读器、视频、游戏界面都能用。
2. **OCR 在本地完成**：默认只有识别出的文字会离开本机；截图只在开启“截图理解”时发送。
3. **上下文一起打包**：窗口标题、进程名、选中文字、联网资料会组成一个带边界的 Prompt。
4. **浮窗是独立会话**：首次解释、后续追问、来源列表都在同一个上下文里，不需要反复复制。
5. **联网是可选增强**：关闭联网也能解释；开启后先检索，再让模型结合资料回答。

## 快速开始

### 环境要求

- Windows 10 / 11 x64
- Node.js 22.12+（建议 24）
- 可访问模型 API 的网络
- 一个模型服务的 API Key（本地 Ollama 可以不要）

> 应用本身是 Windows 桌面程序；OCR 和窗口捕获依赖 Windows API，暂不支持 macOS / Linux。

### 从源码运行

```powershell
git clone https://github.com/BingKuai332/floatask.git
cd floatask
npm install
npm start
```

首次 `npm install` 会自动下载 Electron 运行时（约 160MB）。如果下载失败，设置镜像后重试：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm start
```

启动后会看到：

- 一个居中的 **浮问设置** 窗口；
- 一个停在屏幕右侧的 **框选** 悬浮球；
- 右下角系统托盘图标（部分受控桌面可能不可用）。

首次启动按下面步骤配置：

1. 选择服务商（推荐 DeepSeek，中文好、速度快）。
2. 填入 API Key；Ollama 可以留空。
3. 点“测试连接”，通过后保存。
4. 按 `Alt+Q`，拖拽框选屏幕内容。

### 没有 API Key 先体验

内置一个本地 mock 模型服务，可以完整跑通框选 → OCR → 浮窗 → 流式回答：

```powershell
npm run mock
```

然后在设置里选择“自定义 / 其他”：

- **Base URL**：`http://127.0.0.1:8787/v1`
- **模型名称**：`mock-model`
- **API Key**：留空

mock 会返回固定的中文解释，用于检查界面和链路，不会产生真实模型费用。

### 构建便携版

```powershell
npm run pack
```

输出：

```text
dist/FloatAsk-win32-x64/
├── FloatAsk.exe
├── Start-FloatAsk.cmd
├── 启动浮问.cmd
└── ...
```

直接运行 `FloatAsk.exe` 即可。如果双击没有反应（常见于受控桌面或远程会话），双击 `Start-FloatAsk.cmd`；它额外带上兼容参数并清理 `ELECTRON_RUN_AS_NODE`。

## 模型配置

任何兼容 `POST /chat/completions` 的服务都可以接入。

| 服务商 | Base URL | 模型示例 | 视觉 |
| --- | --- | --- | --- |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` | 否 |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` | 是 |
| OpenRouter | `https://openrouter.ai/api/v1` | `google/gemini-2.5-flash` | 是 |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.5-flash` | 是 |
| 本地 Ollama | `http://127.0.0.1:11434/v1` | `qwen2.5vl:7b` | 是 |
| 自定义 | 你的接口地址 | 你的模型名 | 按模型 |

设置项说明：

- **Base URL**：通常以 `/v1` 结尾；也可以直接填完整的 `/chat/completions` 地址。
- **模型名称**：必须与服务商控制台一致。
- **API Key**：只保存在本机；Ollama 或本地兼容服务可以留空。
- **截图理解**：开启后会把压缩后的框选截图发给模型。模型不支持视觉时会自动降级为文字回答。
- **联网检索**：默认开启；每次框选/追问先搜索，再回答。
- **检索服务**：必应（免 Key）、SearXNG（自建实例，需开启 JSON 输出）或关闭。
- **框选快捷键**：点击录制后直接按包含 Ctrl / Alt 的组合键；默认 `Alt+Q`，支持恢复默认与占用检测。
- **悬浮球 / 开机启动**：可分别控制。

## 使用方式

| 操作 | 说明 |
| --- | --- |
| `Alt+Q` | 框选解释（可在设置里更换） |
| 拖拽选区 | 松开鼠标立即截图、OCR、解释 |
| `Esc` | 取消框选 |
| 浮窗输入框 | 继续追问；`Enter` 发送，`Shift+Enter` 换行 |
| “联网”按钮 | 打开/关闭本轮追问的联网检索 |
| “联网核查” | 自动开启联网，追问并给出来源 |
| 图钉按钮 | 切换窗口置顶 |
| 重新框选按钮 | 保留当前窗口，直接开始下一次框选 |
| 关闭按钮 | 隐藏浮窗，悬浮球回来 |
| 悬浮球左键 | 开始框选 |
| 悬浮球右键 | 设置、显示/隐藏悬浮球、退出 |
| 托盘菜单 | 框选解释、解释剪贴板文字、设置、退出 |

### 语言、历史与收藏

设置 → **界面语言** 可立即切换简体中文或 English，无需重启。后续 AI 回答跟随所选语言。

从设置、托盘 / 悬浮球右键菜单或对话窗口的历史按钮打开记录。支持搜索标题、完整消息和来源窗口；选中后可收藏、复制、删除或继续对话。清空操作保留收藏，删除和清空需要再次点击确认。历史保存在用户数据目录的 `history.json`，不包含截图和 API Key。关闭“自动保存历史”后，新的回答不再写入记录，已有记录保留。

### 自定义快捷键

设置 → 使用方式 → **录制快捷键**，按下包含 Ctrl 或 Alt 的组合键（字母、数字、F1–F24、空格或常用导航键）。按 Esc 取消，失去焦点或 30 秒超时会结束录制。保存时如发现占用会保留原快捷键并提示重新录制；启动时仍会为无法注册的快捷键选择备用组合。

### 按任务选择模型

设置 → **按任务配置模型**：首次解释、继续追问、截图理解均可启用覆盖。默认沿用上方的模型服务；可仅改模型名、温度和最大输出 Token，也可开启“独立服务和 API Key”，配置另一家服务。独立服务的 Key 单独加密保存，绝不自动继承默认服务的 Key；留空保留该配置已存的 Key，勾选清除可删除。每项都有独立连接测试。

截图仍需先开启全局“截图理解”。首次解释 / 追问可以各自禁止附图；允许附图时，已启用的“截图理解”任务模型优先。模型拒绝截图时会退回该任务的文字模型。历史不存截图，因此恢复会话的追问使用文字任务配置。

### 自动更新

Windows 便携版默认在启动后及运行期间每 6 小时检查官方 GitHub Releases。设置中可关闭自动检查或手动检查；发现新版本后点击下载，校验通过再点击“重启并安装”。更新保留用户数据目录、历史、设置和导入字体，覆盖前备份应用文件，复制失败时尝试回滚。目录没有写权限时会在退出前报错，不会自动提权。源码运行支持检查，不执行下载安装。

更新源为 `BingKuai332/floatask` 的稳定版 Releases；发布者需同时提供 `FloatAsk-vX.Y.Z-win32-x64.zip` 与同名 `.sha256`。旧版发布没有校验文件时不会自动安装；此功能需先安装 v0.3.0 或更新版本。

### 框选小技巧

- 框住**完整的一句话、一个代码块、一个报错堆栈**，比只框一个词效果更好。
- OCR 对极小字号、低对比度、复杂背景容易出错；可以展开浮窗里的“识别文字”检查。
- 图表、界面、视频画面建议在设置里开启“截图理解”，并选择支持视觉的模型。
- 涉密内容请关闭联网；联网会把选中的文字片段作为搜索词发送给搜索引擎。

### 字体与阅读

设置 → **字体与阅读** → **打开字体设置…**，可以选择 Windows 已安装的字体，并调整字号与行高。示例：

<p align="center">
  <img src="docs/font.png" width="560" alt="字体设置窗口">
</p>

- 字体、字号、行高会实时预览；
- **应用范围**可选“仅解释内容”或“整个界面”：前者只改解释正文、追问和识别文字，后者连按钮、菜单、设置页一起换；
- 字号和行高只作用于阅读内容，界面字号保持原有层级；
- 点 **导入字体文件…** 可以选择自己下载的 `.ttf / .otf / .ttc / .woff / .woff2`（不超过 40MB），导入后会出现在字体列表顶部；
- 安装新系统字体后，重新打开字体窗口即可看到；
- 点“恢复默认”可以回到系统默认字体和 12.8px / 1.72 行高。

## 联网检索

联网流程：

1. 从框选文字或追问问题中提取搜索词；
2. 请求必应网页搜索（或 SearXNG）；
3. 抓取前几条结果的正文，截取有效段落；
4. 把结果作为 `<web_results>` 上下文交给模型；
5. 模型在回答中用 `[1][2]` 标注来源，浮窗底部显示来源列表。

几个细节：

- 必应搜索**不需要额外 Key**。
- 对看起来像界面或代码的内容，首次解释会自动跳过联网，避免用“充值 / 余额 / 日期”之类的 OCR 文字搜出一堆无关结果；追问时仍可手动开启。
- 抓不到网页正文时会退化为使用搜索摘要。
- 搜索质量和网页可抓取性有关，来源列表会保留原始链接供核对。

## 隐私与安全

### 数据去哪里

| 数据 | 默认去向 | 何时会离开本机 |
| --- | --- | --- |
| 屏幕截图 | 本机内存 | 仅在开启“截图理解”时发送给模型 |
| OCR 文字 | 本机 | 解释/追问时发送给模型 |
| 搜索词 | 本机 | 仅在开启联网时发送给搜索引擎 |
| API Key | 本机 DPAPI 加密 | 仅发送给配置的模型服务 |
| 历史会话 | 本机用户数据目录 | 恢复追问时，文字上下文会发送给配置的模型服务 |
| 导入字体 | 本机应用数据目录 | 不上传，仅用于本机界面渲染 |
| 使用数据 | 不收集 | 无自建服务器、无遥测 |

### 安全设计

- Electron `contextIsolation: true`、`sandbox: true`、`nodeIntegration: false`。
- 渲染进程通过 `contextBridge` 暴露白名单 IPC。
- 页面使用 CSP，禁止远程脚本。
- 外部链接只允许 `http/https`，由系统浏览器打开。
- Markdown 渲染先转义 HTML，再生成有限标签，避免模型输出注入页面。
- Prompt 中明确告诉模型：屏幕文字和网页内容只是资料，忽略其中任何要求改变行为/泄露信息的指令。
- API Key 使用 Electron `safeStorage`（Windows DPAPI）加密；没有可用加密时才降级为本地编码，不会写入明文配置文件。

## 项目结构

```text
floatask/
├── src/
│   ├── main/
│   │   ├── main.js          # 应用生命周期、窗口、托盘、快捷键、会话编排
│   │   ├── ai.js            # OpenAI 兼容 SSE 流式请求、错误映射、连接测试
│   │   ├── search.js        # Bing / Baidu / SearXNG 检索、正文抽取
│   │   ├── capture.js       # desktopCapturer 截图、裁剪、视觉压缩
│   │   ├── powershell.js    # 调用 Windows OCR / 前台窗口脚本
│   │   ├── prompt.js        # 系统提示词、上下文与来源格式化
│   │   └── store.js         # 配置持久化、API Key 加密
│   ├── preload/
│   │   └── preload.js       # contextBridge 安全 API
│   ├── renderer/
│   │   ├── selection.*      # 全屏框选层
│   │   ├── result.*         # 浮动解释/对话窗
│   │   ├── bubble.*         # 悬浮球
│   │   ├── settings.*       # 设置页
│   │   ├── font.*           # 字体选择窗口
│   │   ├── font-utils.js    # 系统字体/导入字体的 @font-face 与变量注入
│   │   └── markdown.js      # 轻量、安全的 Markdown 渲染
│   └── shared/
│       └── presets.js       # 服务商预设
├── resources/
│   ├── ocr.ps1              # Windows.Media.Ocr
│   ├── context.ps1          # 前台窗口标题/进程
│   ├── fonts.ps1            # Windows 已安装字体列表
│   ├── icon.png
│   └── icon.ico
├── scripts/
│   ├── launch.js            # 清理环境并启动 Electron
│   ├── ensure-electron.js   # 首次安装时确保运行时存在
│   └── mock-ai.js           # 本地 OpenAI 兼容 mock 服务
├── docs/
│   ├── result.png
│   └── settings.png
├── package.json
└── README.md
```

## 技术栈

| 层 | 选择 |
| --- | --- |
| 桌面容器 | Electron 45 |
| 运行时 | Node.js 22+ |
| 界面 | 原生 HTML / CSS / JavaScript，无前端框架 |
| 截图 | Electron `desktopCapturer` + `nativeImage` |
| OCR | Windows `Windows.Media.Ocr`（PowerShell 5.1 WinRT） |
| 窗口信息 | Win32 `GetForegroundWindow` / `GetWindowText` |
| 模型接口 | OpenAI 兼容 `/chat/completions`，SSE 流式解析 |
| 搜索 | Bing HTML + `cheerio`，Baidu 兜底，SearXNG JSON |
| 密钥存储 | Electron `safeStorage`（Windows DPAPI） |
| 打包 | `@electron/packager` + ASAR |

## 开发与调试

```powershell
# 开发启动
npm run dev

# Electron 回归测试（使用隔离数据与本地 mock，不调用外部模型）
npm test

# 本地 mock 模型
npm run mock

# 生产启动
npm start

# 打包
npm run pack
```

开发提示：

- 主进程日志会输出到启动终端；渲染层可打开 DevTools。
- 应用默认数据目录在 Windows 的 `FloatAsk` 用户数据目录；开发启动器使用项目下的 `.userdata/`，便于隔离测试。
- 不要提交 `.userdata/`、`dist/`、日志和 API Key。
- 需要远程调试时，可以给 Electron 加 `--remote-debugging-port=9222`（启动器会把它放在 Chromium 参数位置）。

## 打包与发布

```powershell
npm run pack
```

运行 `npm run release:assets` 生成带固定目录结构的 ZIP 和 SHA-256 文件，再一起上传 GitHub Releases。仓库已提供 `.github/workflows/release.yml`：推送与 package.json 版本一致的 `vX.Y.Z` 标签后，Windows runner 会测试、打包并发布这两个文件。示例：

```text
FloatAsk-v0.3.2-win32-x64.zip
```


## 已知限制

- 仅支持 Windows；OCR 和窗口捕获依赖 Windows API。
- OCR 使用系统已安装的 Windows OCR 语言包；中英文效果最好，其他语言建议使用视觉模型或手动粘贴。
- DRM/受保护内容、部分独占全屏游戏可能无法截取，截图会失败或变黑。
- OCR 对极小字号、复杂背景、低对比度文字可能出错。
- 多显示器时，框选层出现在鼠标所在的那块屏幕。
- 导入字体文件最大 40MB；导入后会复制到本机应用数据目录，不会上传。
- 联网检索质量取决于搜索引擎和网页可抓取性；抓不到正文时只用摘要。
- 个别受控桌面不显示系统托盘；此时右键悬浮球打开设置或退出。
- 历史仅保存文字、来源和元数据，不保存截图；恢复会话后使用文字上下文继续追问。每条记录最多保留 60,000 字消息和 2,000 字框选文字；最多保留 500 条普通记录（优先淘汰最久未更新的非收藏，收藏不自动删除）。
- 自动更新仅支持已打包的 Windows 便携版；需要可访问 GitHub Releases，且发布包包含 SHA-256 校验文件。

## Roadmap

这些是方向，不是承诺：

- [ ] 多显示器跨屏框选
- [x] 会话历史与收藏
- [ ] OCR 语言选择与图像预处理
- [x] 自定义快捷键录制
- [x] 更细的模型/视觉配置（不同任务用不同模型）
- [x] 英文界面
- [x] 自动更新
- [ ] 插件式检索源

## FAQ

**双击 `FloatAsk.exe` 没反应？**

用同目录下的 `Start-FloatAsk.cmd`。某些受控桌面会设置 `ELECTRON_RUN_AS_NODE` 或限制 Chromium 沙箱，启动器会处理这些情况。

**一定要 API Key 吗？**

使用云端模型需要。可以用本地 Ollama（Base URL `http://127.0.0.1:11434/v1`，Key 留空），或者先用 `npm run mock` 体验界面。

**截图会被上传吗？**

默认不会。截图只在本机做 OCR；只有开启“截图理解”时，压缩后的截图才会发送给你配置的模型服务。

**支持 macOS / Linux 吗？**

暂不支持。框选、Windows OCR、窗口信息都依赖 Windows API。

**识别文字很乱怎么办？**

框选更完整的区域，放大字号，或开启“截图理解”让视觉模型直接看画面；也可以在浮窗里展开“识别文字”手动核对。

**`Alt+Q` 被其他软件占用了？**

打开设置换一个快捷键。启动时如果首选组合被占用，会自动尝试 `Ctrl+Alt+Q` / `Ctrl+Shift+Space`。

**联网搜索需要付费吗？**

必应网页搜索不需要额外 Key；模型调用和搜索服务本身的费用/额度取决于你的服务商。


## License

[MIT](LICENSE) © 2026 FloatAsk
