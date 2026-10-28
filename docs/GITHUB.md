# GitHub 发布信息

这份文件是给仓库首页、About 栏、Topics、Release 和第一次上传用的文案，可以直接复制。

## 1. 仓库信息

| 项目 | 建议值 |
| --- | --- |
| 仓库名 | `floatask` |
| 显示名 | 浮问 FloatAsk |
| 默认分支 | `main` |
| License | MIT |
| 社交预览 | `docs/social-preview.png` |
| 主要语言 | JavaScript / HTML / CSS |

### About 简介（GitHub 右侧 About，建议直接复制）

```text
框一下，就懂了。悬浮在任意窗口上的 AI 屏幕理解助手：Windows 本地 OCR + 上下文解释 + 多轮追问 + 联网来源。工业终端风界面，Windows / Electron。
```

英文版（可选，放在 README 顶部或 About）：

```text
Select any content on your Windows screen and get a context-aware explanation, follow-up chat, and cited web search — right where you are. Local OCR + Electron overlay.
```

### Topics

```text
electron
windows
ai
llm
ocr
screen-capture
overlay
desktop-app
deepseek
openai
productivity
chinese
```

### 不同长度的一句话介绍

**一句话（社交平台）**

> 框一下，就懂了。悬浮在任意窗口上的 AI 屏幕理解助手。

**50 字以内**

> 框选屏幕上任何内容，结合窗口上下文和联网资料，几句话说清它是什么、有什么用。

**100 字左右**

> 浮问 FloatAsk 是一个 Windows 桌面悬浮工具。按 Alt+Q 框选任意软件或网页中的内容，它会用本地 OCR 识别文字、读取来源窗口，再结合上下文和联网资料给出简洁解释；解释窗口里还能继续追问、举例、深入或核查来源。

**English**

> FloatAsk is a floating Windows assistant that explains anything you select on screen. It combines local OCR, foreground-window context, and cited web search, then lets you keep asking questions in a compact always-on-top window.

## 2. 上传前检查

```powershell
cd floatask
git status
```

确认这些内容**不要**提交：

- `node_modules/`
- `dist/`（约 250MB，放到 Release）
- `.userdata/`
- `.electron-cache/`、`.npm-cache/`
- `*.log`
- `mock-last-request.json`
- 任何 API Key、`config.json`、截图/OCR 测试产物

仓库里应该保留：

- `README.md`
- `LICENSE`
- `.gitignore`
- `src/`、`resources/`、`scripts/`
- `docs/settings.png`、`docs/result.png`、`docs/social-preview.png`
- `package.json`、`package-lock.json`

检查 README 图片路径：

```text
docs/result.png
docs/settings.png
resources/icon.png
```

## 3. 第一次上传

```powershell
git init
git add .
git commit -m "feat: initial FloatAsk release"
git branch -M main
git remote add origin https://github.com/BingKuai332/floatask.git
git push -u origin main
```

如果使用 GitHub CLI：

```powershell
gh repo create floatask --public --source=. --remote=origin --push
```

## 4. 发布 v0.1.0

### 构建 Release 资产

```powershell
npm run pack
# 不要在发布包里带上本机配置和缓存
Remove-Item "dist\FloatAsk-win32-x64\userdata" -Recurse -Force -ErrorAction SilentlyContinue
Compress-Archive -Path "dist\FloatAsk-win32-x64\*" -DestinationPath "FloatAsk-v0.1.0-win32-x64.zip" -Force
Get-FileHash "FloatAsk-v0.1.0-win32-x64.zip" -Algorithm SHA256
```

### Release 标题

```text
FloatAsk v0.1.0 — 框一下，就懂了
```

### Release 说明（可直接复制）

```markdown
第一个公开版本，Windows 10/11 x64 便携版。

## 亮点

- 全局 `Alt+Q` 框选，悬浮在任何软件/网页上方
- Windows 本地 OCR，截图默认不上传
- 结合来源窗口标题/进程，给出“是什么 / 有什么用 / 和这里的关系”
- 浮动对话窗，支持多轮追问、停止生成、复制回答
- 联网检索（Bing 免 Key / SearXNG），回答带来源
- 字体选择窗口：系统已安装字体 + 导入 `.ttf/.otf/.ttc/.woff/.woff2`，可应用到阅读内容或整个界面
- 工业终端 / 战术面板风格界面，直角切角、琥珀色标记和暗色网格
- 可选截图理解，支持 DeepSeek / OpenAI / OpenRouter / Gemini / Ollama / 自定义接口
- API Key 使用 Windows DPAPI 加密保存在本机

## 使用

1. 解压后运行 `FloatAsk.exe`
2. 如果双击没有反应（受控桌面/远程会话），运行 `Start-FloatAsk.cmd`
3. 首次启动填入 API Key，保存
4. 按 `Alt+Q` 框选屏幕内容

## 说明

- 免安装便携版，不包含 API Key，需要自备模型服务
- 仅支持 Windows 10/11 x64
- 已知限制、隐私说明见 README

## SHA256

`<把 Get-FileHash 的结果填在这里>`
```

### 资产命名

```text
FloatAsk-v0.1.0-win32-x64.zip
```

## 5. 仓库设置建议

- **Settings → General → Social preview**：上传 `docs/social-preview.png`
- **Settings → General → Features**：开启 Issues；需要讨论区再开启 Discussions
- **Settings → Pages**：不需要
- **Topics**：填上面的 12 个
- **Releases**：`v0.1.0`，附 zip 和 SHA256
- **About**：粘贴上面的简介，勾选 “Releases / Packages” 中合适的一项
- 如果以后加 CI，可以增加 Windows 构建 workflow，但当前版本不依赖 CI

## 6. 推荐的第一条 Issue / Roadmap

```markdown
## v0.1.0 后续计划

- [ ] 多显示器跨屏框选
- [ ] 会话历史与收藏
- [ ] OCR 语言选择与图像预处理
- [ ] 自定义快捷键录制
- [ ] 英文界面
- [ ] 自动更新

欢迎在 Issues 里补充使用场景和问题。
```
