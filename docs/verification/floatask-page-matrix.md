# FloatAsk「朝日／近月」五十页逐页验收矩阵

> 状态图例：**✅ 自动证据通过**（smoke/单测，可复跑）· **🖼 截图比对**（渲染图对照设计稿）· **🖥 实机待验**（未执行，保持未勾选）· **⚠ 差异/限制**
> 截图路径相对仓库根：`shots/`（smoke 以 `FLOATASK_TEST_SHOTS=shots` 生成，gitignored；捕获时铺中性底色，圆角卡片不再呈现黑圈）。
> 更新：2026-10-31（返修轮 review fixes 1–7 与视觉交叉审核，`d0e279f` 之后共 15 个提交至 `ec4b568`）

| 页 | 验收对象 | 实现位置 | 自动证据 | 截图/实机 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 01 | 长回答与来源 | result.html/css `#messages` 视口+来源卡 | smoke 长流+代码溢出+隔离滚动 | 🖼 task4-expanded-dark | ✅＋🖥滚动实机 |
| 02 | 结果状态 | result.js setStatus/骨架/错误卡 | smoke 全状态回归 | — | ✅（停止/重试为既有流） |
| 03 | 设置页 | settings.html 六区导航+provider 卡片 | smoke 导航/六卡/夹具 | — | ✅（provider-card 已 token 化） |
| 04 | 框选与工具栏 | selection.css/html 遮罩+取景框角 | smoke 遮罩色/无 glow/四角/尺寸/Esc | — | ✅＋🖥拖拽实机 |
| 05 | 圆角与边框 | controls.css+生成 theme.css | design-tokens.test 半径/描边/焦点 | — | ✅ |
| 06 | 悬浮工具栏 | bubble.*+window-geometry.js | 单测 7/7+smoke 348×72 | — | ✅＋🖥吸附实机 |
| 07 | 更多菜单 | bubble.html fa-menu+focusMenu | smoke 三项/Esc/焦点返回 | — | ✅ |
| 08 | 收放过渡 | bubble.css motion token | 减少动态=直切（CSS 测试） | — | ✅（180/80/60 逐帧未验） |
| 09 | 紧凑答案窗 | main.js 480×360+result 紧凑态 | smoke 尺寸/模式/操作保留 | 🖼 task4-compact-dark | ✅＋🖥 |
| 10 | 长内容与滚动 | result.css pre/table 横向滚动+代码块复制 | smoke overflow-x/隔离滚动/复制按钮文案·位置·剪贴板往返 | — | ✅（复制按钮位于代码块右上角，fix 4） |
| 11 | 流式跟随 | result.js follow 门控+回到底部 | smoke 50 段真实流式全行为 | — | ✅ |
| 12 | 截图与 OCR 上下文 | result 上下文面板+session:correct-ocr | smoke raw/corrected/附件；覆盖确认守卫全入口（按钮/IPC/剪贴板，拒绝+接受） | — | ✅（守卫在主进程，fix 2） |
| 13 | 空态与恢复 | 既有错误卡/手动面板+守卫 | smoke 恢复路径回归 | — | ✅（断网/检索失败逐页截图未做） |
| 14 | 历史与收藏 | history.* 星标同步+类型筛选 | smoke 双向同步/筛选/搜索 | — | ✅ |
| 15 | 通用与快捷键 | settings general 面板 | smoke 录制/冲突保留旧值 | — | ✅ |
| 16 | 联网检索 | settings web 面板（上游逻辑保留） | smoke web 开关/停止检索 | — | ✅ |
| 17 | 历史与隐私 | settings privacy：保留期限+清除卡 | 单测 retention/purge+smoke 清除范围 | — | ✅ |
| 18 | 外观与阅读 | settings appearance：主题/字号/密度+预览 | smoke 预览先于保存/密度 | — | ✅ |
| 19 | 双主题系统 | theme.css 双块+theme.js | smoke 三窗广播/语义变量切换 | — | ✅ |
| 20 | 朝日完整答案窗 | 同 01（token 自动适配） | smoke 亮色：标题栏同面透明、选中态=accent token | 🖼 task4-compact-light | ✅＋🖥对比度实机（标题栏回归已修，fix 3） |
| 21 | 朝日模型设置 | 同 03 | smoke 夹具亮色断言 | — | ✅ |
| 22 | 朝日历史 | 同 14（token 驱动） | smoke 亮色主题切换覆盖 | — | ✅（历史无缩略图=上游不存图，非伪造） |
| 23 | 朝日工具栏菜单 | 同 06/07 | 单测+smoke（几何主题无关） | — | ✅ |
| 24 | 朝日框选 | 同 04 | smoke 遮罩 token | — | ✅＋🖥浅色桌面辨识 |
| 25 | 朝日紧凑答案窗 | 同 09 | smoke 尺寸+亮色+标题栏同面 | 🖼 task4-compact-light | ✅（fix 3） |
| 26 | 朝日流式跟随 | 同 11 | smoke 亮色下跟随 | — | ✅ |
| 27 | 朝日异常恢复 | 同 13 | smoke 亮色错误卡颜色 | — | ✅ |
| 28 | 朝日长内容 | 同 10 | smoke 亮色代码块+复制按钮 | — | ✅（fix 4） |
| 29 | 朝日截图上下文 | 同 12 | smoke 附件披露 | — | ✅ |
| 30 | 朝日通用设置 | 同 15 | smoke | — | ✅ |
| 31 | 朝日联网设置 | 同 16 | smoke | — | ✅ |
| 32 | 朝日隐私设置 | 同 17 | smoke+单测 | — | ✅ |
| 33 | 朝日外观阅读 | 同 18 | smoke 亮色预览 | — | ✅ |
| 34 | 首次配置模型 | settings.html onboarding pane1 | smoke 首现/失败保留/ollama 免 Key/输入即存/关窗 flush/已存密钥满足校验 | — | ✅（fix 1） |
| 35 | 快捷键与完成 | onboarding pane2/3 | smoke 录制委托/唯一主动作/恢复从未完成步骤 | — | ✅（fix 1） |
| 36 | 更新下载校验 | settings updates（上游 updater） | smoke 检查/下载禁用/安装门控 | — | ✅（dev 构建不可达下载） |
| 37 | 更新失败恢复 | 上游 updater 错误码+i18n 文案 | updater 单测（corruption/rollback） | — | ✅（打包版走查待做） |
| 38 | 关于与许可 | settings about 卡片+诊断 | smoke 外链/诊断边界+单测 | — | ✅（MiSans 完整许可原文已随包，fix 7） |
| 39 | 朝日首次配置 | 同 34 | smoke（token 驱动+fix 1） | — | ✅ |
| 40 | 朝日快捷键完成 | 同 35 | smoke（fix 1） | — | ✅ |
| 41 | 朝日更新流程 | 同 36 | smoke disabled 门控 | — | ✅ |
| 42 | 朝日更新与关于 | 同 38 | smoke | — | ✅ |
| 43 | 多显示器与边缘 | window-geometry+display-removed | 单测 clamp/snap | — | 🖥全部实机待验 |
| 44 | DPI 与窗口迁移 | physicalSize+capture ratio | 单测 100/125/150% | — | 🖥混合 DPI 实机待验 |
| 45 | 键盘焦点 | controls.css :focus-visible+focusMenu | smoke 2px/2px/disabled/Esc | — | ✅＋🖥纯键盘全程 |
| 46 | 高对比度与减少动态 | theme.css forced-colors+reduced-motion | 单测系统色映射/变量置零/新描边 token 接管 | — | ✅（真实 HC 环境待验） |
| 47 | 朝日多显示器 | 同 43 | 单测 | — | 🖥 |
| 48 | 朝日 DPI | 同 44 | 单测 | — | 🖥 |
| 49 | 朝日键盘焦点 | 同 45 | smoke 亮色焦点 | — | ✅ |
| 50 | 朝日系统状态 | 同 46（设计稿带"系统接管配色"标识） | 单测 | — | ✅（标识在生成 CSS 注释与设计稿） |

## 汇总

- 自动证据通过：50/50 页的功能面（其中 43/44/47/48 的几何正确性由单测保证，实机行为待验）。
- 第四轮（2026-10-31 晚，实机+子代理调查驱动）：答案摘要窗默认 800×1425（token v1.4.4，用户定向调整，页 9/25 基线被取代并登记）；用户拖拽尺寸按模式记忆（resultSize）；跟随滚动真实竞态修复（仅视口确在底部才自动跟随、阅读中重建卡片不强制回底、overflow-anchor 关闭）；新建窗口推送权威主题（localStorage 同步预涂 + broadcastTheme）；胶囊菜单增长 bounds 在隐藏时还原；调查结论：用户深色胶囊/白边截图系旧构建产物（时间线+asar 证据），打包产物与单实例锁核验无误。
- 截图比对：10 张（task4 紧凑/展开 × 深浅、settings/updates/history/result × en、settings-light、history-light、font-zh 迁移对照），全部铺中性底色生成；桌面级前后对照见 `shots/debug-desktop.png`（修复前，窗口下垫一层透明白）与 `shots/debug-desktop2.png`（修复后）。
- 实机待验：见 `floatask-windows-ui.md` 13 项，全部保持 `[ ]`——本轮仍为声明，未执行。
- 扩展 fixture：虚构 provider+设置项注入→几何不溢出/Tab 序/双主题→移除（smoke 通过）。

## 返修轮（2026-10-31，复核结论驱动）

| 修复 | 内容 | 提交 |
| --- | --- | --- |
| fix 1 | 首次配置输入即存（防抖+关窗 flush+pagehide），已存密钥满足校验且不回显；保守快照不改写存量端点 | 9a4b089 |
| fix 2 | OCR 覆盖确认守卫移至主进程，覆盖重新框选/Alt+Q/Alt+Shift+Q/托盘/胶囊/剪贴板解释全入口；附 Electron 45 剪贴板 thenable 兼容修复 | c3ad45b |
| fix 3 | result.css 旧色值/微型字号/散列圆角全部 token 化；朝日标题栏同面；token v1.4.3（microText、mini/compact/media 半径、border-danger） | b8a833c、368be9f |
| fix 4 | 代码块右上角复制按钮（第 10 页），结果窗与历史窗同享委托实现 | c73cfd6、31fc526 |
| fix 5 | 字体导入窗口整体迁移至 graphite 系统（去 tactical terminal 层） | 41bde62、7ae2cc3 |
| fix 6 | 组件几何常量录入 token 源（expandedSize、collapsedOuterRadius、readingDensity），主进程 design-constants 单源 | 9605e81 |
| fix 7 | MiSans 官方许可原文（中英全文）随包附上 | 5255868 |

## 已登记差异 / 后续问题

1. ~~font.css 残留旧色板~~ → 已解决（fix 5，字体窗迁移完成，截图 font-zh）。
2. ~~代码块"复制"按钮未实现~~ → 已解决（fix 4）。
3. translate.css / settings.css 仍有零星非 token 字面量（终审 M7 备注，不影响验收）：建议下一轮统一纳入源码扫描护栏。
4. 守卫 askRenderer 内层 20s 定时器与 15s 守卫超时并存（review Minor）：方向安全（超时=拒绝），暂留。
5. 设计页 46/50 的"系统接管配色"标识存在于设计稿与生成 CSS 注释；应用内真实高对比度由系统接管，无需应用内标识。
6. 设置窗主操作位于底部栏（Cancel / 保存并开始使用），设计稿（page-30 等）为右上角"保存更改"且无底栏：属既有实现决策（task 8 统一保存语义），功能等价，本轮不改版；如需贴合稿面另开任务评估改动面。
7. 视觉交叉审核（2026-10-31，独立子代理逐页对照+像素采样）结论：双主题 token 精确一致、圆角层级合规、四个修复点确认生效；唯一必改项"答案窗卡面分层条纹"已修（见上条提交），已登记项：设置侧栏导航无图标、provider 选中卡无 ✓、历史窗筛选/详情主操作形态（均为实现决策，功能等价）；About 重复产品名已修。
8. 朝日主题下的设置/历史窗无截图证据、更新下载进行中态无截图：设置/历史已补（settings-light、history-light）；更新下载进行中需打包版，仍待做。
9. 真实桌面窗口白边根因已修：Electron 45 在 Windows 11 上 `transparent: true` 窗口会被 DWM 合成一层透明白色 material 垫底（桌面级"大一圈白边"，非截图伪影）；全部 7 个窗口加 `backgroundMaterial: 'none'` 后消除（桌面实拍前后对照见 shots/debug-desktop*.png，gitignored）。
10. 第三轮实机走查（2026-10-31 晚，用户实拍驱动）：阅读预览原样显示 `<b>` 标签（data-i18n 的 textContent 毁标签，改 data-i18n-html）；胶囊/历史窗建窗瞬间反色闪烁（theme.js 加 localStorage 同步预涂）；设置底部栏移除、保存更改移至右上角（对齐 page-30/33，X 为取消并还原未保存预览）；smoke 新增亮主题下历史/胶囊/更多菜单计算色探针。用户截图中设置窗底部白色角块实为底部栏矩形与卡片圆角重叠所致，底栏移除后消失；窗口边缘像素经 alpha 通道验证为全透明（A≤8/255，仅卡片投影尾部）。
