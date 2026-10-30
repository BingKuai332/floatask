# FloatAsk「朝日／近月」五十页逐页验收矩阵

> 状态图例：**✅ 自动证据通过**（smoke/单测，可复跑）· **🖼 截图比对**（渲染图对照设计稿）· **🖥 实机待验**（未执行，保持未勾选）· **⚠ 差异/限制**
> 截图路径相对仓库根：`shots/`（smoke 以 `FLOATASK_TEST_SHOTS=shots` 生成，gitignored）。
> 更新：2026-10-31 · 基线 `d0e279f..main`（Task 13）

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
| 10 | 长内容与滚动 | result.css pre/table 横向滚动 | smoke overflow-x + 隔离滚动 | — | ✅（代码复制按钮未加） |
| 11 | 流式跟随 | result.js follow 门控+回到底部 | smoke 50 段真实流式全行为 | — | ✅ |
| 12 | 截图与 OCR 上下文 | result 上下文面板+session:correct-ocr | smoke raw/corrected/附件/确认守卫 | — | ✅ |
| 13 | 空态与恢复 | 既有错误卡/手动面板+守卫 | smoke 恢复路径回归 | — | ✅（断网/检索失败逐页截图未做） |
| 14 | 历史与收藏 | history.* 星标同步+类型筛选 | smoke 双向同步/筛选/搜索 | — | ✅ |
| 15 | 通用与快捷键 | settings general 面板 | smoke 录制/冲突保留旧值 | — | ✅ |
| 16 | 联网检索 | settings web 面板（上游逻辑保留） | smoke web 开关/停止检索 | — | ✅ |
| 17 | 历史与隐私 | settings privacy：保留期限+清除卡 | 单测 retention/purge+smoke 清除范围 | — | ✅ |
| 18 | 外观与阅读 | settings appearance：主题/字号/密度+预览 | smoke 预览先于保存/密度 | — | ✅ |
| 19 | 双主题系统 | theme.css 双块+theme.js | smoke 三窗广播/语义变量切换 | — | ✅ |
| 20 | 朝日完整答案窗 | 同 01（token 自动适配） | smoke 亮色计算色 | 🖼 task4-compact-light | ✅＋🖥对比度实机 |
| 21 | 朝日模型设置 | 同 03 | smoke 夹具亮色断言 | — | ✅ |
| 22 | 朝日历史 | 同 14（token 驱动） | smoke 亮色主题切换覆盖 | — | ✅（历史无缩略图=上游不存图，非伪造） |
| 23 | 朝日工具栏菜单 | 同 06/07 | 单测+smoke（几何主题无关） | — | ✅ |
| 24 | 朝日框选 | 同 04 | smoke 遮罩 token | — | ✅＋🖥浅色桌面辨识 |
| 25 | 朝日紧凑答案窗 | 同 09 | smoke 尺寸+亮色 | 🖼 task4-compact-light | ✅ |
| 26 | 朝日流式跟随 | 同 11 | smoke 亮色下跟随 | — | ✅ |
| 27 | 朝日异常恢复 | 同 13 | smoke 亮色错误卡颜色 | — | ✅ |
| 28 | 朝日长内容 | 同 10 | smoke 亮色代码块 | — | ✅ |
| 29 | 朝日截图上下文 | 同 12 | smoke 附件披露 | — | ✅ |
| 30 | 朝日通用设置 | 同 15 | smoke | — | ✅ |
| 31 | 朝日联网设置 | 同 16 | smoke | — | ✅ |
| 32 | 朝日隐私设置 | 同 17 | smoke+单测 | — | ✅ |
| 33 | 朝日外观阅读 | 同 18 | smoke 亮色预览 | — | ✅ |
| 34 | 首次配置模型 | settings.html onboarding pane1 | smoke 首现/失败保留/ollama 免 Key | — | ✅ |
| 35 | 快捷键与完成 | onboarding pane2/3 | smoke 录制委托/唯一主动作 | — | ✅ |
| 36 | 更新下载校验 | settings updates（上游 updater） | smoke 检查/下载禁用/安装门控 | — | ✅（dev 构建不可达下载） |
| 37 | 更新失败恢复 | 上游 updater 错误码+i18n 文案 | updater 单测（corruption/rollback） | — | ✅（打包版走查待做） |
| 38 | 关于与许可 | settings about 卡片+诊断 | smoke 外链/诊断边界+单测 | — | ✅ |
| 39 | 朝日首次配置 | 同 34 | smoke（token 驱动） | — | ✅ |
| 40 | 朝日快捷键完成 | 同 35 | smoke | — | ✅ |
| 41 | 朝日更新流程 | 同 36 | smoke disabled 门控 | — | ✅ |
| 42 | 朝日更新与关于 | 同 38 | smoke | — | ✅ |
| 43 | 多显示器与边缘 | window-geometry+display-removed | 单测 clamp/snap | — | 🖥全部实机待验 |
| 44 | DPI 与窗口迁移 | physicalSize+capture ratio | 单测 100/125/150% | — | 🖥混合 DPI 实机待验 |
| 45 | 键盘焦点 | controls.css :focus-visible+focusMenu | smoke 2px/2px/disabled/Esc | — | ✅＋🖥纯键盘全程 |
| 46 | 高对比度与减少动态 | theme.css forced-colors+reduced-motion | 单测系统色映射/变量置零 | — | ✅（真实 HC 环境待验） |
| 47 | 朝日多显示器 | 同 43 | 单测 | — | 🖥 |
| 48 | 朝日 DPI | 同 44 | 单测 | — | 🖥 |
| 49 | 朝日键盘焦点 | 同 45 | smoke 亮色焦点 | — | ✅ |
| 50 | 朝日系统状态 | 同 46（设计稿带"系统接管配色"标识） | 单测 | — | ✅（标识在生成 CSS 注释与设计稿） |

## 汇总

- 自动证据通过：50/50 页的功能面（其中 43/44/47/48 的几何正确性由单测保证，实机行为待验）。
- 截图比对：4 张（task4 紧凑/展开 × 深浅），结构对照设计页 1/9/25 通过。
- 实机待验：见 `floatask-windows-ui.md` 14 项，全部保持 `[ ]`。
- 扩展 fixture：虚构 provider+设置项注入→几何不溢出/Tab 序/双主题→移除（smoke 通过）。

## 已登记差异 / 后续问题

1. **font.css 残留旧色板**（约 21 处琥珀引用）：字体导入窗口未做视觉迁移——不在五十页内，属同一应用，建议后续任务清理。translate.css 已在终审修复轮全部 token 化；settings.css 同步清零。
2. 代码块"复制"按钮未实现（第 10 页角落入口）。
3. 历史页键盘可达性已补星标；其余实机项见验收记录。
4. 设计页 46/50 的"系统接管配色"标识存在于设计稿与生成 CSS 注释；应用内真实高对比度由系统接管，无需应用内标识。
