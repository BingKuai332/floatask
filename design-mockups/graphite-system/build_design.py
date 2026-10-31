from pathlib import Path
import copy
import yaml

ROOT = Path(__file__).resolve().parent
PAGES = ROOT / "pages"
PAGES.mkdir(parents=True, exist_ok=True)

TOKENS = yaml.safe_load((ROOT / "design-tokens.yaml").read_text(encoding="utf-8"))
C = TOKENS["themes"]["dark"]["colors"]
LC = TOKENS["themes"]["light"]["colors"]
R = TOKENS["radius"]
B = TOKENS["themes"]["dark"]["borders"]
LB = TOKENS["themes"]["light"]["borders"]
FONT = {"latin": TOKENS["fonts"]["latin"], "ea": TOKENS["fonts"]["cjk"]}


def fill(color):
    return {"type": "solid", "color": color}


def text(eid, x, y, w, h, value, size=14, color=None, bold=False,
         align=None, wrap=False, line=1.5, spacing=None):
    content = {
        "fontSize": size, "color": color or C["body"], "fontFamily": FONT,
        "lineHeight": line, "wrap": wrap, "text": value,
    }
    if bold:
        content["bold"] = True
    if align:
        content["align"] = align
    if spacing is not None:
        content["letterSpacing"] = spacing
    return {"elementId": eid, "elementType": "text", "bounds": [x, y, w, h], "content": content}


def rounded_path(w, h, radius):
    r = min(w, h) / 2 if radius == "pill" else min(radius, w / 2, h / 2)
    return (f"M {r},0 H {w-r} Q {w},0 {w},{r} V {h-r} "
            f"Q {w},{h} {w-r},{h} H {r} Q 0,{h} 0,{h-r} "
            f"V {r} Q 0,0 {r},0 Z")


def shape(eid, x, y, w, h, color, radius=0, border=None, shadow=None, opacity=None):
    item = {
        "elementId": eid, "elementType": "shape", "bounds": [x, y, w, h],
        "shapeName": "custom" if radius else "rect", "fill": fill(color),
    }
    if radius:
        item["viewBox"] = [w, h]
        item["path"] = rounded_path(w, h, radius)
    if border:
        item["border"] = border
    if shadow:
        item["shadow"] = shadow
    if opacity is not None:
        item["opacity"] = opacity
    return item


def left_rounded(eid, x, y, w, h, color, radius, border=None):
    r = min(radius, w / 2, h / 2)
    item = {
        "elementId": eid, "elementType": "shape", "bounds": [x, y, w, h],
        "shapeName": "custom", "viewBox": [w, h], "fill": fill(color),
        "path": (f"M {r},0 H {w} V {h} H {r} Q 0,{h} 0,{h-r} "
                 f"V {r} Q 0,0 {r},0 Z"),
    }
    if border:
        item["border"] = border
    return item


def bottom_rounded(eid, x, y, w, h, color, radius, border=None):
    r = min(radius, w / 2, h / 2)
    item = {
        "elementId": eid, "elementType": "shape", "bounds": [x, y, w, h],
        "shapeName": "custom", "viewBox": [w, h], "fill": fill(color),
        "path": (f"M 0,0 H {w} V {h-r} Q {w},{h} {w-r},{h} "
                 f"H {r} Q 0,{h} 0,{h-r} Z"),
    }
    if border:
        item["border"] = border
    return item


def right_rounded(eid, x, y, w, h, color, radius, border=None):
    r = min(radius, w / 2, h / 2)
    item = {
        "elementId": eid, "elementType": "shape", "bounds": [x, y, w, h],
        "shapeName": "custom", "viewBox": [w, h], "fill": fill(color),
        "path": (f"M 0,0 H {w-r} Q {w},0 {w},{r} V {h-r} "
                 f"Q {w},{h} {w-r},{h} H 0 Z"),
    }
    if border:
        item["border"] = border
    return item


def top_rounded(eid, x, y, w, h, color, radius, border=None):
    r = min(radius, w / 2, h / 2)
    item = {
        "elementId": eid, "elementType": "shape", "bounds": [x, y, w, h],
        "shapeName": "custom", "viewBox": [w, h], "fill": fill(color),
        "path": (f"M {r},0 H {w-r} Q {w},0 {w},{r} V {h} H 0 "
                 f"V {r} Q 0,0 {r},0 Z"),
    }
    if border:
        item["border"] = border
    return item


def circle(eid, x, y, d, color, border=None):
    item = {"elementId": eid, "elementType": "shape", "bounds": [x, y, d, d],
            "shapeName": "ellipse", "fill": fill(color)}
    if border:
        item["border"] = border
    return item


def icon(eid, x, y, size, name, color=None, w=None):
    return {"elementId": eid, "elementType": "icon", "bounds": [x, y, w or size, size],
            "iconName": name, "fill": fill(color or C["muted"])}


def base_page(index, title_value, subtitle):
    return {
        "pageType": "content",
        "background": fill(C["bg"]),
        "elements": [
            text("kicker", 64, 34, 700, 20, f"FLOATASK · GRAPHITE DESIGN SYSTEM / {index:02d}",
                 11, C["muted"], spacing=2),
            text("page-title", 64, 65, 700, 42, title_value, 29, C["text"], True),
            text("page-subtitle", 64, 110, 1000, 24, subtitle, 13, C["muted"]),
        ],
    }


def app_window(elements, eid, x, y, w, h, context="Transformer · 屏幕框选", status="已完成", full=True):
    elements.extend([
        shape(eid, x, y, w, h, C["surface"], R["window"], B["floating"],
              {"blur": 38, "color": "#00000066", "offset": [0, 14]}),
        shape(eid + "-logo-bg", x + 24, y + 16, 32, 32, C["accentSoft"], R["small"]),
        icon(eid + "-logo", x + 32, y + 24, 16, "fas:crop-simple", C["accent"]),
        text(eid + "-brand", x + 68, y + 14, 100, 26, "浮问", 19, C["text"], True),
        text(eid + "-brand-en", x + 69, y + 40, 100, 12, "FLOATASK", 8, C["muted"], spacing=1.8),
        circle(eid + "-status-dot", x + w - (340 if full else 150), y + 29, 6, C["green"]),
        text(eid + "-status", x + w - (328 if full else 138), y + 22, 60, 20, status, 11, C["muted"]),
    ])
    if full:
        names = ["fas:crop-simple", "fas:thumbtack", "far:clock", "fas:gear", "fas:xmark"]
        start = x + w - 220
        for i, name in enumerate(names):
            elements.append(icon(f"{eid}-action-{i}", start + i * 42, y + 24, 15, name, C["muted"]))
    else:
        elements.append(icon(eid + "-close", x + w - 42, y + 24, 15, "fas:xmark", C["muted"]))
    elements.extend([
        shape(eid + "-head-line", x, y + 63, w, 1, C["divider"]),
        shape(eid + "-context-bg", x + 1, y + 64, w - 2, 43, C["surface2"]),
        icon(eid + "-context-icon", x + 24, y + 78, 14, "fas:crop-simple", C["accent"]),
        text(eid + "-context", x + 48, y + 73, w - 300, 24, context, 12, C["muted"]),
        text(eid + "-model", x + w - 190, y + 73, 120, 24, "DeepSeek", 11, C["muted"], align=["right", "top"]),
        icon(eid + "-chevron", x + w - 48, y + 80, 11, "fas:chevron-down", C["muted"]),
        shape(eid + "-context-line", x, y + 106, w, 1, C["divider"]),
    ])


def composer(elements, eid, x, y, w, streaming=False, compact=False):
    chip_y = y
    labels = [("更通俗", 72), ("举个例子", 82), ("深入一点", 82), ("联网核查", 92)]
    cx = x
    for i, (label, cw) in enumerate(labels):
        elements.extend([
            shape(f"{eid}-chip-{i}", cx, chip_y, cw, 28, C["surface3"], R["small"]),
            text(f"{eid}-chip-text-{i}", cx, chip_y, cw, 28, label, 11, C["muted"], align=["center", "middle"]),
        ])
        cx += cw + 8
    box_y = y + 40
    elements.extend([
        shape(eid + "-box", x, box_y, w, 58, C["surface2"], R["container"], B["control"]),
        icon(eid + "-web", x + 18, box_y + 21, 15, "fas:globe", C["accent"]),
        text(eid + "-web-text", x + 41, box_y + 17, 40, 24, "联网", 11, C["accent"]),
        shape(eid + "-sep", x + 90, box_y + 14, 1, 30, C["divider"]),
        text(eid + "-placeholder", x + 108, box_y + 13, w - 190, 32,
             "正在生成回答…" if streaming else "继续追问，或让我查一下…", 13, C["muted"], align=["left", "middle"]),
        shape(eid + "-send", x + w - 54, box_y + 8, 42, 42,
              C["redSoft"] if streaming else C["primaryButton"], R["control"]),
        icon(eid + "-send-icon", x + w - 41, box_y + 21, 16,
             "fas:stop" if streaming else "fas:arrow-up", C["red"] if streaming else C["onPrimary"]),
        text(eid + "-hint", x, box_y + 70, w * 0.55, 18,
             "Esc 停止生成" if streaming else "Enter 发送　·　Shift + Enter 换行", 10, C["muted"]),
        text(eid + "-vision", x + w * 0.55, box_y + 70, w * 0.45, 18,
             "视觉模型 · 截图已压缩" if streaming else "OCR 在本机完成", 10, C["muted"], align=["right", "top"]),
    ])


def page_long_answer():
    p = base_page(1, "长回答与来源", "紧凑行距容纳真实回答；五个窗口操作与视觉模型状态完整保留")
    e = p["elements"]
    x, y, w, h = 64, 154, 810, 812
    app_window(e, "result", x, y, w, h, "Transformer · 技术文章", "已完成", True)
    e.extend([
        shape("avatar", x + 26, y + 128, 28, 28, C["accentSoft"], R["small"]),
        icon("avatar-mark", x + 32, y + 134, 16, "fas:crop-simple", C["accent"]),
        text("answer-name", x + 66, y + 131, 160, 20, "浮问 · 刚刚", 11, C["muted"]),
        text("intro", x + 26, y + 169, w - 52, 52,
             "<p><strong>Transformer</strong> 是一种基于自注意力机制的神经网络架构，用来处理文本、代码等序列数据。</p>",
             15, C["text"], line=1.55, wrap=True),
        text("heading-1", x + 26, y + 229, 300, 24, "它解决什么问题", 16, C["text"], True),
        text("body-1", x + 26, y + 258, w - 52, 45,
             "传统循环网络按顺序处理信息，长文本中的远距离关系容易变弱。Transformer 会让每个词同时关注句子里的其他词，再计算彼此的重要程度。",
             13, C["body"], line=1.5, wrap=True),
        text("heading-2", x + 26, y + 316, 300, 24, "它带来了什么", 16, C["text"], True),
        text("bullets", x + 26, y + 345, w - 52, 67,
             "<p><span style=\"color:#8FA6C9\">•</span>　<strong>理解上下文</strong>：同一个词可以随语境获得不同含义。</p><p><span style=\"color:#8FA6C9\">•</span>　<strong>并行计算</strong>：更适合利用现代硬件进行大规模训练。</p><p><span style=\"color:#8FA6C9\">•</span>　<strong>通用架构</strong>：语言、视觉和多模态模型都能以此为基础。</p>",
             13, C["body"], line=1.48, wrap=True),
        text("heading-3", x + 26, y + 424, 400, 24, "和这段文字的关系", 16, C["text"], True),
        text("body-3", x + 26, y + 453, w - 52, 43,
             "你框选的内容出现在一篇技术文章中。这里的重点是概念解释，不需要先理解公式；可以把它看成模型读取上下文的一种机制。",
             13, C["body"], line=1.5, wrap=True),
        shape("summary-rule", x + 26, y + 510, 3, 38, C["accent"], R["pill"]),
        text("summary", x + 42, y + 508, w - 68, 42,
             "<p><strong>一句话记住</strong>：它让模型学会“看整句话，再决定每个词该关注谁”。</p>",
             13, C["text"], line=1.5, wrap=True),
        shape("sources-rule", x + 26, y + 561, w - 52, 1, C["divider"]),
        text("sources-title", x + 26, y + 574, 200, 20, "参考来源", 11, C["muted"], True),
        circle("source-index-1", x + 26, y + 603, 18, C["accentSoft"]),
        text("source-index-text-1", x + 26, y + 603, 18, 18, "1", 10, C["accent"], align=["center", "middle"]),
        text("source-1", x + 54, y + 600, 450, 21, "Attention Is All You Need", 12, C["body"]),
        text("source-domain-1", x + w - 190, y + 601, 164, 20, "arxiv.org", 10, C["muted"], align=["right", "top"]),
        circle("source-index-2", x + 26, y + 631, 18, C["accentSoft"]),
        text("source-index-text-2", x + 26, y + 631, 18, 18, "2", 10, C["accent"], align=["center", "middle"]),
        text("source-2", x + 54, y + 628, 450, 21, "The Illustrated Transformer", 12, C["body"]),
        text("source-domain-2", x + w - 190, y + 629, 164, 20, "jalammar.github.io", 10, C["muted"], align=["right", "top"]),
        shape("footer-line", x, y + 660, w, 1, C["divider"]),
    ])
    composer(e, "composer", x + 26, y + 674, w - 52)

    sx = 956
    e.extend([
        text("spec-title", sx, 162, 480, 30, "落地约束", 20, C["text"], True),
        text("spec-sub", sx, 201, 520, 42, "组件共享语义 token；浅色模式只替换颜色，不改布局。", 13, C["muted"], wrap=True),
        text("spec-type-title", sx, 266, 300, 24, "阅读密度", 14, C["text"], True),
        text("spec-type", sx, 300, 530, 106,
             "正文 13–14px / 1.5–1.55\n小节标题 16px / 600\n段落间距 6px · 小节间距 14px\n辅助文字不低于 12px / #8A9099",
             13, C["body"], line=1.65, wrap=True),
        shape("spec-rule-1", sx, 424, 500, 1, C["divider"]),
        text("spec-radius-title", sx, 450, 300, 24, "形状与分离", 14, C["text"], True),
        text("spec-radius", sx, 484, 540, 72,
             "窗口 16px · 容器 12px · 控件 10px · 小元素 8px\n同级组件同半径；嵌套轮廓 R内 = R外 − 间距",
             13, C["body"], line=1.65, wrap=True),
        shape("spec-rule-2", sx, 576, 500, 1, C["divider"]),
        text("spec-color-title", sx, 602, 300, 24, "核心颜色", 14, C["text"], True),
    ])
    swatches = [(C["surface"], "Surface"), (C["text"], "Text"), (C["muted"], "Muted"), (C["accent"], "Accent")]
    for i, (color, label) in enumerate(swatches):
        xx = sx + i * 122
        e.extend([
            shape(f"swatch-{i}", xx, 640, 104, 48, color, R["small"], B["control"]),
            text(f"swatch-label-{i}", xx, 698, 104, 20, label, 11, C["muted"], align=["center", "top"]),
        ])
    e.extend([
        shape("signature-box", sx, 756, 74, 74, C["accentSoft"], R["container"], B["control"]),
        icon("signature-icon", sx + 20, 776, 34, "fas:crop-simple", C["accent"]),
        text("signature-title", sx + 94, 758, 360, 24, "取景框角 = 品牌签名", 14, C["text"], True),
        text("signature-copy", sx + 94, 790, 420, 52,
             "只用于头像与框选四角。其余区域保持安静，不重复装饰。", 13, C["muted"], line=1.55, wrap=True),
    ])
    return p


def state_frame(e, eid, x, y, w, h, status):
    app_window(e, eid, x, y, w, h, "Transformer · 屏幕框选", status, False)


def page_states():
    p = base_page(2, "结果状态", "加载、流式与错误状态共享同一窗口骨架，避免状态切换时布局跳动")
    e = p["elements"]
    x, y, w, h = 64, 166, 750, 770
    state_frame(e, "streaming", x, y, w, h, "正在生成")
    e.extend([
        shape("stream-avatar", x + 26, y + 132, 28, 28, C["accentSoft"], R["small"]),
        icon("stream-avatar-icon", x + 32, y + 138, 16, "fas:crop-simple", C["accent"]),
        text("stream-name", x + 66, y + 135, 180, 20, "浮问 · 正在回答", 11, C["muted"]),
        text("stream-content", x + 26, y + 177, w - 52, 190,
             "<p><strong>Transformer</strong> 是一种基于自注意力机制的神经网络架构。</p><p style=\"margin-top:14px\">它让模型在处理一个词时，同时参考句子里的其他词。例如读到“苹果发布了新芯片”时，模型会依据“发布”和“芯片”，判断这里更可能指科技公司。<span style=\"color:#8FA6C9\">▍</span></p>",
             15, C["body"], line=1.62, wrap=True),
        shape("stream-rule", x + 26, y + 392, w - 52, 1, C["divider"]),
        icon("stream-search", x + 26, y + 416, 14, "fas:globe", C["accent"]),
        text("stream-phase", x + 50, y + 410, 500, 26, "已检索 4 个来源 · 正在组织回答", 12, C["muted"]),
        text("stream-note", x + 26, y + 458, w - 52, 46,
             "流式阶段保留稳定的输入区；停止按钮使用语义色，不让整个窗口闪烁。", 13, C["muted"], wrap=True),
        shape("stream-footer", x, y + 620, w, 1, C["divider"]),
    ])
    composer(e, "stream-composer", x + 26, y + 634, w - 52, streaming=True)

    lx, ly, lw, lh = 872, 166, 664, 340
    state_frame(e, "loading", lx, ly, lw, lh, "读取屏幕")
    e.extend([
        icon("loading-icon", lx + 28, ly + 140, 18, "fas:crop-simple", C["accent"]),
        text("loading-title", lx + 58, ly + 134, 400, 28, "正在识别框选内容…", 14, C["text"], True),
        text("loading-sub", lx + 58, ly + 166, 480, 22, "OCR 在本机完成，不会上传截图", 11, C["muted"]),
        shape("skeleton-1", lx + 28, ly + 216, lw - 120, 10, C["surface3"], R["pill"]),
        shape("skeleton-2", lx + 28, ly + 238, lw - 220, 10, C["surface3"], R["pill"]),
        shape("skeleton-3", lx + 28, ly + 260, lw - 320, 10, C["surface3"], R["pill"]),
        text("loading-foot", lx + 28, ly + 296, 500, 20, "随后将结合窗口上下文生成解释", 11, C["muted"]),
    ])

    ex, ey, ew, eh = 872, 548, 664, 388
    state_frame(e, "error", ex, ey, ew, eh, "连接失败")
    e.extend([
        shape("error-symbol", ex + 28, ey + 136, 34, 34, C["redSoft"], R["small"]),
        icon("error-icon", ex + 37, ey + 145, 16, "fas:triangle-exclamation", C["red"]),
        text("error-title", ex + 76, ey + 136, 420, 26, "暂时无法连接模型服务", 15, C["text"], True),
        text("error-body", ex + 76, ey + 170, 520, 44,
             "请检查网络、Base URL 和 API Key。已识别的文字仍保留在本机。", 12, C["muted"], wrap=True),
        shape("error-detail", ex + 28, ey + 230, ew - 56, 54, C["surface2"], R["container"], B["control"]),
        text("error-detail-text", ex + 42, ey + 240, ew - 84, 34,
             "HTTP 401 · Unauthorized", 12, C["red"], align=["left", "middle"]),
        shape("retry", ex + 28, ey + 306, 100, 38, C["primaryButton"], R["control"]),
        text("retry-text", ex + 28, ey + 306, 100, 38, "重试", 12, C["onPrimary"], True, ["center", "middle"]),
        shape("open-settings", ex + 140, ey + 306, 116, 38, C["surface3"], R["control"]),
        text("open-settings-text", ex + 140, ey + 306, 116, 38, "打开设置", 12, C["body"], align=["center", "middle"]),
        text("error-manual", ex + 278, ey + 314, 280, 22, "也可以粘贴文字，手动解释", 11, C["muted"]),
    ])
    return p


def toggle(e, eid, x, y, checked=True, palette=None):
    palette = palette or C
    e.extend([
        shape(eid, x, y, 34, 20, palette["accent"] if checked else palette["surface3"], R["pill"]),
        circle(eid + "-knob", x + (17 if checked else 3), y + 3, 14, palette["onPrimary"] if checked else palette["muted"]),
    ])


def page_settings():
    p = base_page(3, "设置页", "基础配置优先，高级模型策略折叠；左侧导航承接后续设置分类")
    e = p["elements"]
    x, y, w, h = 64, 148, 1472, 794
    e.extend([
        shape("settings-window", x, y, w, h, C["surface"], R["window"], B["floating"],
              {"blur": 40, "color": "#00000066", "offset": [0, 14]}),
        left_rounded("sidebar", x + 1, y + 1, 218, h - 2, C["surface2"], R["window"] - 1),
        shape("sidebar-line", x + 219, y + 1, 1, h - 2, C["divider"]),
        shape("settings-logo-bg", x + 24, y + 22, 34, 34, C["accentSoft"], R["small"]),
        icon("settings-logo", x + 32, y + 30, 18, "fas:crop-simple", C["accent"]),
        text("settings-brand", x + 70, y + 20, 100, 28, "浮问设置", 18, C["text"], True),
        text("settings-brand-sub", x + 70, y + 49, 120, 16, "FLOATASK", 8, C["muted"], spacing=1.8),
    ])
    nav = [("fas:sliders", "模型服务"), ("fas:globe", "联网检索"), ("fas:keyboard", "通用与快捷键"),
           ("fas:shield-halved", "历史与隐私"), ("fas:font", "外观与阅读"), ("fas:rotate", "更新与关于")]
    for i, (ic, label) in enumerate(nav):
        yy = y + 108 + i * 52
        if i == 0:
            e.append(shape("nav-active", x + 14, yy - 7, 190, 40, C["accentSoft"], R["control"]))
        e.extend([
            icon(f"nav-icon-{i}", x + 30, yy + 4, 15, ic, C["accent"] if i == 0 else C["muted"]),
            text(f"nav-text-{i}", x + 58, yy, 130, 26, label, 12, C["text"] if i == 0 else C["muted"]),
        ])
    e.extend([
        text("nav-note", x + 26, y + h - 70, 170, 40, "配置仅保存在本机\nAPI Key 使用系统加密", 10, C["muted"], line=1.5, wrap=True),
        icon("settings-close", x + w - 46, y + 26, 16, "fas:xmark", C["muted"]),
        text("settings-title", x + 258, y + 30, 400, 34, "模型服务", 23, C["text"], True),
        text("settings-desc", x + 258, y + 72, 800, 24, "选择 OpenAI 兼容服务。首次解释、追问与视觉任务可随后分别配置。", 12, C["muted"]),
        shape("save-button", x + w - 166, y + 28, 118, 40, C["primaryButton"], R["control"]),
        text("save-text", x + w - 166, y + 28, 118, 40, "保存更改", 12, C["onPrimary"], True, ["center", "middle"]),
    ])
    providers = [("DS", "DeepSeek", "api.deepseek.com"), ("AI", "OpenAI", "api.openai.com"),
                 ("OR", "OpenRouter", "openrouter.ai"), ("G", "Google Gemini", "generativelanguage.googleapis.com"),
                 ("OL", "本地 Ollama", "127.0.0.1"), ("＋", "自定义服务", "OpenAI 兼容接口")]
    card_w, card_h = 360, 76
    for i, (mark, name, domain) in enumerate(providers):
        col, row = i % 3, i // 3
        xx = x + 258 + col * 382
        yy = y + 122 + row * 90
        active = i == 0
        e.extend([
            shape(f"provider-{i}", xx, yy, card_w, card_h,
                  C["accentSoft"] if active else C["surface2"], R["control"],
                  B["active"] if active else B["control"]),
            shape(f"provider-mark-bg-{i}", xx + 14, yy + 16, 30, 30, C["surface3"], R["small"]),
            text(f"provider-mark-{i}", xx + 14, yy + 16, 30, 30, mark, 10, C["accent"] if active else C["muted"], True, ["center", "middle"]),
            text(f"provider-name-{i}", xx + 56, yy + 12, 210, 24, name, 13, C["text"], True),
            text(f"provider-domain-{i}", xx + 56, yy + 40, 260, 20, domain, 10, C["muted"]),
        ])
        if active:
            e.append(icon("provider-check", xx + 326, yy + 18, 14, "fas:check", C["accent"]))
    fx = x + 258
    fy = y + 320
    toggle(e, "vision-toggle", fx, fy + 206, True)
    e.extend([
        text("base-label", fx, fy, 300, 20, "Base URL", 11, C["muted"], True),
        shape("base-input", fx, fy + 26, 1124, 42, C["surface2"], R["control"], B["control"]),
        text("base-value", fx + 14, fy + 26, 700, 42, "https://api.deepseek.com/v1", 12, C["body"], align=["left", "middle"]),
        text("model-label", fx, fy + 88, 300, 20, "模型名称", 11, C["muted"], True),
        shape("model-input", fx, fy + 114, 548, 42, C["surface2"], R["control"], B["control"]),
        text("model-value", fx + 14, fy + 114, 500, 42, "deepseek-chat", 12, C["body"], align=["left", "middle"]),
        text("key-label", fx + 576, fy + 88, 300, 20, "API Key", 11, C["muted"], True),
        shape("key-input", fx + 576, fy + 114, 548, 42, C["surface2"], R["control"], B["control"]),
        text("key-value", fx + 590, fy + 114, 400, 42, "••••••••••••••••••••", 12, C["body"], align=["left", "middle"]),
        text("key-show", fx + 576 + 472, fy + 114, 60, 42, "显示", 11, C["muted"], align=["center", "middle"]),
        text("key-help", fx + 576, fy + 162, 460, 20, "仅保存在本机，使用 Windows DPAPI 加密", 10, C["muted"]),
        text("vision-title", fx + 48, fy + 200, 160, 24, "截图理解", 12, C["text"], True),
        text("vision-desc", fx + 48, fy + 226, 660, 22, "将压缩后的截图一并发给视觉模型，适合图表和界面。", 11, C["muted"]),
        shape("advanced-row", fx, fy + 272, 1124, 52, C["surface2"], R["container"], B["control"]),
        icon("advanced-icon", fx + 16, fy + 290, 15, "fas:layer-group", C["muted"]),
        text("advanced-title", fx + 44, fy + 282, 520, 28, "按任务使用不同模型", 12, C["body"], True),
        text("advanced-state", fx + 760, fy + 282, 260, 28, "未启用 · 展开配置", 11, C["muted"], align=["right", "middle"]),
        icon("advanced-chevron", fx + 1082, fy + 290, 13, "fas:chevron-down", C["muted"]),
        shape("test-button", fx, fy + 346, 112, 38, C["surface3"], R["control"]),
        text("test-text", fx, fy + 346, 112, 38, "测试连接", 12, C["body"], align=["center", "middle"]),
        circle("test-dot", fx + 130, fy + 362, 7, C["green"]),
        text("test-result", fx + 146, fy + 354, 400, 24, "连接成功 · 218 ms", 11, C["green"]),
        shape("settings-footer", x + 220, y + h - 1, w - 221, 1, C["divider"]),
        text("settings-privacy", fx, y + h - 34, 720, 22, "截图默认只在本机 OCR；开启联网后，检索词会发送给搜索引擎。", 10, C["muted"]),
    ])
    return p


def toolbar(e, eid, x, y, hover=None):
    spec = TOKENS["components"]["toolbar"]
    e.extend([
        shape(eid, x, y, 328, 52, C["surface"], R["pill"], B["floating"],
              {"blur": 26, "color": "#00000077", "offset": [0, 10]}),
        shape(eid + "-logo-bg", x + 5, y + 5, *spec["brandSize"], C["accentSoft"], spec["primaryRadius"]),
        text(eid + "-logo", x + 5, y + 5, *spec["brandSize"], "浮", 14, C["accent"], True, ["center", "middle"]),
        shape(eid + "-primary", x + 50, y + 5, 142, 42, C["accentSoft"], spec["primaryRadius"]),
        icon(eid + "-primary-icon", x + 64, y + 18, 15, "fas:crop-simple", C["accent"]),
        text(eid + "-primary-text", x + 86, y + 11, 38, 30, "框选", 12, C["text"], True, ["left", "middle"]),
        shape(eid + "-key", x + 128, y + 14, 52, 24, C["surface3"], R["small"]),
        text(eid + "-key-text", x + 128, y + 14, 52, 24, "Alt Q", 9, C["muted"], align=["center", "middle"]),
    ])
    actions = [("clipboard", "far:clipboard"), ("history", "far:clock"), ("more", "fas:ellipsis")]
    for i, (name, ic) in enumerate(actions):
        xx = x + 202 + i * 40
        if hover == name:
            e.append(circle(f"{eid}-{name}-hover", xx, y + 9, 34, C["surface3"]))
        e.append(icon(f"{eid}-{name}", xx + 9, y + 18, 16, ic, C["accent"] if hover == name else C["muted"]))


def more_menu(e, eid, x, y, hover="settings"):
    e.extend([
        shape(eid, x, y, 224, 152, C["surface"], R["container"], B["floating"],
              {"blur": 28, "color": "#00000077", "offset": [0, 10]}),
        shape(eid + "-settings-hover", x + 6, y + 6, 212, 36,
              C["surface3"] if hover == "settings" else C["surface"], R["control"]),
        icon(eid + "-settings-icon", x + 18, y + 16, 15, "fas:gear", C["accent"] if hover == "settings" else C["muted"]),
        text(eid + "-settings-text", x + 46, y + 6, 140, 36, "设置", 12, C["text"], align=["left", "middle"]),
        icon(eid + "-hide-icon", x + 18, y + 56, 15, "fas:eye-slash", C["muted"]),
        text(eid + "-hide-text", x + 46, y + 46, 140, 36, "隐藏工具栏", 12, C["body"], align=["left", "middle"]),
        shape(eid + "-divider", x + 12, y + 90, 200, 1, C["divider"]),
        icon(eid + "-quit-icon", x + 18, y + 108, 15, "fas:power-off", C["red"] if hover == "quit" else C["muted"]),
        text(eid + "-quit-text", x + 46, y + 98, 140, 36, "退出浮问", 12,
             C["red"] if hover == "quit" else C["body"], align=["left", "middle"]),
    ])


def collapsed_toolbar(e, eid, x, y, side):
    spec = TOKENS["components"]["toolbar"]
    vertical = side in ("left", "right")
    w, h = (44, 64) if vertical else (64, 44)
    shape_fn = {"left": right_rounded, "right": left_rounded, "top": bottom_rounded, "bottom": top_rounded}[side]
    item = shape_fn(eid, x, y, w, h, C["surface"], 22, B["floating"])
    item["shadow"] = {"blur": 22, "color": "#00000066", "offset": [0, 8]}
    e.append(item)
    lx = x + (6 if vertical else 16)
    ly = y + (16 if vertical else 6)
    e.extend([
        shape(eid + "-logo-bg", lx, ly, spec["logoSize"], spec["logoSize"], C["accentSoft"], spec["collapsedLogoRadius"]),
        text(eid + "-logo", lx, ly, spec["logoSize"], spec["logoSize"], "浮", 14, C["accent"], True, ["center", "middle"]),
    ])


def page_selection():
    p = base_page(4, "框选与悬浮工具栏", "品牌签名集中在取景框四角；遮罩保持克制，选中区域维持清晰可读")
    e = p["elements"]
    x, y, w, h = 64, 148, 1472, 794
    e.extend([
        shape("desktop", x, y, w, h, "#12161C", R["window"], B["floating"]),
        left_rounded("ide-sidebar", x + 1, y + 1, 210, h - 2, "#151A21", R["window"] - 1),
        shape("ide-tabbar", x + 211, y + 1, w - 212, 48, "#181D25"),
        bottom_rounded("ide-status", x + 1, y + h - 30, w - 2, 29, "#1B212A", R["window"] - 1),
        text("ide-title", x + 24, y + 18, 160, 24, "EXPLORER", 10, C["muted"], spacing=1.2),
        text("ide-project", x + 24, y + 62, 170, 24, "FLOATASK", 12, C["body"], True),
        text("ide-files", x + 40, y + 104, 160, 160,
             "▾  src\n　▾  renderer\n　　result.js\n　　theme.css\n　　selection.js\n　▾  main\n　　main.js", 12, C["muted"], line=1.65, wrap=True),
        shape("ide-active-tab", x + 226, y + 10, 156, 38, "#20262F", R["small"]),
        text("ide-tab", x + 244, y + 15, 120, 26, "transformer.py", 11, C["body"]),
        text("code-outside", x + 250, y + 88, 1060, 580,
             "import torch\nimport torch.nn as nn\n\nclass MultiHeadAttention(nn.Module):\n    def __init__(self, hidden_size, heads):\n        super().__init__()\n        self.heads = heads\n        self.attention = nn.Linear(hidden_size, hidden_size)\n\n    def forward(self, query, key, value):\n        scores = query @ key.transpose(-2, -1)\n        weights = torch.softmax(scores, dim=-1)\n        return weights @ value\n\n# Each token learns which other tokens to attend to\n# Context shapes the meaning of the current token",
             13, "#6F7987", line=1.65, wrap=True),
        shape("selection-overlay", x + 1, y + 1, w - 2, h - 2, C["overlay"], R["window"] - 1),
        shape("selection-region", 494, 300, 700, 344, "#8FA6C908", 0,
              {"width": 1, "color": "#8FA6C9CC"}),
        text("code-inside", 520, 326, 650, 280,
             "class MultiHeadAttention(nn.Module):\n    def __init__(self, hidden_size, heads):\n        super().__init__()\n        self.heads = heads\n        self.attention = nn.Linear(hidden_size, hidden_size)\n\n    def forward(self, query, key, value):\n        scores = query @ key.transpose(-2, -1)\n        weights = torch.softmax(scores, dim=-1)\n        return weights @ value",
             13, "#D4DAE3", line=1.65, wrap=True),
    ])
    corners = [(494, 300, "tl"), (1194, 300, "tr"), (494, 644, "bl"), (1194, 644, "br")]
    for cx, cy, pos in corners:
        left = cx - 3 if pos in ("tl", "bl") else cx - 21
        top = cy - 3 if pos in ("tl", "tr") else cy - 21
        e.append(shape(f"corner-h-{pos}", left, top if pos in ("tl", "tr") else cy + 1, 24, 3, C["accent"]))
        e.append(shape(f"corner-v-{pos}", left if pos in ("tl", "bl") else cx + 1, top, 3, 24, C["accent"]))
    e.extend([
        shape("selection-size", 1060, 654, 134, 30, C["surface2"], R["small"], B["control"]),
        text("selection-size-text", 1060, 654, 134, 30, "700 × 344", 11, C["body"], align=["center", "middle"]),
        shape("capture-hint", 568, 176, 464, 48, C["surface2"], R["window"], B["floating"],
              {"blur": 20, "color": "#00000055", "offset": [0, 8]}),
        icon("capture-hint-icon", 590, 191, 17, "fas:crop-simple", C["accent"]),
        text("capture-hint-text", 620, 185, 270, 30, "拖拽框选要解释的内容", 13, C["text"], align=["left", "middle"]),
        shape("capture-key", 902, 187, 54, 26, C["surface3"], R["small"]),
        text("capture-key-text", 902, 187, 54, 26, "Esc", 11, C["muted"], align=["center", "middle"]),
        text("capture-cancel", 964, 185, 50, 30, "取消", 11, C["muted"], align=["left", "middle"]),
        text("selection-caption", 82, 906, 600, 20, "遮罩仅降低干扰；选中区域不额外提亮、不添加扫描线。", 11, C["muted"]),
    ])
    toolbar(e, "bubble", 1168, 848)
    return p


def page_geometry():
    p = base_page(5, "圆角与边框", "四级圆角、三类描边；共边嵌套共享圆心，不使用覆盖矩形修补轮廓")
    e = p["elements"]
    tokens = [
        ("16 px", "外窗 / 大型浮层", R["window"]),
        ("12 px", "容器 / 输入区", R["container"]),
        ("10 px", "输入框 / 按钮 / 卡片", R["control"]),
        ("8 px", "chips / 图标底 / 键帽", R["small"]),
    ]
    for i, (value, label, radius) in enumerate(tokens):
        xx = 64 + i * 224
        e.extend([
            shape(f"radius-sample-{i}", xx, 164, 200, 112, C["surface2"], radius, B["control"]),
            text(f"radius-value-{i}", xx, 296, 200, 30, value, 20, C["text"], True),
            text(f"radius-label-{i}", xx, 332, 200, 36, label, 11, C["muted"], wrap=True),
        ])
    e.extend([
        text("nested-title", 64, 400, 300, 28, "共边嵌套", 16, C["text"], True),
        text("nested-formula", 430, 400, 506, 28, "R内 = R外 − 间距", 14, C["accent"], True, ["right", "top"]),
        shape("nested-window", 64, 446, 872, 306, C["surface"], R["window"], B["floating"],
              {"blur": 28, "color": "#00000055", "offset": [0, 10]}),
        left_rounded("nested-sidebar", 65, 447, 218, 304, C["surface2"], R["window"] - 1),
        shape("nested-divider", 283, 447, 1, 304, C["divider"]),
        shape("nested-logo", 88, 474, 32, 32, C["accentSoft"], R["small"]),
        icon("nested-logo-icon", 96, 482, 16, "fas:crop-simple", C["accent"]),
        text("nested-sidebar-title", 134, 474, 120, 28, "侧栏", 14, C["text"], True),
        text("nested-sidebar-value", 88, 536, 166, 28, "R15 = 16 − 1", 13, C["accent"], True),
        text("nested-sidebar-copy", 88, 574, 164, 66, "内缩 1 px\n左侧圆角同步减小\n右侧保持直角", 11, C["muted"], line=1.65, wrap=True),
        text("nested-content-title", 322, 474, 300, 30, "内容区", 16, C["text"], True),
        text("nested-content-copy", 322, 522, 540, 62,
             "外窗与侧栏不是两个独立圆角矩形。\n它们共用一条连续的外轮廓。", 13, C["body"], line=1.6, wrap=True),
        shape("nested-control", 322, 626, 180, 48, C["surface2"], R["control"], B["control"]),
        text("nested-control-text", 322, 626, 180, 48, "独立控件 · R10", 12, C["muted"], align=["center", "middle"]),
        shape("nested-chip", 518, 636, 104, 28, C["surface3"], R["small"]),
        text("nested-chip-text", 518, 636, 104, 28, "chip · R8", 11, C["muted"], align=["center", "middle"]),
        text("exceptions-title", 64, 794, 200, 26, "明确例外", 14, C["text"], True),
        shape("exception-toggle", 64, 840, 34, 20, C["accent"], R["pill"]),
        circle("exception-knob", 81, 843, 14, C["onPrimary"]),
        text("exception-toggle-text", 112, 836, 330, 28, "Switch / 悬浮工具栏使用全圆角", 12, C["muted"]),
        shape("exception-skeleton", 64, 894, 120, 10, C["surface3"], R["pill"]),
        text("exception-skeleton-text", 200, 886, 240, 28, "骨架条使用全圆角", 12, C["muted"]),
        icon("exception-crop", 500, 836, 24, "fas:crop-simple", C["accent"]),
        text("exception-crop-text", 540, 836, 340, 28, "取景框保持直角，不套圆角", 12, C["muted"]),
        text("border-title", 1000, 162, 300, 30, "边框角色", 18, C["text"], True),
    ])
    borders = [
        ("浮层描边", "#FFFFFF26 · 15% · 1 px", R["window"], B["floating"]),
        ("控件描边", "#FFFFFF1A · 10% · 1 px", R["control"], B["control"]),
        ("激活描边", "#8FA6C999 · 60% · 1 px", R["control"], B["active"]),
    ]
    for i, (label, value, radius, border) in enumerate(borders):
        yy = 214 + i * 106
        e.extend([
            shape(f"border-sample-{i}", 1000, yy, 160, 64, C["surface2"], radius, border),
            text(f"border-label-{i}", 1184, yy + 2, 300, 26, label, 14, C["text"], True),
            text(f"border-value-{i}", 1184, yy + 34, 340, 24, value, 11, C["muted"]),
        ])
    e.extend([
        shape("geometry-rule", 1000, 536, 536, 1, C["divider"]),
        text("acceptance-title", 1000, 568, 300, 28, "几何验收", 16, C["text"], True),
    ])
    checks = [
        "同类组件不单独修改半径",
        "共边嵌套必须同步减小圆角",
        "边框统一 1 px，不用覆盖矩形",
        "白色发送按钮不额外加描边",
    ]
    for i, label in enumerate(checks):
        yy = 618 + i * 42
        e.extend([
            icon(f"geometry-check-{i}", 1000, yy + 3, 14, "fas:check", C["green"]),
            text(f"geometry-check-text-{i}", 1028, yy, 500, 26, label, 12, C["body"]),
        ])
    e.extend([
        shape("css-token-box", 1000, 810, 536, 124, C["surface2"], R["container"], B["control"]),
        text("css-token-text", 1020, 826, 500, 94,
             "--radius-window: 16px;  --radius-container: 12px;\n--radius-control: 10px;  --radius-small: 8px;\n--border-floating: #FFFFFF26;  --radius-toolbar: 999px;\n--border-control: #FFFFFF1A;  --border-active: #8FA6C999;",
             11, C["muted"], line=1.65, wrap=True),
    ])
    return p


def page_toolbar():
    p = base_page(6, "悬浮工具栏", "完整胶囊用于操作；吸附后保留半胶囊入口，悬停或点击展开")
    e = p["elements"]
    e.extend([
        text("expanded-title", 64, 154, 300, 28, "01 · 展开状态", 14, C["text"], True),
        shape("toolbar-desktop", 64, 194, 960, 292, "#12161C", R["window"], B["floating"]),
        top_rounded("toolbar-desktop-bar", 65, 195, 958, 38, C["surface2"], R["window"] - 1),
        circle("desktop-dot-1", 86, 211, 7, C["muted"]),
        circle("desktop-dot-2", 101, 211, 7, C["faint"]),
        text("desktop-title", 128, 202, 300, 24, "FLOATASK · DESKTOP", 9, C["muted"], spacing=1.2),
        shape("desktop-code-1", 98, 268, 210, 9, C["surface3"], R["pill"]),
        shape("desktop-code-2", 98, 291, 154, 9, C["surface3"], R["pill"]),
        shape("desktop-code-3", 98, 314, 184, 9, C["surface3"], R["pill"]),
        text("desktop-context", 98, 362, 210, 48, "工具栏浮在应用上方\n保留清晰的轮廓与点击区域", 11, C["muted"], line=1.6, wrap=True),
        shape("clipboard-tooltip", 550, 266, 104, 28, C["surface3"], R["small"], B["control"]),
        text("clipboard-tooltip-text", 550, 266, 104, 28, "剪贴板解释", 10, C["body"], align=["center", "middle"]),
        text("expanded-caption", 280, 394, 528, 24,
             "框选保持主操作；剪贴板、历史、更多使用图标", 11, C["muted"], align=["center", "top"]),
        text("expanded-size", 280, 432, 528, 22,
             "328 × 52 px · 图标 16 px · 次级按钮点击区域 34 px", 10, C["faint"], align=["center", "top"]),
        shape("capsule-spec", 1056, 194, 480, 292, C["surface"], R["window"], B["floating"]),
        text("capsule-spec-title", 1080, 216, 300, 28, "胶囊几何", 16, C["text"], True),
        shape("capsule-spec-outer", 1080, 264, 200, 52, C["surface2"], R["pill"], B["floating"]),
        shape("capsule-spec-inner", 1085, 269, 70, 42, C["accentSoft"], R["pill"]),
        text("capsule-spec-outer-label", 1304, 260, 200, 26, "外半径 26 px", 13, C["text"], True),
        text("capsule-spec-inner-label", 1304, 290, 220, 24, "品牌区／主按钮 R21", 11, C["accent"]),
        shape("capsule-spec-rule", 1080, 342, 432, 1, C["divider"]),
        text("capsule-spec-copy", 1080, 362, 420, 88,
             "52 px 高 · 5 px 内边距\n内圆角 = 26 − 5 = 21 px\n浮问字标拖动 · 仅主按钮使用框选图标", 12, C["muted"], line=1.65, wrap=True),
    ])
    toolbar(e, "expanded-toolbar", 380, 312, hover="clipboard")

    cards = [(64, "左侧吸附", "半胶囊 · 44 × 64 px"),
             (432, "右侧吸附", "半胶囊 · 44 × 64 px"),
             (800, "上下边缘", "横置半胶囊 · 64 × 44 px")]
    for i, (xx, title, subtitle) in enumerate(cards):
        e.extend([
            shape(f"edge-card-{i}", xx, 524, 344, 412, "#12161C", R["window"], B["control"]),
            text(f"edge-title-{i}", xx + 20, 546, 260, 28, title, 15, C["text"], True),
            text(f"edge-subtitle-{i}", xx + 20, 578, 280, 24, subtitle, 10, C["muted"]),
        ])
    collapsed_toolbar(e, "left-collapsed", 64, 688, "left")
    collapsed_toolbar(e, "right-collapsed", 732, 688, "right")
    e.extend([
        text("left-edge-copy", 132, 688, 220, 64, "Logo 始终可见\n点击或悬停展开", 12, C["body"], line=1.65, wrap=True),
        text("right-edge-copy", 452, 688, 220, 64, "贴边后自动收起\n主入口仍然保留", 12, C["body"], line=1.65, wrap=True),
        text("left-edge-note", 84, 878, 280, 24, "保留 44 px 点击宽度", 10, C["faint"]),
        text("right-edge-note", 452, 878, 280, 24, "展开时距边缘 8 px", 10, C["faint"]),
        shape("vertical-screen", 820, 624, 304, 238, C["surface"], R["container"], B["control"]),
    ])
    collapsed_toolbar(e, "top-collapsed", 940, 624, "top")
    collapsed_toolbar(e, "bottom-collapsed", 940, 818, "bottom")
    e.extend([
        text("vertical-caption", 850, 718, 244, 48, "上下边缘使用横置形态\n保持相同的 Logo 与轮廓", 11, C["muted"], align=["center", "top"], line=1.6, wrap=True),
        shape("behavior-card", 1168, 524, 368, 412, C["surface"], R["window"], B["control"]),
        text("behavior-title", 1188, 546, 280, 28, "吸附与展开", 16, C["text"], True),
    ])
    behaviors = [
        "距边缘 24 px 内松手吸附",
        "180 ms ease-out 定位",
        "悬停 120 ms 或点击展开",
        "移开 300 ms 后收起",
        "拖动过程中不自动收起",
    ]
    for i, label in enumerate(behaviors):
        yy = 608 + i * 50
        e.extend([
            icon(f"behavior-icon-{i}", 1188, yy + 3, 14,
                 "fas:magnet" if i == 0 else "fas:check", C["accent"] if i == 0 else C["green"]),
            text(f"behavior-text-{i}", 1216, yy, 300, 26, label, 11, C["body"]),
        ])
    e.extend([
        shape("behavior-rule", 1188, 858, 328, 1, C["divider"]),
        text("behavior-note", 1188, 876, 320, 44,
             "Esc 可收起；减少动态效果时取消位移动画", 10, C["muted"], wrap=True),
    ])
    return p


def page_more_menu():
    p = base_page(7, "更多菜单", "一级工具栏保留高频操作；菜单只承载设置、隐藏与退出")
    e = p["elements"]
    e.extend([
        shape("menu-desktop", 64, 170, 960, 600, "#12161C", R["window"], B["floating"]),
        text("menu-context", 96, 196, 400, 28, "底部右侧 · 向上展开", 14, C["text"], True),
        top_rounded("menu-window-bar", 96, 252, 560, 42, C["surface2"], R["container"]),
        circle("menu-window-dot", 116, 269, 7, C["muted"]),
        text("menu-window-title", 140, 260, 260, 26, "当前应用窗口", 11, C["muted"]),
        shape("menu-window-body", 96, 294, 560, 260, C["surface"], 0, B["control"]),
        shape("menu-window-line-1", 124, 330, 230, 9, C["surface3"], R["pill"]),
        shape("menu-window-line-2", 124, 355, 310, 9, C["surface3"], R["pill"]),
        shape("menu-window-line-3", 124, 380, 180, 9, C["surface3"], R["pill"]),
        text("menu-open-caption", 98, 704, 420, 24, "菜单与工具栏保持 12 px 间距", 11, C["muted"]),
        shape("menu-spec-card", 1056, 170, 480, 600, C["surface"], R["window"], B["control"]),
        text("menu-spec-title", 1080, 196, 300, 28, "菜单结构", 16, C["text"], True),
        text("menu-spec-size", 1080, 240, 380, 30, "224 × 152 px", 20, C["accent"], True),
        text("menu-spec-copy", 1080, 282, 410, 54,
             "容器 R12 · 菜单项 R10 · 行高 36 px\n一级已有功能不重复出现", 12, C["muted"], line=1.6, wrap=True),
        shape("menu-spec-rule", 1080, 350, 432, 1, C["divider"]),
    ])
    toolbar(e, "menu-toolbar", 656, 660, hover="more")
    more_menu(e, "more-menu", 748, 496)
    behaviors = [
        "点击更多打开，再次点击关闭",
        "Esc 或点击外部关闭菜单",
        "菜单打开时禁止自动收起",
        "隐藏后可从系统托盘恢复",
        "菜单位置随边缘方向翻转",
    ]
    for i, label in enumerate(behaviors):
        yy = 386 + i * 56
        e.extend([
            icon(f"menu-check-{i}", 1080, yy + 3, 14, "fas:check", C["green"]),
            text(f"menu-check-text-{i}", 1108, yy, 390, 26, label, 11, C["body"]),
        ])
    e.extend([
        text("menu-focus-note", 1080, 690, 410, 44,
             "打开后聚焦首个菜单项；关闭后焦点返回更多按钮。", 10, C["muted"], wrap=True),
    ])
    placements = [
        (64, "底部边缘", "菜单向上展开，避免超出屏幕。"),
        (564, "顶部边缘", "菜单向下展开，保留 12 px 间距。"),
        (1064, "左右边缘", "工具栏先朝屏幕内部展开，再打开菜单。"),
    ]
    for i, (xx, title, copy) in enumerate(placements):
        e.extend([
            shape(f"placement-{i}", xx, 802, 472, 134, C["surface"], R["container"], B["control"]),
            icon(f"placement-icon-{i}", xx + 20, 826, 16,
                 "fas:arrow-up" if i == 0 else "fas:arrow-down" if i == 1 else "fas:arrows-left-right", C["accent"]),
            text(f"placement-title-{i}", xx + 50, 820, 300, 28, title, 13, C["text"], True),
            text(f"placement-copy-{i}", xx + 20, 866, 420, 42, copy, 11, C["muted"], wrap=True),
        ])
    return p


def page_toolbar_motion():
    p = base_page(8, "展开与收起过渡", "以屏幕边缘为锚点，先淡出次级内容，再收拢宽度；Logo 保持连续")
    e = p["elements"]
    frames = [(64, 440, "0 ms · 完整展开"), (564, 440, "80 ms · 内容淡出"), (1064, 472, "180 ms · 半胶囊")]
    for i, (xx, ww, title) in enumerate(frames):
        e.extend([
            shape(f"motion-frame-{i}", xx, 182, ww, 382, "#12161C", R["window"], B["control"]),
            text(f"motion-title-{i}", xx + 20, 206, ww - 40, 28, title, 14, C["text"], True),
            shape(f"motion-anchor-{i}", xx + ww - 8, 270, 1, 180, C["divider"]),
        ])
    toolbar(e, "motion-start", 168, 330)
    e.extend([
        shape("motion-mid-outer", 796, 330, 200, 52, C["surface"], R["pill"], B["floating"]),
        shape("motion-mid-primary", 846, 335, 142, 42, C["accentSoft"], R["pill"], opacity=0.25),
        shape("motion-mid-logo", 920, 340, 32, 32, C["accentSoft"], 16),
        text("motion-mid-icon", 920, 340, 32, 32, "浮", 14, C["accent"], True, ["center", "middle"]),
        icon("motion-arrow-1", 522, 344, 20, "fas:arrow-right", C["accent"]),
        icon("motion-arrow-2", 1024, 344, 20, "fas:arrow-right", C["accent"]),
        text("motion-start-copy", 88, 444, 380, 54, "宽度 328 px\n所有功能完整可见", 12, C["muted"], line=1.6, wrap=True),
        text("motion-mid-copy", 588, 444, 380, 54, "次级内容先淡出\n浮问字标保持 14 px", 12, C["muted"], line=1.6, wrap=True),
        text("motion-end-copy", 1088, 444, 400, 54, "宽度收至 44 px\n边缘贴合，等待再次展开", 12, C["muted"], line=1.6, wrap=True),
        text("motion-start-note", 88, 522, 340, 22, "右侧边缘为位置锚点", 10, C["faint"]),
        text("motion-mid-note", 588, 522, 340, 22, "避免整栏同时淡入淡出", 10, C["faint"]),
        text("motion-end-note", 1088, 522, 340, 22, "收起动画总计 180 ms", 10, C["faint"]),
        shape("reverse-card", 64, 596, 960, 340, C["surface"], R["window"], B["control"]),
        text("reverse-title", 88, 620, 400, 28, "反向展开", 16, C["text"], True),
        text("reverse-subtitle", 88, 654, 500, 24, "悬停 120 ms 或点击半胶囊", 11, C["muted"]),
        icon("reverse-arrow", 220, 712, 20, "fas:arrow-right", C["accent"]),
        text("reverse-copy", 680, 704, 280, 62,
             "宽度先展开\n次级内容随后淡入", 12, C["body"], line=1.6, wrap=True),
        text("reverse-note", 88, 846, 700, 44,
             "展开过程同样为 180 ms；Logo 连续移动，功能图标在末段恢复。", 11, C["muted"], wrap=True),
        shape("motion-spec-card", 1056, 596, 480, 340, C["surface"], R["window"], B["control"]),
        text("motion-spec-title", 1080, 620, 360, 28, "动效约束", 16, C["text"], True),
    ])
    collapsed_toolbar(e, "motion-end", 1492, 324, "right")
    collapsed_toolbar(e, "reverse-start", 96, 696, "left")
    toolbar(e, "reverse-end", 300, 692)
    specs = [
        "宽度：180 ms ease-out",
        "收起：次级内容前 80 ms 淡出",
        "展开：次级内容延迟 60 ms 淡入",
        "菜单打开或拖动时禁止收起",
        "减少动态效果：立即切换最终状态",
    ]
    for i, label in enumerate(specs):
        yy = 668 + i * 48
        e.extend([
            icon(f"motion-spec-icon-{i}", 1080, yy + 3, 13, "fas:check", C["green"]),
            text(f"motion-spec-text-{i}", 1106, yy, 390, 26, label, 10, C["body"]),
        ])
    return p


def compact_answer(e, eid, x, y):
    w, h = 480, 360
    e.extend([
        shape(eid, x, y, w, h, C["surface"], R["window"], B["floating"],
              {"blur": 42, "color": "#00000080", "offset": [0, 16]}),
        shape(eid + "-logo-bg", x + 16, y + 12, 24, 24, C["accentSoft"], R["small"]),
        icon(eid + "-logo", x + 22, y + 18, 12, "fas:crop-simple", C["accent"]),
        text(eid + "-brand", x + 48, y + 10, 60, 26, "浮问", 15, C["text"], True),
        circle(eid + "-status-dot", x + 116, y + 22, 5, C["green"]),
        text(eid + "-status", x + 128, y + 14, 48, 20, "已完成", 10, C["muted"]),
        shape(eid + "-head-line", x, y + 47, w, 1, C["divider"]),
        shape(eid + "-context-bg", x + 1, y + 48, w - 2, 32, C["surface2"]),
        icon(eid + "-context-icon", x + 16, y + 58, 12, "fas:crop-simple", C["accent"]),
        text(eid + "-context", x + 36, y + 53, 250, 22, "Transformer · 技术文章", 10, C["muted"]),
        text(eid + "-model", x + w - 100, y + 53, 80, 22, "DeepSeek", 10, C["muted"], align=["right", "top"]),
        shape(eid + "-avatar", x + 18, y + 94, 24, 24, C["accentSoft"], R["small"]),
        icon(eid + "-avatar-icon", x + 24, y + 100, 12, "fas:crop-simple", C["accent"]),
        text(eid + "-answer-name", x + 52, y + 96, 160, 20, "浮问 · 刚刚", 10, C["muted"]),
        text(eid + "-summary", x + 18, y + 126, w - 36, 62,
             "<p><strong>Transformer</strong> 是一种用自注意力理解上下文的神经网络架构。它让模型读取整句话，再判断每个词应该关注谁。</p>",
             12, C["body"], line=1.5, wrap=True),
        text(eid + "-expand", x + 18, y + 194, 230, 24, "展开阅读 · 完整回答与来源", 11, C["accent"], True),
        icon(eid + "-expand-icon", x + 202, y + 199, 12, "fas:arrow-right", C["accent"]),
        shape(eid + "-footer-line", x, y + 226, w, 1, C["divider"]),
        shape(eid + "-chip-1", x + 18, y + 240, 72, 26, C["surface3"], R["small"]),
        text(eid + "-chip-text-1", x + 18, y + 240, 72, 26, "更通俗", 10, C["muted"], align=["center", "middle"]),
        shape(eid + "-chip-2", x + 98, y + 240, 82, 26, C["surface3"], R["small"]),
        text(eid + "-chip-text-2", x + 98, y + 240, 82, 26, "举个例子", 10, C["muted"], align=["center", "middle"]),
        shape(eid + "-box", x + 18, y + 278, w - 36, 48, C["surface2"], R["container"], B["control"]),
        icon(eid + "-web", x + 32, y + 295, 13, "fas:globe", C["accent"]),
        text(eid + "-placeholder", x + 54, y + 287, 280, 30, "继续追问…", 11, C["muted"], align=["left", "middle"]),
        shape(eid + "-send", x + w - 59, y + 285, 34, 34, C["primaryButton"], R["control"]),
        icon(eid + "-send-icon", x + w - 49, y + 295, 14, "fas:arrow-up", C["onPrimary"]),
        text(eid + "-hint", x + 18, y + 334, 190, 14, "Enter 发送 · Shift + Enter 换行", 9, C["muted"]),
        text(eid + "-privacy", x + w - 158, y + 334, 140, 14, "OCR 在本机完成", 9, C["muted"], align=["right", "top"]),
    ])
    for i, name in enumerate(["fas:crop-simple", "fas:thumbtack", "fas:expand", "fas:xmark"]):
        e.append(icon(f"{eid}-action-{i}", x + 332 + i * 34, y + 18, 12, name, C["muted"]))


def page_compact_answer():
    p = base_page(9, "紧凑答案窗", "480 × 360 px 默认呈现答案摘要；完整内容进入扩展阅读，不靠缩小字号塞入")
    e = p["elements"]
    e.extend([
        text("light-title", 64, 150, 500, 26, "亮色网页 · 浮层分离", 14, C["text"], True),
        text("dark-title", 816, 150, 500, 26, "深色 IDE · 同一轮廓", 14, C["text"], True),
        shape("light-desktop", 64, 190, 720, 744, "#E8E6E1", R["window"], B["floating"]),
        top_rounded("light-browser", 65, 191, 718, 46, "#F5F4F1", R["window"] - 1),
        circle("light-dot-1", 86, 211, 7, "#B4B1AA"),
        circle("light-dot-2", 102, 211, 7, "#C8C5BE"),
        shape("light-address", 132, 202, 500, 26, "#E8E6E1", R["small"]),
        text("light-url", 148, 204, 450, 22, "arxiv.org / attention-is-all-you-need", 9, "#777A80"),
        left_rounded("light-nav", 65, 237, 126, 696, "#F2F0EC", R["window"] - 1),
        text("light-nav-title", 84, 266, 90, 24, "PAPERS", 9, "#777A80", True, spacing=1.1),
        text("light-nav-items", 84, 310, 92, 160, "Latest\nTrending\nCollections\nBookmarks\nHistory", 11, "#777A80", line=2.15, wrap=True),
        text("light-article-title", 224, 270, 460, 36, "Attention Is All You Need", 21, "#30343A", True),
        text("light-article-meta", 224, 312, 380, 22, "Ashish Vaswani et al. · 2017", 10, "#777A80"),
        shape("light-article-rule", 224, 350, 488, 1, "#D4D1CA"),
        text("light-article-copy", 224, 372, 470, 126,
             "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.\n\nExperiments show that these models are superior in quality while being more parallelizable.",
             11, "#656970", line=1.65, wrap=True),
        shape("dark-desktop", 816, 190, 720, 744, "#12161C", R["window"], B["floating"]),
        left_rounded("dark-sidebar", 817, 191, 136, 742, "#151A21", R["window"] - 1),
        top_rounded("dark-tabbar", 953, 191, 582, 42, "#181D25", R["window"] - 1),
        text("dark-nav-title", 838, 216, 100, 22, "EXPLORER", 9, C["muted"], spacing=1.1),
        text("dark-files", 838, 260, 104, 146, "FLOATASK\n▾ renderer\n　result.js\n　theme.css\n▾ main\n　main.js", 10, C["muted"], line=1.75, wrap=True),
        shape("dark-tab", 970, 199, 152, 34, "#20262F", R["small"]),
        text("dark-tab-text", 986, 204, 120, 24, "transformer.py", 10, C["body"]),
        text("dark-code", 982, 264, 520, 300,
             "import torch\nimport torch.nn as nn\n\nclass MultiHeadAttention(nn.Module):\n    def forward(self, query, key, value):\n        scores = query @ key.transpose(-2, -1)\n        weights = torch.softmax(scores, dim=-1)\n        return weights @ value\n\n# Context shapes the current token",
             11, "#7F8997", line=1.65, wrap=True),
        shape("dark-statusbar", 953, 902, 582, 31, "#1B212A"),
        text("dark-status", 972, 906, 400, 20, "main*  ·  Python 3.12  ·  UTF-8", 9, C["muted"]),
    ])
    compact_answer(e, "light-answer", 184, 366)
    compact_answer(e, "dark-answer", 936, 366)
    e.extend([
        text("light-caption", 184, 746, 480, 24, "浅底上依靠 1 px 描边与投影保持独立", 11, C["muted"], align=["center", "top"]),
        text("dark-caption", 936, 746, 480, 24, "深底上不提亮表面，也不增加发光效果", 11, C["muted"], align=["center", "top"]),
        shape("compact-spec-rule", 184, 792, 480, 1, "#C9C6BF"),
        text("compact-spec", 184, 812, 480, 64,
             "默认 480 × 360 px · 外窗 R16\n摘要 12 px / 1.5 · 输入区固定 · 保留四个窗口操作", 11, "#555A62", line=1.65, wrap=True),
        shape("dark-spec-rule", 936, 792, 480, 1, C["divider"]),
        text("dark-spec", 936, 812, 480, 64,
             "亮色／暗色桌面共用同一组件与 token\n长回答点击“展开阅读”，不在紧凑态内滚动整窗", 11, C["muted"], line=1.65, wrap=True),
    ])
    return p


def page_long_scroll():
    p = base_page(10, "长内容与滚动", "标题、上下文和输入区固定；仅回答视口滚动，代码块横向溢出不撑宽窗口")
    e = p["elements"]
    x, y, w, h = 64, 148, 960, 788
    app_window(e, "scroll-window", x, y, w, h, "MultiHeadAttention · IDE 报错", "已完成", True)
    e.extend([
        shape("scroll-avatar", x + 26, y + 126, 28, 28, C["accentSoft"], R["small"]),
        icon("scroll-avatar-icon", x + 32, y + 132, 16, "fas:crop-simple", C["accent"]),
        text("scroll-name", x + 66, y + 129, 200, 20, "浮问 · 代码解释", 11, C["muted"]),
        text("scroll-intro", x + 26, y + 164, w - 76, 38,
             "这段代码计算注意力权重。下面保留代码、参数表和来源，验证真实长内容的阅读密度。",
             12, C["body"], line=1.45, wrap=True),
        shape("code-block", x + 26, y + 214, w - 70, 154, "#12151A", R["container"], B["control"]),
        text("code-language", x + 42, y + 226, 100, 20, "PYTHON", 9, C["muted"], True, spacing=1.1),
        shape("code-copy", x + w - 144, y + 224, 82, 28, C["surface3"], R["small"]),
        icon("code-copy-icon", x + w - 132, y + 232, 12, "far:clipboard", C["muted"]),
        text("code-copy-text", x + w - 114, y + 224, 46, 28, "复制", 10, C["body"], align=["left", "middle"]),
        text("code-content", x + 42, y + 260, w - 102, 82,
             "scores = query @ key.transpose(-2, -1)\nweights = torch.softmax(scores, dim=-1)\nreturn weights @ value  # preserve the full expression without widening the answer window",
             11, "#C7D0DC", line=1.55, wrap=False),
        shape("code-x-track", x + 42, y + 350, w - 102, 3, C["surface3"], R["pill"]),
        shape("code-x-thumb", x + 42, y + 350, 260, 3, C["muted"], R["pill"]),
        shape("parameter-table", x + 26, y + 386, w - 70, 142, C["surface2"], R["container"], B["control"]),
        top_rounded("parameter-head", x + 27, y + 387, w - 72, 36, C["surface3"], R["container"] - 1),
        shape("parameter-row-line-1", x + 27, y + 459, w - 72, 1, C["divider"]),
        shape("parameter-row-line-2", x + 27, y + 494, w - 72, 1, C["divider"]),
        text("parameter-head-1", x + 44, y + 394, 170, 22, "参数", 10, C["muted"], True),
        text("parameter-head-2", x + 224, y + 394, 220, 22, "含义", 10, C["muted"], True),
        text("parameter-head-3", x + 574, y + 394, 250, 22, "当前作用", 10, C["muted"], True),
        text("parameter-row-1", x + 44, y + 430, 170, 22, "query / key", 11, C["body"]),
        text("parameter-row-1b", x + 224, y + 430, 280, 22, "查询与键向量", 11, C["body"]),
        text("parameter-row-1c", x + 574, y + 430, 260, 22, "计算相关程度", 11, C["muted"]),
        text("parameter-row-2", x + 44, y + 466, 170, 22, "dim=-1", 11, C["body"]),
        text("parameter-row-2b", x + 224, y + 466, 280, 22, "最后一个维度", 11, C["body"]),
        text("parameter-row-2c", x + 574, y + 466, 260, 22, "归一化注意力权重", 11, C["muted"]),
        text("parameter-row-3", x + 44, y + 502, 170, 22, "value", 11, C["body"]),
        text("parameter-row-3b", x + 224, y + 502, 280, 22, "待加权的信息", 11, C["body"]),
        text("parameter-row-3c", x + 574, y + 502, 260, 22, "形成上下文表示", 11, C["muted"]),
        text("scroll-sources", x + 26, y + 548, 100, 22, "参考来源", 10, C["muted"], True),
        circle("scroll-source-index", x + 26, y + 580, 18, C["accentSoft"]),
        text("scroll-source-number", x + 26, y + 580, 18, 18, "1", 10, C["accent"], align=["center", "middle"]),
        text("scroll-source-title", x + 54, y + 577, 460, 22, "Attention Is All You Need", 11, C["body"]),
        text("scroll-source-domain", x + w - 236, y + 578, 190, 20, "arxiv.org", 10, C["muted"], align=["right", "top"]),
        shape("scroll-track", x + w - 9, y + 126, 3, 476, C["surface3"], R["pill"]),
        shape("scroll-thumb", x + w - 9, y + 264, 3, 142, C["muted"], R["pill"]),
        shape("scroll-footer-line", x, y + 606, w, 1, C["divider"]),
    ])
    composer(e, "scroll-composer", x + 26, y + 620, w - 52)

    sx = 1056
    e.extend([
        shape("viewport-card", sx, 148, 480, 240, C["surface"], R["window"], B["control"]),
        text("viewport-title", sx + 24, 172, 380, 28, "固定与滚动分区", 16, C["text"], True),
        text("viewport-copy", sx + 24, 216, 420, 112,
             "固定：标题栏、窗口上下文、追问输入区\n滚动：回答正文、代码、表格与来源\n视口：内容区独立裁剪，不出现整窗滚动条", 12, C["body"], line=1.75, wrap=True),
        text("viewport-size", sx + 24, 344, 420, 22, "滚动条 3 px · 距内容右侧 6 px", 10, C["muted"]),
        shape("overflow-card", sx, 412, 480, 240, C["surface"], R["window"], B["control"]),
        text("overflow-title", sx + 24, 436, 380, 28, "横向溢出", 16, C["text"], True),
        text("overflow-copy", sx + 24, 480, 420, 100,
             "代码块保持窗口内宽度，长行在块内横向滚动。\n表格优先压缩留白；仍不足时同样局部滚动。\n复制按钮始终位于代码块右上角。", 12, C["body"], line=1.7, wrap=True),
        text("overflow-note", sx + 24, 606, 420, 22, "禁止长内容改变外窗宽度", 10, C["accent"], True),
        shape("scroll-spec-card", sx, 676, 480, 260, C["surface"], R["window"], B["control"]),
        text("scroll-spec-title", sx + 24, 700, 380, 28, "滚动验收", 16, C["text"], True),
    ])
    checks = ["滚轮只作用于回答视口", "滚动条不挤压正文排版", "代码复制不依赖选中长行", "来源与输入区层级保持一致"]
    for i, label in enumerate(checks):
        yy = 746 + i * 42
        e.extend([
            icon(f"scroll-check-{i}", sx + 24, yy + 3, 13, "fas:check", C["green"]),
            text(f"scroll-check-text-{i}", sx + 50, yy, 390, 24, label, 11, C["body"]),
        ])
    return p


def stream_window(e, eid, x, y, state):
    w, h = 440, 500
    status = {"follow": "实时跟随", "paused": "已暂停跟随", "resumed": "已恢复跟随"}[state]
    e.extend([
        shape(eid, x, y, w, h, C["surface"], R["window"], B["floating"],
              {"blur": 26, "color": "#00000066", "offset": [0, 12]}),
        shape(eid + "-logo-bg", x + 14, y + 10, 24, 24, C["accentSoft"], R["small"]),
        icon(eid + "-logo", x + 20, y + 16, 12, "fas:crop-simple", C["accent"]),
        text(eid + "-brand", x + 46, y + 9, 60, 26, "浮问", 14, C["text"], True),
        circle(eid + "-dot", x + 242, y + 21, 5, C["green"] if state != "paused" else C["accent"]),
        text(eid + "-status", x + 254, y + 13, 104, 22, status, 10, C["muted"]),
        icon(eid + "-stop-window", x + 402, y + 17, 12, "fas:xmark", C["muted"]),
        shape(eid + "-head-line", x, y + 43, w, 1, C["divider"]),
        shape(eid + "-context", x + 1, y + 44, w - 2, 30, C["surface2"]),
        icon(eid + "-context-icon", x + 16, y + 53, 11, "fas:crop-simple", C["accent"]),
        text(eid + "-context-text", x + 34, y + 49, 280, 20, "Transformer · 技术文章", 9, C["muted"]),
        shape(eid + "-avatar", x + 16, y + 88, 24, 24, C["accentSoft"], R["small"]),
        icon(eid + "-avatar-icon", x + 22, y + 94, 12, "fas:crop-simple", C["accent"]),
        text(eid + "-name", x + 50, y + 90, 180, 20, "浮问 · 正在回答", 10, C["muted"]),
        shape(eid + "-track", x + w - 7, y + 88, 3, 284, C["surface3"], R["pill"]),
        shape(eid + "-footer", x, y + 382, w, 1, C["divider"]),
        shape(eid + "-box", x + 16, y + 398, w - 32, 44, C["surface2"], R["container"], B["control"]),
        icon(eid + "-web", x + 30, y + 413, 12, "fas:globe", C["accent"]),
        text(eid + "-placeholder", x + 50, y + 405, 240, 30, "正在生成回答…", 10, C["muted"], align=["left", "middle"]),
        shape(eid + "-stop", x + w - 53, y + 404, 32, 32, C["redSoft"], R["control"]),
        icon(eid + "-stop-icon", x + w - 42, y + 415, 10, "fas:stop", C["red"]),
        text(eid + "-hint", x + 16, y + 452, 180, 16, "Esc 停止生成", 9, C["muted"]),
        text(eid + "-fixed", x + w - 174, y + 452, 158, 16, "输入区位置固定", 9, C["muted"], align=["right", "top"]),
    ])
    if state == "paused":
        e.extend([
            text(eid + "-heading", x + 16, y + 126, 320, 24, "它解决什么问题", 13, C["text"], True),
            text(eid + "-body", x + 16, y + 160, w - 44, 140,
                 "传统循环网络按顺序处理信息，长文本中的远距离关系容易变弱。\n\nTransformer 会让每个词同时关注句子里的其他词，再计算彼此的重要程度。你正在查看这一早期段落。",
                 11, C["body"], line=1.55, wrap=True),
            shape(eid + "-thumb", x + w - 7, y + 142, 3, 82, C["muted"], R["pill"]),
            shape(eid + "-bottom-button", x + 146, y + 336, 148, 34, C["primaryButton"], R["control"]),
            icon(eid + "-bottom-icon", x + 162, y + 346, 12, "fas:arrow-down", C["onPrimary"]),
            text(eid + "-bottom-text", x + 182, y + 336, 98, 34, "回到底部", 11, C["onPrimary"], True, ["left", "middle"]),
        ])
    else:
        e.extend([
            text(eid + "-body", x + 16, y + 126, w - 44, 124,
                 "<p><strong>Transformer</strong> 是一种基于自注意力机制的神经网络架构。</p><p style=\"margin-top:10px\">它让模型处理一个词时，同时参考句子里的其他词。</p>",
                 11, C["body"], line=1.5, wrap=True),
            text(eid + "-heading", x + 16, y + 256, 300, 24, "它带来了什么", 13, C["text"], True),
            text(eid + "-latest", x + 16, y + 290, w - 44, 66,
                 "并行计算让训练更高效，通用架构也能扩展到视觉和多模态任务。" + ("<span style=\"color:#8FA6C9\">▍</span>" if state == "follow" else ""),
                 11, C["body"], line=1.55, wrap=True),
            shape(eid + "-thumb", x + w - 7, y + 294, 3, 78, C["accent"] if state == "resumed" else C["muted"], R["pill"]),
        ])
        if state == "resumed":
            e.extend([
                icon(eid + "-resumed-icon", x + 18, y + 354, 11, "fas:check", C["green"]),
                text(eid + "-resumed-note", x + 36, y + 348, 240, 22, "已回到最新内容，继续自动跟随", 9, C["green"]),
            ])


def page_stream_follow():
    p = base_page(11, "流式跟随", "默认追随最新内容；用户向上阅读时暂停跟随，点击回到底部后恢复，输入区始终固定")
    e = p["elements"]
    cards = [(64, "01 · 位于底部", "新内容到达时自动跟随"),
             (564, "02 · 向上阅读", "保留当前位置，不强行跳动"),
             (1064, "03 · 回到底部", "恢复实时跟随，按钮退出")]
    for i, (xx, title, subtitle) in enumerate(cards):
        e.extend([
            shape(f"stream-card-{i}", xx, 170, 472, 600, "#12161C", R["window"], B["control"]),
            text(f"stream-card-title-{i}", xx + 20, 192, 360, 28, title, 14, C["text"], True),
            text(f"stream-card-sub-{i}", xx + 20, 224, 400, 22, subtitle, 10, C["muted"]),
        ])
    stream_window(e, "stream-follow", 80, 264, "follow")
    stream_window(e, "stream-paused", 580, 264, "paused")
    stream_window(e, "stream-resumed", 1080, 264, "resumed")
    e.extend([
        icon("stream-arrow-1", 540, 494, 16, "fas:arrow-right", C["accent"]),
        icon("stream-arrow-2", 1040, 494, 16, "fas:arrow-right", C["accent"]),
    ])
    behaviors = [
        ("自动跟随", "仅当视口已位于底部时启用；流式追加不改变上方布局。"),
        ("暂停跟随", "检测到用户向上滚动后立即暂停；生成任务继续在后台进行。"),
        ("恢复位置", "点击回到底部后平滑定位；减少动态效果时立即到位。"),
        ("稳定布局", "状态文字、按钮与滚动条不挤占内容，不移动固定输入区。"),
    ]
    for i, (title, copy) in enumerate(behaviors):
        xx = 64 + i * 376
        e.extend([
            shape(f"stream-behavior-{i}", xx, 802, 344, 134, C["surface"], R["container"], B["control"]),
            icon(f"stream-behavior-icon-{i}", xx + 18, 822, 14,
                 ["fas:arrow-down", "fas:pause", "fas:rotate", "fas:lock"][i],
                 C["accent"] if i != 1 else C["muted"]),
            text(f"stream-behavior-title-{i}", xx + 44, 816, 240, 26, title, 12, C["text"], True),
            text(f"stream-behavior-copy-{i}", xx + 18, 858, 308, 54, copy, 10, C["muted"], line=1.55, wrap=True),
        ])
    return p


def capture_thumbnail(e, eid, x, y, w, h, palette=None, borders=None):
    palette = palette or C
    borders = borders or B
    bar_h = max(12, round(h * 0.17))
    sidebar_w = round(w * 0.22)
    e.extend([
        shape(eid, x, y, w, h, palette["surface"], R["small"], borders["control"]),
        left_rounded(eid + "-sidebar", x + 1, y + 1, sidebar_w, h - 2, palette["surface2"], R["small"] - 1),
        top_rounded(eid + "-topbar", x + 1, y + 1, w - 2, bar_h, palette["surface3"], R["small"] - 1),
        circle(eid + "-dot", x + 9, y + round(bar_h / 2) - 2, 4, palette["muted"]),
        shape(eid + "-tab", x + sidebar_w + 8, y + 4, w * 0.28, bar_h - 7, palette["accentSoft"], R["small"]),
    ])
    for i, ratio in enumerate([0.52, 0.38, 0.46, 0.31]):
        e.append(shape(f"{eid}-tree-{i}", x + 9, y + bar_h + 10 + i * max(10, round(h * 0.12)),
                       sidebar_w * ratio, 3, palette["muted"], R["pill"]))
    code_x = x + sidebar_w + 12
    code_w = w - sidebar_w - 26
    line_gap = max(11, round(h * 0.115))
    for i, ratio in enumerate([0.72, 0.48, 0.82, 0.64, 0.76, 0.42]):
        e.append(shape(f"{eid}-code-{i}", code_x + (8 if i in (2, 3, 4) else 0),
                       y + bar_h + 12 + i * line_gap, code_w * ratio, 3,
                       palette["muted"] if i % 3 else palette["accent"], R["pill"]))
    select_y = y + bar_h + 10 + line_gap
    e.append(shape(eid + "-selection", code_x - 4, select_y - 4, code_w * 0.9, line_gap * 3 + 5,
                   palette["accent"] + "08", 0, {"width": 1, "color": palette["accent"] + "AA"}))


def page_capture_context():
    p = base_page(12, "截图与识别上下文", "截图摘要保持轻量；OCR 原文可展开修正；视觉输入明确标注发送范围")
    e = p["elements"]
    e.extend([
        shape("capture-summary", 64, 170, 600, 342, C["surface"], R["window"], B["control"]),
        text("capture-summary-title", 88, 192, 300, 28, "01 · 截图摘要", 14, C["text"], True),
        shape("capture-local-badge", 522, 192, 118, 26, C["surface3"], R["small"]),
        icon("capture-local-icon", 534, 199, 12, "fas:shield-halved", C["green"]),
        text("capture-local-text", 554, 192, 72, 26, "本机 OCR", 10, C["green"], align=["left", "middle"]),
        text("capture-source", 376, 246, 238, 24, "VS Code · transformer.py", 12, C["text"], True),
        text("capture-size", 376, 278, 220, 22, "框选区域 · 1280 × 720", 10, C["muted"]),
        text("capture-engine", 376, 302, 230, 22, "Windows.Media.Ocr · 中文 / English", 10, C["muted"]),
        shape("capture-expand", 376, 340, 112, 36, C["primaryButton"], R["control"]),
        text("capture-expand-text", 376, 340, 112, 36, "展开原文", 11, C["onPrimary"], True, ["center", "middle"]),
        shape("capture-reselect", 500, 340, 116, 36, C["surface3"], R["control"]),
        icon("capture-reselect-icon", 514, 351, 13, "fas:crop-simple", C["muted"]),
        text("capture-reselect-text", 536, 340, 68, 36, "重新框选", 10, C["body"], align=["left", "middle"]),
        shape("capture-summary-rule", 88, 408, 552, 1, C["divider"]),
        text("capture-ocr-label", 88, 426, 180, 22, "OCR 原文 · 86 字", 10, C["muted"], True),
        text("capture-ocr-preview", 88, 454, 520, 38,
             "class MultiHeadAttention(nn.Module):  def forward(self, query, key, value)…", 11, C["body"], wrap=True),
        shape("ocr-editor", 696, 170, 840, 766, C["surface"], R["window"], B["control"]),
        text("ocr-editor-title", 720, 192, 400, 28, "02 · OCR 原文展开／修正", 14, C["text"], True),
        shape("ocr-dirty-badge", 1364, 192, 148, 26, C["accentSoft"], R["small"]),
        circle("ocr-dirty-dot", 1378, 202, 6, C["accent"]),
        text("ocr-dirty-text", 1392, 192, 104, 26, "有未保存修正", 10, C["accent"], align=["left", "middle"]),
        text("ocr-editor-subtitle", 720, 232, 740, 24,
             "修正只改变文字上下文；原始截图保持不变，已有回答不会被自动覆盖。", 11, C["muted"]),
        text("ocr-source-title", 888, 282, 300, 24, "原始识别结果", 12, C["text"], True),
        text("ocr-source-meta", 888, 314, 460, 22, "来源 Windows.Media.Ocr · 原始结果已保留", 10, C["muted"]),
        text("ocr-source-note", 888, 340, 500, 22, "可直接修改术语、空格与识别错误的字符", 10, C["muted"]),
        shape("ocr-textarea", 720, 390, 792, 300, C["surface2"], R["container"], B["active"]),
        text("ocr-textarea-label", 740, 408, 200, 22, "OCR TEXT · 编辑中", 9, C["accent"], True, spacing=1.1),
        text("ocr-char-count", 1310, 408, 180, 22, "218 字", 10, C["muted"], align=["right", "top"]),
        shape("ocr-textarea-rule", 740, 440, 752, 1, C["divider"]),
        text("ocr-textarea-content", 740, 460, 728, 156,
             "class MultiHeadAttention(nn.Module):\n    def forward(self, query, key, value):\n        scores = query @ key.transpose(-2, -1)\n        weights = torch.softmax(scores, dim=-1)\n        return weights @ value\n\n# Each token learns which other tokens to attend to",
             12, C["body"], line=1.55, wrap=True),
        shape("ocr-diff-bg", 740, 630, 420, 38, C["accentSoft"], R["small"]),
        icon("ocr-diff-icon", 754, 642, 13, "fas:pen", C["accent"]),
        text("ocr-diff-text", 778, 630, 360, 38,
             "已修正 1 处：<s>soft max</s> → <span style=\"color:#8FA6C9\">softmax</span>", 11, C["body"], align=["left", "middle"]),
        shape("ocr-retry", 720, 726, 124, 38, C["surface3"], R["control"]),
        icon("ocr-retry-icon", 736, 738, 13, "fas:rotate", C["muted"]),
        text("ocr-retry-text", 758, 726, 70, 38, "重新识别", 11, C["body"], align=["left", "middle"]),
        shape("ocr-restore", 1198, 726, 112, 38, C["surface3"], R["control"]),
        text("ocr-restore-text", 1198, 726, 112, 38, "还原原文", 11, C["body"], align=["center", "middle"]),
        shape("ocr-save", 1322, 726, 190, 38, C["primaryButton"], R["control"]),
        text("ocr-save-text", 1322, 726, 190, 38, "完成修正", 11, C["onPrimary"], True, ["center", "middle"]),
        text("ocr-save-note", 720, 790, 760, 44,
             "完成后用于后续追问；需要更新答案时，再由用户主动点击“重新解释”。\n重新识别会覆盖当前编辑，因此执行前需要确认。", 11, C["muted"], line=1.6, wrap=True),
        shape("ocr-editor-rule", 720, 852, 792, 1, C["divider"]),
        icon("ocr-original-check", 720, 878, 14, "fas:check", C["green"]),
        text("ocr-original-note", 746, 872, 280, 26, "原始截图与原始 OCR 均可还原", 11, C["body"]),
        icon("ocr-history-check", 1110, 878, 14, "fas:check", C["green"]),
        text("ocr-history-note", 1136, 872, 330, 26, "历史记录保留修正后的文字上下文", 11, C["body"]),
        shape("vision-card", 64, 536, 600, 400, C["surface"], R["window"], B["control"]),
        text("vision-title", 88, 558, 340, 28, "03 · 视觉模型上下文", 14, C["text"], True),
        text("vision-subtitle", 88, 596, 400, 24, "截图理解已开启 · 发送前可见", 11, C["accent"]),
        shape("vision-attachment", 88, 632, 552, 122, C["surface2"], R["container"], B["control"]),
        text("vision-attachment-title", 256, 650, 220, 24, "本次框选截图", 12, C["text"], True),
        text("vision-attachment-meta", 256, 680, 268, 22, "压缩后随问题发送 · 768 × 432 · 62 KB", 10, C["muted"]),
        text("vision-attachment-model", 256, 710, 180, 22, "视觉模型 · 已连接", 10, C["accent"]),
        text("vision-detach", 520, 650, 88, 24, "本次不发送", 10, C["muted"], align=["right", "top"]),
        icon("vision-privacy-icon", 88, 786, 14, "fas:shield-halved", C["green"]),
        text("vision-privacy-title", 114, 780, 210, 26, "原始截图仅本机保留", 11, C["body"], True),
        text("vision-privacy-copy", 330, 780, 280, 26, "发送的是压缩副本", 10, C["muted"], align=["right", "top"]),
        shape("vision-rule", 88, 822, 552, 1, C["divider"]),
        icon("vision-text-icon", 88, 850, 14, "fas:font", C["muted"]),
        text("vision-text-title", 114, 844, 220, 26, "OCR 识别在本机完成", 11, C["body"]),
        text("vision-text-copy", 348, 844, 262, 26, "文字仍随模型请求发送", 10, C["muted"], align=["right", "top"]),
        text("vision-note", 88, 892, 520, 24, "关闭截图理解后，仅使用 OCR 文本与窗口上下文。", 10, C["muted"]),
    ])
    toggle(e, "vision-context-toggle", 606, 562, True)
    capture_thumbnail(e, "capture-thumb", 88, 246, 264, 148)
    capture_thumbnail(e, "ocr-thumb", 720, 282, 144, 81)
    capture_thumbnail(e, "vision-thumb", 104, 656, 128, 72)
    return p


def recovery_card(e, eid, x, title_value, body, action, secondary, note, icon_name, tone):
    y, w, h = 694, 472, 242
    e.extend([
        shape(eid, x, y, w, h, C["surface"], R["window"], B["control"]),
        shape(eid + "-symbol", x + 24, y + 22, 34, 34,
              C["redSoft"] if tone == "error" else C["accentSoft"], R["small"]),
        icon(eid + "-icon", x + 33, y + 31, 16, icon_name, C["red"] if tone == "error" else C["accent"]),
        text(eid + "-title", x + 70, y + 24, 350, 30, title_value, 14, C["text"], True),
        text(eid + "-body", x + 24, y + 76, w - 48, 52, body, 11, C["muted"], line=1.55, wrap=True),
        shape(eid + "-action", x + 24, y + 140, 156 if eid == "search-fail" else 112, 36,
              C["primaryButton"], R["control"]),
        text(eid + "-action-text", x + 24, y + 140, 156 if eid == "search-fail" else 112, 36,
             action, 10, C["onPrimary"], True, ["center", "middle"]),
        text(eid + "-secondary", x + 270, y + 140, 174, 36, secondary, 10, C["body"], align=["right", "middle"]),
        shape(eid + "-rule", x + 24, y + 190, w - 48, 1, C["divider"]),
        text(eid + "-note", x + 24, y + 204, w - 48, 20, note, 9, C["muted"]),
    ])


def page_recovery_states():
    p = base_page(13, "空态与异常恢复", "保留当前截图与 OCR 上下文；每种异常都提供可执行的恢复动作")
    e = p["elements"]
    e.extend([
        shape("empty-ocr", 64, 170, 900, 500, C["surface"], R["window"], B["control"]),
        text("empty-ocr-heading", 88, 192, 400, 28, "01 · 无 OCR 结果", 14, C["text"], True),
        shape("empty-ocr-badge", 806, 192, 134, 26, C["surface3"], R["small"]),
        icon("empty-ocr-badge-icon", 820, 199, 12, "fas:image", C["muted"]),
        text("empty-ocr-badge-text", 840, 192, 86, 26, "截图仍保留", 10, C["muted"], align=["left", "middle"]),
        text("empty-ocr-title", 440, 250, 400, 32, "没有识别到可用文字", 18, C["text"], True),
        text("empty-ocr-body", 440, 298, 456, 62,
             "文字可能过小、对比度不足，或当前区域主要包含图像。可以调整框选范围，也可以直接使用视觉模型。", 12, C["muted"], line=1.55, wrap=True),
        icon("empty-ocr-tip-icon", 440, 374, 13, "fas:lightbulb", C["accent"]),
        text("empty-ocr-tip", 464, 368, 420, 26, "尽量放大目标文字，减少无关背景", 11, C["body"]),
        shape("empty-ocr-reselect", 440, 420, 124, 38, C["primaryButton"], R["control"]),
        icon("empty-ocr-reselect-icon", 454, 432, 13, "fas:crop-simple", C["onPrimary"]),
        text("empty-ocr-reselect-text", 476, 420, 74, 38, "重新框选", 11, C["onPrimary"], True, ["left", "middle"]),
        shape("empty-ocr-manual", 576, 420, 124, 38, C["surface3"], R["control"]),
        icon("empty-ocr-manual-icon", 590, 432, 13, "fas:keyboard", C["muted"]),
        text("empty-ocr-manual-text", 612, 420, 74, 38, "手动输入", 11, C["body"], align=["left", "middle"]),
        icon("empty-ocr-vision-icon", 440, 482, 14, "fas:eye", C["accent"]),
        text("empty-ocr-vision", 464, 476, 360, 26, "使用截图理解 · 需已配置视觉模型", 11, C["accent"], True),
        shape("empty-ocr-rule", 88, 534, 852, 1, C["divider"]),
        icon("empty-ocr-privacy-icon", 88, 566, 14, "fas:shield-halved", C["green"]),
        text("empty-ocr-privacy", 114, 560, 640, 26,
             "OCR 空结果不会触发文字上传；只有主动使用截图理解时才发送压缩截图。", 10, C["muted"]),
        text("empty-ocr-caption", 88, 606, 600, 22, "框选来源 VS Code · transformer.py", 10, C["muted"]),
        shape("capture-fail", 996, 170, 540, 500, C["surface"], R["window"], B["control"]),
        text("capture-fail-heading", 1020, 192, 360, 28, "02 · 截图失败", 14, C["text"], True),
        shape("capture-fail-symbol", 1020, 250, 40, 40, C["redSoft"], R["small"]),
        icon("capture-fail-icon", 1031, 261, 18, "fas:triangle-exclamation", C["red"]),
        text("capture-fail-title", 1076, 252, 400, 30, "无法获取框选图像", 16, C["text"], True),
        text("capture-fail-body", 1020, 316, 468, 56,
             "Windows 未能返回屏幕截图。当前窗口上下文仍保留，可直接重试，不需要重新开始提问。", 11, C["muted"], line=1.55, wrap=True),
        shape("capture-fail-cause", 1020, 392, 492, 92, C["surface2"], R["container"], B["control"]),
        text("capture-fail-cause-title", 1038, 406, 200, 22, "常见原因", 10, C["muted"], True),
        text("capture-fail-cause-copy", 1038, 434, 450, 36,
             "DRM 受保护内容 · 部分独占全屏游戏 · 捕获权限或显示状态变化", 10, C["body"], wrap=True),
        shape("capture-fail-retry", 1020, 512, 112, 38, C["primaryButton"], R["control"]),
        icon("capture-fail-retry-icon", 1034, 524, 13, "fas:rotate", C["onPrimary"]),
        text("capture-fail-retry-text", 1056, 512, 60, 38, "重试截图", 11, C["onPrimary"], True, ["left", "middle"]),
        shape("capture-fail-help", 1144, 512, 132, 38, C["surface3"], R["control"]),
        text("capture-fail-help-text", 1144, 512, 132, 38, "查看捕获帮助", 11, C["body"], align=["center", "middle"]),
        text("capture-fail-detail", 1390, 512, 100, 38, "错误详情", 10, C["muted"], align=["right", "middle"]),
        shape("capture-fail-rule", 1020, 580, 492, 1, C["divider"]),
        icon("capture-fail-shield", 1020, 608, 14, "fas:shield-halved", C["green"]),
        text("capture-fail-privacy", 1046, 602, 420, 26, "截图未生成，不会上传任何图像", 10, C["muted"]),
    ])
    capture_thumbnail(e, "empty-ocr-thumb", 88, 250, 320, 180)
    recovery_card(e, "missing-key", 64, "03 · 未配置模型服务",
                  "截图与 OCR 结果已保留。完成 OpenAI 兼容服务配置后，可从当前上下文继续。",
                  "打开设置", "稍后再配置", "API Key 使用 Windows DPAPI 加密", "fas:key", "normal")
    recovery_card(e, "offline", 564, "04 · 网络连接不可用",
                  "本次模型请求尚未发送。网络恢复后可从当前上下文重试，无需重新框选。",
                  "重试", "查看 OCR 原文", "恢复网络后保留当前问题与上下文", "fas:wifi", "error")
    recovery_card(e, "search-fail", 1064, "05 · 联网检索失败",
                  "可基于截图与 OCR 直接回答；也可以保留当前问题，稍后重试检索。",
                  "不联网，继续", "重试检索", "未使用联网资料时，不生成来源标注", "fas:globe", "normal")
    return p


def history_item(e, eid, x, y, title_value, snippet, meta, badges, selected=False, favorite=False):
    w, h = 600, 96
    e.extend([
        shape(eid, x, y, w, h, C["accentSoft"] if selected else C["surface2"], R["container"],
              B["active"] if selected else B["control"]),
        text(eid + "-title", x + 16, y + 12, 450, 22, title_value, 12, C["text"], True),
        icon(eid + "-favorite", x + w - 36, y + 15, 14, "fas:star" if favorite else "far:star",
             C["accent"] if favorite else C["muted"]),
        text(eid + "-snippet", x + 16, y + 40, 540, 20, snippet, 10, C["muted"]),
        text(eid + "-meta", x + 16, y + 68, 360, 18, meta, 9, C["muted"]),
        text(eid + "-badges", x + 410, y + 68, 156, 18, badges, 9,
             C["accent"] if selected else C["muted"], align=["right", "top"]),
    ])


def page_history():
    p = base_page(14, "历史与收藏", "搜索、筛选与收藏在同一工作台完成；重新打开恢复上下文，不自动重新请求")
    e = p["elements"]
    x, y, w, h = 64, 148, 1472, 788
    e.extend([
        shape("history-window", x, y, w, h, C["surface"], R["window"], B["floating"],
              {"blur": 40, "color": "#00000066", "offset": [0, 14]}),
        left_rounded("history-sidebar", x + 1, y + 1, 218, h - 2, C["surface2"], R["window"] - 1),
        shape("history-sidebar-line", x + 219, y + 1, 1, h - 2, C["divider"]),
        shape("history-logo-bg", x + 24, y + 22, 34, 34, C["accentSoft"], R["small"]),
        icon("history-logo", x + 32, y + 30, 18, "fas:crop-simple", C["accent"]),
        text("history-brand", x + 70, y + 20, 120, 28, "历史与收藏", 18, C["text"], True),
        text("history-brand-sub", x + 70, y + 49, 120, 16, "FLOATASK", 8, C["muted"], spacing=1.8),
        text("history-nav-label", x + 26, y + 112, 120, 20, "记录", 10, C["muted"], True),
        shape("history-nav-active", x + 14, y + 146, 190, 42, C["accentSoft"], R["control"]),
        icon("history-nav-all-icon", x + 30, y + 159, 15, "far:clock", C["accent"]),
        text("history-nav-all", x + 58, y + 146, 90, 42, "全部记录", 12, C["text"], True, ["left", "middle"]),
        text("history-nav-all-count", x + 150, y + 146, 38, 42, "128", 10, C["accent"], align=["right", "middle"]),
        icon("history-nav-fav-icon", x + 30, y + 211, 15, "fas:star", C["muted"]),
        text("history-nav-fav", x + 58, y + 198, 90, 42, "已收藏", 12, C["muted"], align=["left", "middle"]),
        text("history-nav-fav-count", x + 150, y + 198, 38, 42, "12", 10, C["muted"], align=["right", "middle"]),
        shape("history-sidebar-rule", x + 24, y + 280, 170, 1, C["divider"]),
        text("history-storage-title", x + 26, y + 308, 150, 24, "本机存储", 11, C["body"], True),
        text("history-storage-copy", x + 26, y + 342, 164, 66,
             "截图、OCR 修正与对话记录仅保存在本机。卸载前请确认是否需要备份。", 10, C["muted"], line=1.55, wrap=True),
        icon("history-storage-icon", x + 26, y + h - 72, 14, "fas:shield-halved", C["green"]),
        text("history-storage-note", x + 50, y + h - 78, 140, 26, "无云端同步", 10, C["green"]),
        text("history-title", x + 250, y + 24, 300, 34, "全部记录", 23, C["text"], True),
        text("history-subtitle", x + 250, y + 64, 600, 22, "搜索问题、OCR 原文、回答内容或来源窗口", 11, C["muted"]),
        icon("history-close", x + w - 46, y + 28, 16, "fas:xmark", C["muted"]),
        shape("history-search", x + 250, y + 78, 1198, 44, C["surface2"], R["control"], B["control"]),
        icon("history-search-icon", x + 268, y + 92, 15, "fas:magnifying-glass", C["muted"]),
        text("history-search-placeholder", x + 296, y + 84, 620, 32, "搜索历史记录…", 12, C["muted"], align=["left", "middle"]),
        shape("history-search-key", x + w - 100, y + 87, 54, 26, C["surface3"], R["small"]),
        text("history-search-key-text", x + w - 100, y + 87, 54, 26, "Ctrl F", 9, C["muted"], align=["center", "middle"]),
    ])
    filters = [("全部", 64), ("截图理解", 94), ("纯文本", 76), ("联网回答", 88)]
    fx = x + 250
    for i, (label, fw) in enumerate(filters):
        e.extend([
            shape(f"history-filter-{i}", fx, y + 142, fw, 30,
                  C["accentSoft"] if i == 0 else C["surface3"], R["small"],
                  B["active"] if i == 0 else None),
            text(f"history-filter-text-{i}", fx, y + 142, fw, 30, label, 10,
                 C["accent"] if i == 0 else C["muted"], align=["center", "middle"]),
        ])
        fx += fw + 8
    e.extend([
        text("history-result-count", x + 650, y + 142, 200, 30, "128 条结果", 10, C["muted"], align=["left", "middle"]),
        icon("history-sort-icon", x + 1080, y + 151, 12, "fas:arrow-down-wide-short", C["muted"]),
        text("history-sort", x + 1102, y + 142, 170, 30, "最近优先", 10, C["muted"], align=["right", "middle"]),
        icon("history-sort-chevron", x + 1284, y + 151, 11, "fas:chevron-down", C["muted"]),
        shape("history-detail", x + 878, y + 188, 570, 580, C["surface2"], R["container"], B["control"]),
        text("history-detail-label", x + 902, y + 208, 200, 24, "对话详情", 11, C["muted"], True),
        text("history-detail-rounds", x + 1160, y + 208, 200, 24, "6 轮对话", 10, C["muted"], align=["right", "top"]),
        icon("history-detail-more", x + 1408, y + 212, 14, "fas:ellipsis", C["muted"]),
        text("history-detail-title", x + 1150, y + 252, 260, 48, "Transformer\n自注意力机制", 16, C["text"], True, line=1.35, wrap=True),
        text("history-detail-source", x + 1150, y + 310, 260, 22, "VS Code · 今天 10:24", 10, C["muted"]),
        text("history-detail-context", x + 1150, y + 340, 280, 22, "视觉模型 · 联网检索 · OCR 已修正", 9, C["accent"]),
        shape("history-detail-rule", x + 902, y + 386, 522, 1, C["divider"]),
        text("history-answer-label", x + 902, y + 408, 200, 22, "首次解释", 10, C["muted"], True),
        text("history-answer", x + 902, y + 440, 500, 66,
             "Transformer 是一种基于自注意力机制的神经网络架构。它让模型读取整句话，再判断每个词应该关注谁。", 12, C["body"], line=1.55, wrap=True),
        text("history-sources", x + 902, y + 520, 400, 22, "2 个来源 · 3 次追问 · 最后更新于 10:31", 10, C["muted"]),
        shape("history-model-chip", x + 902, y + 558, 100, 28, C["surface3"], R["small"]),
        text("history-model-chip-text", x + 902, y + 558, 100, 28, "DeepSeek", 9, C["muted"], align=["center", "middle"]),
        shape("history-vision-chip", x + 1012, y + 558, 100, 28, C["surface3"], R["small"]),
        text("history-vision-chip-text", x + 1012, y + 558, 100, 28, "截图理解", 9, C["muted"], align=["center", "middle"]),
        shape("history-web-chip", x + 1122, y + 558, 100, 28, C["surface3"], R["small"]),
        text("history-web-chip-text", x + 1122, y + 558, 100, 28, "联网资料", 9, C["muted"], align=["center", "middle"]),
        text("history-reopen-note", x + 902, y + 614, 500, 44,
             "重新打开将恢复消息、模型、OCR 修正与来源。\n仅恢复本机记录，不会自动重新发送请求。", 10, C["muted"], line=1.55, wrap=True),
        shape("history-reopen", x + 902, y + 690, 164, 40, C["primaryButton"], R["control"]),
        icon("history-reopen-icon", x + 918, y + 703, 14, "fas:arrow-up-right-from-square", C["onPrimary"]),
        text("history-reopen-text", x + 942, y + 690, 106, 40, "重新打开对话", 11, C["onPrimary"], True, ["left", "middle"]),
        shape("history-unfavorite", x + 1080, y + 690, 128, 40, C["surface3"], R["control"]),
        icon("history-unfavorite-icon", x + 1096, y + 703, 14, "fas:star", C["accent"]),
        text("history-unfavorite-text", x + 1120, y + 690, 74, 40, "取消收藏", 11, C["body"], align=["left", "middle"]),
        text("history-detail-hint", x + 1240, y + 690, 160, 40, "Esc 关闭详情", 9, C["muted"], align=["right", "middle"]),
    ])
    capture_thumbnail(e, "history-thumb", x + 902, y + 250, 224, 126)
    records = [
        ("Transformer 自注意力机制", "它让模型读取整句话，再决定每个词应该关注谁…", "VS Code · 今天 10:24", "视觉 · 联网", True, True),
        ("TypeError: Cannot read properties…", "这个报错表示代码正在读取 undefined 上的属性…", "IDE 报错 · 今天 09:51", "OCR", False, False),
        ("如何理解这段注意力代码", "可以把 query 看作当前问题，key 用来匹配相关信息…", "VS Code · 昨天 21:16", "视觉", False, True),
        ("Windows DPAPI 是什么", "DPAPI 使用当前 Windows 用户的凭据保护本地数据…", "设置页 · 昨天 18:42", "联网", False, False),
        ("视频字幕：latent space", "Latent space 是模型压缩信息后形成的内部表示空间…", "视频播放器 · 周二", "视觉", False, False),
    ]
    for i, record in enumerate(records):
        history_item(e, f"history-record-{i}", x + 250, y + 240 + i * 108, *record)
    return p


def page_general_settings():
    p = base_page(15, "通用与快捷键", "快捷键录制与冲突反馈就地完成；工具栏、启动行为、语言与主题集中管理")
    e = p["elements"]
    x, y, w, h = 64, 148, 1472, 788
    e.extend([
        shape("general-window", x, y, w, h, C["surface"], R["window"], B["floating"],
              {"blur": 40, "color": "#00000066", "offset": [0, 14]}),
        left_rounded("general-sidebar", x + 1, y + 1, 218, h - 2, C["surface2"], R["window"] - 1),
        shape("general-sidebar-line", x + 219, y + 1, 1, h - 2, C["divider"]),
        shape("general-logo-bg", x + 24, y + 22, 34, 34, C["accentSoft"], R["small"]),
        icon("general-logo", x + 32, y + 30, 18, "fas:crop-simple", C["accent"]),
        text("general-brand", x + 70, y + 20, 100, 28, "浮问设置", 18, C["text"], True),
        text("general-brand-sub", x + 70, y + 49, 120, 16, "FLOATASK", 8, C["muted"], spacing=1.8),
    ])
    nav = [("fas:sliders", "模型服务"), ("fas:globe", "联网检索"), ("fas:keyboard", "通用与快捷键"),
           ("fas:shield-halved", "历史与隐私"), ("fas:font", "外观与阅读"), ("fas:rotate", "更新与关于")]
    for i, (ic, label) in enumerate(nav):
        yy = y + 108 + i * 52
        if i == 2:
            e.append(shape("general-nav-active", x + 14, yy - 7, 190, 40, C["accentSoft"], R["control"]))
        e.extend([
            icon(f"general-nav-icon-{i}", x + 30, yy + 4, 15, ic, C["accent"] if i == 2 else C["muted"]),
            text(f"general-nav-text-{i}", x + 58, yy, 130, 26, label, 12, C["text"] if i == 2 else C["muted"]),
        ])
    fx = x + 258
    rx = 1066
    e.extend([
        text("general-nav-note", x + 26, y + h - 70, 170, 40, "配置仅保存在本机\n快捷键由 Windows 注册", 10, C["muted"], line=1.5, wrap=True),
        icon("general-close", x + w - 46, y + 26, 16, "fas:xmark", C["muted"]),
        text("general-title", fx, y + 30, 400, 34, "通用与快捷键", 23, C["text"], True),
        text("general-desc", fx, y + 72, 780, 24, "管理全局操作、悬浮工具栏与启动行为。快捷键冲突不会覆盖当前可用配置。", 12, C["muted"]),
        shape("general-save", x + w - 166, y + 28, 118, 40, C["primaryButton"], R["control"]),
        text("general-save-text", x + w - 166, y + 28, 118, 40, "保存更改", 12, C["onPrimary"], True, ["center", "middle"]),
        text("shortcut-section", fx, y + 132, 300, 28, "全局快捷键", 15, C["text"], True),
        shape("shortcut-card", fx, y + 168, 720, 250, C["surface2"], R["container"], B["control"]),
        text("shortcut-current-title", fx + 24, y + 186, 240, 24, "框选屏幕", 12, C["text"], True),
        text("shortcut-current-sub", fx + 24, y + 216, 320, 22, "在任意应用中唤起框选遮罩", 10, C["muted"]),
        shape("shortcut-current-key", fx + 486, y + 190, 86, 34, C["surface3"], R["small"], B["control"]),
        text("shortcut-current-key-text", fx + 486, y + 190, 86, 34, "Alt Q", 11, C["body"], True, ["center", "middle"]),
        shape("shortcut-record", fx + 584, y + 190, 112, 34, C["surface3"], R["control"]),
        text("shortcut-record-text", fx + 584, y + 190, 112, 34, "重新录制", 10, C["body"], align=["center", "middle"]),
        shape("shortcut-divider", fx + 24, y + 238, 672, 1, C["divider"]),
        shape("shortcut-recording", fx + 24, y + 254, 672, 142, C["surface"], R["container"],
              {"width": 1, "color": "#E1A0A866"}),
        circle("shortcut-listening-dot", fx + 40, y + 273, 6, C["accent"]),
        text("shortcut-listening", fx + 56, y + 264, 260, 24, "正在录制 · Esc 取消", 10, C["accent"], True),
        shape("shortcut-new-key", fx + 24, y + 302, 174, 38, C["surface3"], R["control"], B["control"]),
        text("shortcut-new-key-text", fx + 24, y + 302, 174, 38, "Ctrl Alt Q", 11, C["body"], True, ["center", "middle"]),
        icon("shortcut-error-icon", fx + 216, y + 313, 14, "fas:triangle-exclamation", C["red"]),
        text("shortcut-error", fx + 240, y + 302, 350, 38,
             "系统无法注册，可能已被其他应用占用", 10, C["red"], align=["left", "middle"]),
        text("shortcut-current-kept", fx + 24, y + 352, 360, 24, "当前 Alt+Q 保持不变", 10, C["muted"]),
        shape("shortcut-cancel", fx + 506, y + 346, 70, 32, C["surface3"], R["control"]),
        text("shortcut-cancel-text", fx + 506, y + 346, 70, 32, "取消", 10, C["body"], align=["center", "middle"]),
        shape("shortcut-apply", fx + 586, y + 346, 86, 32, C["surface3"], R["control"]),
        text("shortcut-apply-text", fx + 586, y + 346, 86, 32, "不可应用", 10, C["muted"], align=["center", "middle"]),
        text("toolbar-section", rx, y + 132, 300, 28, "悬浮工具栏", 15, C["text"], True),
        shape("toolbar-settings-card", rx, y + 168, 446, 250, C["surface2"], R["container"], B["control"]),
        text("toolbar-show-title", rx + 24, y + 190, 220, 24, "显示悬浮工具栏", 12, C["text"], True),
        text("toolbar-show-sub", rx + 24, y + 218, 270, 20, "隐藏后可从系统托盘恢复", 10, C["muted"]),
        text("toolbar-snap-title", rx + 24, y + 254, 220, 24, "边缘自动吸附", 12, C["text"], True),
        text("toolbar-snap-sub", rx + 24, y + 282, 300, 20, "距边缘 24 px 内松手吸附", 10, C["muted"]),
        text("toolbar-collapse-title", rx + 24, y + 318, 220, 24, "移开后自动收起", 12, C["text"], True),
        text("toolbar-collapse-sub", rx + 24, y + 346, 300, 20, "菜单打开或拖动时不会收起", 10, C["muted"]),
        text("startup-section", fx, y + 450, 300, 28, "启动与后台行为", 15, C["text"], True),
        shape("startup-card", fx, y + 486, 720, 262, C["surface2"], R["container"], B["control"]),
        text("startup-launch-title", fx + 24, y + 508, 260, 24, "登录 Windows 后启动", 12, C["text"], True),
        text("startup-launch-sub", fx + 24, y + 536, 400, 20, "仅启动浮问，不自动执行框选或模型请求", 10, C["muted"]),
        text("startup-toolbar-title", fx + 24, y + 572, 260, 24, "启动时显示悬浮工具栏", 12, C["text"], True),
        text("startup-toolbar-sub", fx + 24, y + 600, 400, 20, "关闭后仍可使用全局快捷键", 10, C["muted"]),
        text("startup-background-title", fx + 24, y + 636, 260, 24, "关闭答案窗后保留后台运行", 12, C["text"], True),
        text("startup-background-sub", fx + 24, y + 664, 420, 20, "退出浮问需要从工具栏菜单或系统托盘操作", 10, C["muted"]),
        shape("startup-note-rule", fx + 24, y + 704, 672, 1, C["divider"]),
        text("startup-note", fx + 24, y + 718, 620, 20, "启动项变化仅在保存后生效", 10, C["muted"]),
        text("appearance-section", rx, y + 450, 300, 28, "语言与外观", 15, C["text"], True),
        shape("appearance-card", rx, y + 486, 446, 262, C["surface2"], R["container"], B["control"]),
        text("language-label", rx + 24, y + 508, 200, 22, "界面语言", 10, C["muted"], True),
        shape("language-select", rx + 24, y + 536, 398, 40, C["surface"], R["control"], B["control"]),
        text("language-value", rx + 40, y + 536, 220, 40, "简体中文", 11, C["body"], align=["left", "middle"]),
        icon("language-chevron", rx + 388, y + 550, 11, "fas:chevron-down", C["muted"]),
        text("theme-label", rx + 24, y + 600, 200, 22, "主题", 10, C["muted"], True),
        shape("theme-control", rx + 24, y + 628, 398, 40, C["surface"], R["control"], B["control"]),
        shape("theme-active", rx + 27, y + 631, 126, 34, C["accentSoft"], R["small"]),
        text("theme-system", rx + 27, y + 631, 126, 34, "跟随系统", 10, C["accent"], True, ["center", "middle"]),
        text("theme-light", rx + 157, y + 631, 126, 34, "白天", 10, C["muted"], align=["center", "middle"]),
        text("theme-dark", rx + 287, y + 631, 126, 34, "深夜", 10, C["muted"], align=["center", "middle"]),
        text("theme-note", rx + 24, y + 692, 390, 36, "双主题共用布局与圆角，仅替换语义颜色。", 10, C["muted"], wrap=True),
        text("general-footer", fx, y + h - 30, 900, 20, "快捷键保存失败时继续沿用旧配置；主题切换不需要重启。", 10, C["muted"]),
    ])
    toggle(e, "toolbar-show-toggle", rx + 388, y + 192, True)
    toggle(e, "toolbar-snap-toggle", rx + 388, y + 256, True)
    toggle(e, "toolbar-collapse-toggle", rx + 388, y + 320, True)
    toggle(e, "startup-launch-toggle", fx + 638, y + 510, False)
    toggle(e, "startup-toolbar-toggle", fx + 638, y + 574, True)
    toggle(e, "startup-background-toggle", fx + 638, y + 638, True)
    return p


def settings_shell(prefix, page, active, title, description):
    e = page["elements"]
    x, y, w, h = 64, 148, 1472, 788
    e.extend([
        shape(prefix + "-window", x, y, w, h, C["surface"], R["window"], B["floating"],
              {"blur": 40, "color": "#00000066", "offset": [0, 14]}),
        left_rounded(prefix + "-sidebar", x + 1, y + 1, 218, h - 2, C["surface2"], R["window"] - 1),
        shape(prefix + "-sidebar-line", x + 219, y + 1, 1, h - 2, C["divider"]),
        shape(prefix + "-logo-bg", x + 24, y + 22, 34, 34, C["accentSoft"], R["small"]),
        icon(prefix + "-logo", x + 32, y + 30, 18, "fas:crop-simple", C["accent"]),
        text(prefix + "-brand", x + 70, y + 20, 100, 28, "浮问设置", 18, C["text"], True),
        text(prefix + "-brand-sub", x + 70, y + 49, 120, 16, "FLOATASK", 8, C["muted"], spacing=1.8),
    ])
    nav = [("fas:sliders", "模型服务"), ("fas:globe", "联网检索"), ("fas:keyboard", "通用与快捷键"),
           ("fas:shield-halved", "历史与隐私"), ("fas:font", "外观与阅读"), ("fas:rotate", "更新与关于")]
    for i, (ic, label) in enumerate(nav):
        yy = y + 108 + i * 52
        if i == active:
            e.append(shape(f"{prefix}-nav-active", x + 14, yy - 7, 190, 40, C["accentSoft"], R["control"]))
        e.extend([
            icon(f"{prefix}-nav-icon-{i}", x + 30, yy + 4, 15, ic, C["accent"] if i == active else C["muted"]),
            text(f"{prefix}-nav-text-{i}", x + 58, yy, 130, 26, label, 12, C["text"] if i == active else C["muted"]),
        ])
    fx = x + 258
    rx = 1066
    e.extend([
        text(prefix + "-nav-note", x + 26, y + h - 70, 170, 40, "配置仅保存在本机\n保存后立即应用", 10, C["muted"], line=1.5, wrap=True),
        icon(prefix + "-close", x + w - 46, y + 26, 16, "fas:xmark", C["muted"]),
        text(prefix + "-title", fx, y + 30, 400, 34, title, 23, C["text"], True),
        text(prefix + "-desc", fx, y + 72, 790, 24, description, 12, C["muted"]),
        shape(prefix + "-save", x + w - 166, y + 28, 118, 40, C["primaryButton"], R["control"]),
        text(prefix + "-save-text", x + w - 166, y + 28, 118, 40, "保存更改", 12, C["onPrimary"], True, ["center", "middle"]),
    ])
    return e, fx, rx, x, y, w, h


def page_search_settings():
    p = base_page(16, "联网检索", "服务选择与数据流向同屏说明；失败时允许无网降级，但不伪造来源")
    e, fx, rx, x, y, w, h = settings_shell(
        "search", p, 1, "联网检索", "选择检索服务并控制网页上下文。关闭联网后，不会向搜索引擎发送检索词。"
    )
    e.extend([
        text("search-provider-section", fx, y + 132, 300, 28, "检索服务", 15, C["text"], True),
        shape("bing-card", fx, y + 168, 350, 270, C["surface2"], R["container"], B["control"]),
        shape("bing-icon-bg", fx + 24, y + 190, 38, 38, C["surface3"], R["control"]),
        icon("bing-icon", fx + 34, y + 200, 18, "fas:magnifying-glass", C["muted"]),
        text("bing-title", fx + 78, y + 190, 170, 26, "必应内置服务", 13, C["text"], True),
        text("bing-subtitle", fx + 78, y + 220, 180, 20, "开箱即用 · 无需 API Key", 10, C["muted"]),
        shape("bing-radio", fx + 304, y + 198, 16, 16, C["surface"], R["pill"], B["control"]),
        text("bing-desc", fx + 24, y + 254, 298, 48, "使用内置必应检索并抓取公开网页正文，适合不想维护服务的场景。", 11, C["body"], line=1.55, wrap=True),
        shape("bing-rule", fx + 24, y + 320, 302, 1, C["divider"]),
        icon("bing-check-1", fx + 24, y + 340, 13, "fas:check", C["green"]),
        text("bing-note-1", fx + 48, y + 334, 260, 24, "无需额外配置", 10, C["muted"]),
        icon("bing-check-2", fx + 24, y + 374, 13, "fas:check", C["green"]),
        text("bing-note-2", fx + 48, y + 368, 270, 24, "搜索结果可用性取决于网络", 10, C["muted"]),
        shape("searx-card", fx + 370, y + 168, 350, 270, C["surface2"], R["container"], B["active"]),
        shape("searx-icon-bg", fx + 394, y + 190, 38, 38, C["accentSoft"], R["control"]),
        icon("searx-icon", fx + 404, y + 200, 18, "fas:server", C["accent"]),
        text("searx-title", fx + 448, y + 190, 160, 26, "自部署 SearXNG", 13, C["text"], True),
        text("searx-subtitle", fx + 448, y + 220, 170, 20, "使用自己的聚合检索服务", 10, C["muted"]),
        shape("searx-selected", fx + 636, y + 192, 66, 26, C["accentSoft"], R["small"]),
        text("searx-selected-text", fx + 636, y + 192, 66, 26, "已选择", 9, C["accent"], True, ["center", "middle"]),
        text("searx-address-label", fx + 394, y + 264, 180, 22, "服务地址", 10, C["muted"], True),
        shape("searx-address", fx + 394, y + 294, 206, 40, C["surface"], R["control"], B["control"]),
        text("searx-address-text", fx + 408, y + 294, 180, 40, "http://127.0.0.1:8080", 10, C["body"], align=["left", "middle"]),
        shape("searx-test", fx + 610, y + 294, 92, 40, C["surface3"], R["control"]),
        text("searx-test-text", fx + 610, y + 294, 92, 40, "测试连接", 10, C["body"], align=["center", "middle"]),
        icon("searx-status-icon", fx + 396, y + 356, 14, "fas:circle-check", C["green"]),
        text("searx-status", fx + 420, y + 350, 190, 24, "连接成功 · 38 ms", 10, C["green"]),
        text("searx-status-time", fx + 590, y + 350, 110, 24, "刚刚测试", 9, C["muted"], align=["right", "top"]),
        text("searx-local-note", fx + 394, y + 392, 300, 22, "示例为本机服务；也可填写可访问的远程地址", 9, C["muted"]),
        text("search-behavior-section", fx, y + 470, 400, 28, "联网行为与隐私", 15, C["text"], True),
        shape("search-privacy-card", fx, y + 506, 720, 242, C["surface2"], R["container"], B["control"]),
        shape("search-privacy-icon-bg", fx + 24, y + 526, 36, 36, C["accentSoft"], R["control"]),
        icon("search-privacy-icon", fx + 34, y + 536, 16, "fas:shield-halved", C["accent"]),
        text("search-privacy-title", fx + 76, y + 530, 300, 26, "数据会发送到哪里", 12, C["text"], True),
        text("search-privacy-copy", fx + 24, y + 580, 668, 62,
             "检索词会发送给所选搜索引擎。开启网页正文抓取后，正文会作为模型上下文发送；OCR 仍在本机完成，关闭联网则不会发起检索。", 11, C["body"], line=1.55, wrap=True),
        shape("search-privacy-rule", fx + 24, y + 654, 672, 1, C["divider"]),
        shape("search-fallback-note", fx + 24, y + 674, 672, 50, C["accentSoft"], R["control"]),
        icon("search-fallback-icon", fx + 42, y + 691, 15, "fas:circle-info", C["accent"]),
        text("search-fallback-text", fx + 70, y + 682, 604, 34,
             "检索失败可降级为不联网回答，并明确提示；不会生成来源标注。", 10, C["body"], align=["left", "middle"]),
        text("search-params-section", rx, y + 132, 300, 28, "检索参数", 15, C["text"], True),
        shape("search-params-card", rx, y + 168, 446, 580, C["surface2"], R["container"], B["control"]),
        text("search-enable-title", rx + 24, y + 190, 240, 24, "启用联网检索", 12, C["text"], True),
        text("search-enable-sub", rx + 24, y + 218, 310, 20, "回答前根据问题获取公开网页资料", 10, C["muted"]),
        shape("search-param-rule-1", rx + 24, y + 256, 398, 1, C["divider"]),
        text("search-count-title", rx + 24, y + 282, 200, 24, "来源数量", 12, C["text"], True),
        text("search-count-sub", rx + 24, y + 310, 230, 20, "每次最多纳入回答的网页数", 10, C["muted"]),
        shape("search-count-select", rx + 274, y + 278, 148, 40, C["surface"], R["control"], B["control"]),
        text("search-count-value", rx + 290, y + 278, 88, 40, "4 个来源", 11, C["body"], align=["left", "middle"]),
        icon("search-count-chevron", rx + 392, y + 292, 11, "fas:chevron-down", C["muted"]),
        text("search-timeout-title", rx + 24, y + 362, 200, 24, "检索超时", 12, C["text"], True),
        text("search-timeout-sub", rx + 24, y + 390, 230, 20, "超时后进入降级或重试流程", 10, C["muted"]),
        shape("search-timeout-select", rx + 274, y + 358, 148, 40, C["surface"], R["control"], B["control"]),
        text("search-timeout-value", rx + 290, y + 358, 88, 40, "12 秒", 11, C["body"], align=["left", "middle"]),
        icon("search-timeout-chevron", rx + 392, y + 372, 11, "fas:chevron-down", C["muted"]),
        text("search-fetch-title", rx + 24, y + 442, 230, 24, "抓取网页正文", 12, C["text"], True),
        text("search-fetch-sub", rx + 24, y + 470, 300, 20, "不仅使用搜索摘要，也读取正文内容", 10, C["muted"]),
        shape("search-param-rule-2", rx + 24, y + 514, 398, 1, C["divider"]),
        text("search-degrade-title", rx + 24, y + 540, 250, 24, "失败时允许无网回答", 12, C["text"], True),
        text("search-degrade-sub", rx + 24, y + 568, 320, 20, "明确标记未联网，不保留失效引用", 10, C["muted"]),
        shape("search-data-note", rx + 24, y + 614, 398, 110, C["surface"], R["container"], B["control"]),
        icon("search-data-icon", rx + 42, y + 634, 15, "fas:arrow-up-right-from-square", C["muted"]),
        text("search-data-title", rx + 70, y + 626, 240, 24, "一次联网回答会传出", 10, C["body"], True),
        text("search-data-copy", rx + 42, y + 664, 356, 44,
             "检索词 → 搜索引擎\nOCR、可选截图与网页正文 → 当前模型", 10, C["muted"], line=1.55, wrap=True),
        text("search-footer", fx, y + h - 30, 960, 20, "来源标注仅对应实际检索结果；无网降级不会复用上一次回答的引用。", 10, C["muted"]),
    ])
    toggle(e, "search-enable-toggle", rx + 388, y + 192, True)
    toggle(e, "search-fetch-toggle", rx + 388, y + 444, True)
    toggle(e, "search-degrade-toggle", rx + 388, y + 542, True)
    return p


def page_privacy_settings():
    p = base_page(17, "历史与隐私", "本机保存边界清晰可见；不可撤销的清除操作使用就地确认并保留收藏")
    e, fx, rx, x, y, w, h = settings_shell(
        "privacy", p, 3, "历史与隐私", "控制本机记录内容与保留期限。清除历史不会改动模型配置或 API Key。"
    )
    e.extend([
        text("privacy-local-section", fx, y + 132, 300, 28, "本机记录", 15, C["text"], True),
        shape("privacy-local-card", fx, y + 168, 720, 344, C["surface2"], R["container"], B["control"]),
        text("privacy-history-title", fx + 24, y + 190, 250, 24, "保存历史记录", 12, C["text"], True),
        text("privacy-history-sub", fx + 24, y + 218, 470, 20, "保存问题、OCR 修正、模型回答与来源，供搜索和重新打开", 10, C["muted"]),
        shape("privacy-local-rule-1", fx + 24, y + 254, 672, 1, C["divider"]),
        text("privacy-thumb-title", fx + 24, y + 278, 250, 24, "保存截图缩略图", 12, C["text"], True),
        text("privacy-thumb-sub", fx + 24, y + 306, 470, 20, "关闭后仍保存文字对话，但历史列表不显示画面预览", 10, C["muted"]),
        shape("privacy-local-rule-2", fx + 24, y + 342, 672, 1, C["divider"]),
        text("privacy-retention-title", fx + 24, y + 368, 260, 24, "记录保留期限", 12, C["text"], True),
        text("privacy-retention-sub", fx + 24, y + 396, 360, 20, "到期后自动清理未收藏记录", 10, C["muted"]),
        shape("privacy-retention-select", fx + 524, y + 364, 172, 40, C["surface"], R["control"], B["control"]),
        text("privacy-retention-value", fx + 540, y + 364, 110, 40, "保留 90 天", 11, C["body"], align=["left", "middle"]),
        icon("privacy-retention-chevron", fx + 664, y + 378, 11, "fas:chevron-down", C["muted"]),
        shape("privacy-favorite-note", fx + 24, y + 438, 672, 50, C["accentSoft"], R["control"]),
        icon("privacy-favorite-icon", fx + 42, y + 455, 14, "fas:star", C["accent"]),
        text("privacy-favorite-text", fx + 70, y + 446, 600, 34, "收藏记录不会因保留期限到期而自动删除。", 10, C["body"], align=["left", "middle"]),
        text("privacy-security-section", fx, y + 544, 300, 28, "本机安全边界", 15, C["text"], True),
        shape("privacy-security-card", fx, y + 580, 720, 168, C["surface2"], R["container"], B["control"]),
        icon("privacy-key-icon", fx + 26, y + 602, 16, "fas:key", C["green"]),
        text("privacy-key-title", fx + 58, y + 594, 180, 24, "API Key", 11, C["body"], True),
        text("privacy-key-copy", fx + 204, y + 594, 460, 24, "使用 Windows DPAPI 加密保存", 10, C["muted"]),
        icon("privacy-ocr-icon", fx + 26, y + 650, 16, "fas:font", C["green"]),
        text("privacy-ocr-title", fx + 58, y + 642, 180, 24, "OCR 识别", 11, C["body"], True),
        text("privacy-ocr-copy", fx + 204, y + 642, 460, 24, "默认在本机完成，不依赖云端 OCR", 10, C["muted"]),
        icon("privacy-cloud-icon", fx + 26, y + 698, 16, "fas:cloud", C["green"]),
        text("privacy-cloud-title", fx + 58, y + 690, 180, 24, "历史同步", 11, C["body"], True),
        text("privacy-cloud-copy", fx + 204, y + 690, 460, 24, "无自建服务器、无云端同步、无遥测", 10, C["muted"]),
        text("privacy-clear-section", rx, y + 132, 300, 28, "清除本机数据", 15, C["text"], True),
        shape("privacy-clear-card", rx, y + 168, 446, 580, C["surface2"], R["container"], B["control"]),
        text("privacy-clear-title", rx + 24, y + 190, 250, 24, "清除历史记录", 12, C["text"], True),
        text("privacy-clear-sub", rx + 24, y + 218, 380, 40, "先显示影响范围，再要求确认；收藏与设置独立保留。", 10, C["muted"], line=1.5, wrap=True),
        shape("privacy-stats", rx + 24, y + 278, 398, 94, C["surface"], R["container"], B["control"]),
        text("privacy-total-count", rx + 44, y + 294, 90, 30, "128", 20, C["text"], True),
        text("privacy-total-label", rx + 44, y + 330, 100, 20, "全部记录", 9, C["muted"]),
        text("privacy-fav-count", rx + 174, y + 294, 90, 30, "12", 20, C["accent"], True),
        text("privacy-fav-label", rx + 174, y + 330, 100, 20, "保留收藏", 9, C["muted"]),
        text("privacy-delete-count", rx + 304, y + 294, 90, 30, "116", 20, C["red"], True),
        text("privacy-delete-label", rx + 304, y + 330, 100, 20, "将被删除", 9, C["muted"]),
        text("privacy-scope-title", rx + 24, y + 398, 180, 24, "清理范围", 10, C["muted"], True),
        icon("privacy-scope-check-1", rx + 26, y + 434, 13, "fas:check", C["green"]),
        text("privacy-scope-copy-1", rx + 50, y + 428, 350, 24, "保留 12 条收藏、API Key 与应用设置", 10, C["body"]),
        icon("privacy-scope-check-2", rx + 26, y + 466, 13, "fas:check", C["green"]),
        text("privacy-scope-copy-2", rx + 50, y + 460, 350, 24, "删除未收藏对话及其本机缩略图", 10, C["body"]),
        shape("privacy-confirm", rx + 24, y + 506, 398, 194, C["surface"], R["container"], {"width": 1, "color": "#E1A0A866"}),
        shape("privacy-warning-icon-bg", rx + 42, y + 524, 32, 32, C["surface3"], R["small"]),
        icon("privacy-warning-icon", rx + 51, y + 533, 14, "fas:triangle-exclamation", C["red"]),
        text("privacy-confirm-title", rx + 88, y + 524, 304, 26, "确认删除 116 条记录？", 12, C["text"], True),
        text("privacy-confirm-copy", rx + 88, y + 554, 292, 40, "此操作不可撤销。收藏、模型配置与 API Key 会保留。", 10, C["muted"], line=1.5, wrap=True),
        shape("privacy-cancel", rx + 42, y + 636, 112, 40, C["surface3"], R["control"]),
        text("privacy-cancel-text", rx + 42, y + 636, 112, 40, "取消", 11, C["body"], align=["center", "middle"]),
        shape("privacy-delete", rx + 256, y + 636, 148, 40, C["surface3"], R["control"], {"width": 1, "color": "#E1A0A899"}),
        icon("privacy-delete-icon", rx + 274, y + 649, 14, "fas:trash-can", C["red"]),
        text("privacy-delete-text", rx + 298, y + 636, 92, 40, "确认删除", 11, C["red"], True, ["left", "middle"]),
        text("privacy-clear-note", rx + 24, y + 716, 390, 20, "示例数量仅用于展示清除前的确认状态", 9, C["muted"]),
        text("privacy-footer", fx, y + h - 30, 960, 20, "清除操作只影响本机历史；已发送给模型或搜索引擎的数据无法通过此操作撤回。", 10, C["muted"]),
    ])
    toggle(e, "privacy-history-toggle", fx + 638, y + 192, True)
    toggle(e, "privacy-thumb-toggle", fx + 638, y + 280, True)
    return p


def page_appearance_settings():
    p = base_page(18, "外观与阅读", "主题、字体与阅读密度共用实时预览；自定义字体和动态行为集中管理")
    e, fx, rx, x, y, w, h = settings_shell(
        "appearance", p, 4, "外观与阅读", "调整主题、字体和阅读版式。所有变化即时预览，保存后跨窗口保持一致。"
    )
    e.extend([
        text("appearance-theme-section", fx, y + 132, 300, 28, "界面主题", 15, C["text"], True),
        shape("appearance-theme-card", fx, y + 168, 720, 250, C["surface2"], R["container"], B["control"]),
        text("appearance-type-title", fx, y + 450, 300, 28, "字体与阅读密度", 15, C["text"], True),
        shape("appearance-type-card", fx, y + 486, 720, 262, C["surface2"], R["container"], B["control"]),
        text("appearance-font-label", fx + 24, y + 506, 220, 22, "界面与正文字体", 10, C["muted"], True),
        shape("appearance-font-select", fx + 24, y + 534, 470, 40, C["surface"], R["control"], B["control"]),
        text("appearance-font-value", fx + 40, y + 534, 330, 40, "MiSans · 系统默认", 11, C["body"], align=["left", "middle"]),
        icon("appearance-font-chevron", fx + 460, y + 548, 11, "fas:chevron-down", C["muted"]),
        shape("appearance-font-import", fx + 508, y + 534, 188, 40, C["surface3"], R["control"]),
        icon("appearance-font-import-icon", fx + 526, y + 547, 14, "fas:arrow-up-from-bracket", C["muted"]),
        text("appearance-font-import-text", fx + 550, y + 534, 128, 40, "导入自定义字体", 10, C["body"], align=["left", "middle"]),
        text("appearance-size-label", fx + 24, y + 604, 120, 24, "正文字号", 11, C["text"], True),
        text("appearance-size-value", fx + 620, y + 602, 76, 24, "14 px", 11, C["accent"], True, ["right", "top"]),
        shape("appearance-size-track", fx + 156, y + 614, 420, 4, C["surface3"], R["pill"]),
        shape("appearance-size-progress", fx + 156, y + 614, 210, 4, C["accent"], R["pill"]),
        circle("appearance-size-thumb", fx + 358, y + 607, 18, C["accent"], B["control"]),
        text("appearance-size-min", fx + 146, y + 634, 40, 20, "12", 9, C["muted"]),
        text("appearance-size-mid", fx + 348, y + 634, 40, 20, "14", 9, C["muted"], align=["center", "top"]),
        text("appearance-size-max", fx + 536, y + 634, 40, 20, "16", 9, C["muted"], align=["right", "top"]),
        text("appearance-density-label", fx + 24, y + 674, 160, 24, "阅读密度", 11, C["text"], True),
        shape("appearance-density-control", fx + 156, y + 666, 540, 42, C["surface"], R["control"], B["control"]),
        shape("appearance-density-active", fx + 336, y + 670, 174, 34, C["accentSoft"], R["small"]),
        text("appearance-density-compact", fx + 160, y + 670, 170, 34, "紧凑", 10, C["muted"], align=["center", "middle"]),
        text("appearance-density-standard", fx + 336, y + 670, 174, 34, "标准", 10, C["accent"], True, ["center", "middle"]),
        text("appearance-density-loose", fx + 516, y + 670, 174, 34, "宽松", 10, C["muted"], align=["center", "middle"]),
        text("appearance-preview-section", rx, y + 132, 300, 28, "阅读预览", 15, C["text"], True),
        shape("appearance-preview-card", rx, y + 168, 446, 320, C["surface2"], R["container"], B["control"]),
        text("appearance-preview-label", rx + 24, y + 190, 180, 22, "深夜 · 标准密度", 10, C["muted"], True),
        text("appearance-preview-size", rx + 274, y + 190, 148, 22, "14 px / 1.55", 10, C["muted"], align=["right", "top"]),
        shape("appearance-preview-window", rx + 24, y + 226, 398, 230, C["surface"], R["container"], B["control"]),
        shape("appearance-preview-avatar", rx + 44, y + 246, 28, 28, C["accentSoft"], R["small"]),
        icon("appearance-preview-logo", rx + 50, y + 252, 16, "fas:crop-simple", C["accent"]),
        text("appearance-preview-name", rx + 84, y + 248, 160, 22, "浮问 · 刚刚", 10, C["muted"]),
        text("appearance-preview-heading", rx + 44, y + 292, 280, 24, "它解决什么问题", 13, C["text"], True),
        text("appearance-preview-body", rx + 44, y + 326, 332, 62,
             "Transformer 会让每个词同时关注句子里的其他词，再计算彼此的重要程度，因此更适合理解长距离上下文。", 12, C["body"], line=1.55, wrap=True),
        shape("appearance-preview-rule", rx + 44, y + 404, 3, 30, C["accent"], R["pill"]),
        text("appearance-preview-summary", rx + 58, y + 400, 310, 40, "一句话记住：看整句话，再决定每个词该关注谁。", 10, C["text"], line=1.5, wrap=True),
        text("appearance-behavior-section", rx, y + 520, 300, 28, "阅读与动态行为", 15, C["text"], True),
        shape("appearance-behavior-card", rx, y + 556, 446, 192, C["surface2"], R["container"], B["control"]),
        text("appearance-follow-title", rx + 24, y + 574, 250, 24, "流式回答自动跟随", 12, C["text"], True),
        text("appearance-follow-sub", rx + 24, y + 600, 310, 18, "向上阅读时仍会自动暂停", 9, C["muted"]),
        text("appearance-wrap-title", rx + 24, y + 634, 250, 24, "代码块默认自动换行", 12, C["text"], True),
        text("appearance-motion-title", rx + 24, y + 690, 250, 24, "减少动态效果", 12, C["text"], True),
        text("appearance-motion-note", rx + 24, y + 716, 300, 18, "开启后主题与窗口状态立即切换", 9, C["muted"]),
        text("appearance-footer", fx, y + h - 30, 980, 20, "自定义字体只影响界面与阅读；代码继续使用等宽字体，OCR 识别不受字体设置影响。", 10, C["muted"]),
    ])
    themes = [("跟随系统", "当前为近月"), ("朝日 · 白天", "柔和暖白"), ("近月 · 深夜", "安静暗色")]
    for i, (label, sub) in enumerate(themes):
        tx = fx + 24 + i * 229
        ty = y + 206
        e.extend([
            shape(f"appearance-theme-option-{i}", tx, ty, 213, 140, C["surface"], R["container"],
                  B["active"] if i == 0 else B["control"]),
            shape(f"appearance-theme-preview-{i}", tx + 12, ty + 12, 189, 72,
                  C["surface3"] if i == 0 else (LC["bg"] if i == 1 else C["bg"]), R["small"]),
            text(f"appearance-theme-label-{i}", tx + 16, ty + 96, 120, 22, label, 11,
                 C["accent"] if i == 0 else C["body"], i == 0),
            text(f"appearance-theme-sub-{i}", tx + 16, ty + 118, 140, 18, sub, 9, C["muted"]),
        ])
        if i == 0:
            e.extend([
                shape("appearance-system-light", tx + 24, ty + 24, 76, 48, LC["surface"], R["small"], LB["control"]),
                shape("appearance-system-dark", tx + 112, ty + 24, 76, 48, C["surface"], R["small"], B["control"]),
                icon("appearance-system-sun", tx + 52, ty + 38, 16, "far:sun", LC["accent"]),
                icon("appearance-system-moon", tx + 142, ty + 38, 16, "far:moon", C["accent"]),
                shape("appearance-theme-selected", tx + 166, ty + 98, 28, 22, C["accentSoft"], R["small"]),
                icon("appearance-theme-check", tx + 174, ty + 103, 12, "fas:check", C["accent"]),
            ])
        else:
            palette = LC if i == 1 else C
            border = LB if i == 1 else B
            e.extend([
                shape(f"appearance-theme-mini-window-{i}", tx + 32, ty + 24, 150, 48,
                      palette["surface"], R["small"], border["control"]),
                shape(f"appearance-theme-mini-logo-{i}", tx + 42, ty + 34, 12, 12, palette["accentSoft"], R["small"]),
                shape(f"appearance-theme-mini-line-1-{i}", tx + 64, ty + 34, 88, 5, palette["text"], R["pill"]),
                shape(f"appearance-theme-mini-line-2-{i}", tx + 42, ty + 54, 118, 4, palette["muted"], R["pill"]),
            ])
    e.append(text("appearance-theme-note", fx + 24, y + 372, 660, 24,
                  "跟随系统会监听 Windows 深浅色变化；手动选择后不再自动切换。", 10, C["muted"]))
    toggle(e, "appearance-follow-toggle", rx + 388, y + 576, True)
    toggle(e, "appearance-wrap-toggle", rx + 388, y + 636, False)
    toggle(e, "appearance-motion-toggle", rx + 388, y + 692, False)
    return p


def mini_theme_window(e, prefix, x, y, palette, borders, light=False):
    shadow = {"blur": 34, "color": "#26314726" if light else "#00000073", "offset": [0, 12]}
    e.extend([
        shape(prefix + "-window", x, y, 672, 384, palette["surface"], R["window"], borders["floating"], shadow),
        shape(prefix + "-logo-bg", x + 20, y + 16, 32, 32, palette["accentSoft"], R["small"]),
        icon(prefix + "-logo", x + 28, y + 24, 16, "fas:crop-simple", palette["accent"]),
        text(prefix + "-brand", x + 64, y + 18, 90, 26, "浮问", 17, palette["text"], True),
        text(prefix + "-status", x + 494, y + 22, 90, 20, "已完成", 10, palette["muted"], align=["right", "top"]),
        icon(prefix + "-pin", x + 600, y + 24, 14, "fas:thumbtack", palette["muted"]),
        icon(prefix + "-close", x + 638, y + 24, 14, "fas:xmark", palette["muted"]),
        shape(prefix + "-head-rule", x, y + 62, 672, 1, palette["divider"]),
        shape(prefix + "-context", x + 1, y + 63, 670, 42, palette["surface2"]),
        icon(prefix + "-context-icon", x + 20, y + 77, 14, "fas:crop-simple", palette["accent"]),
        text(prefix + "-context-text", x + 44, y + 72, 360, 24, "Transformer · 技术文章", 11, palette["muted"]),
        text(prefix + "-model", x + 500, y + 72, 140, 24, "DeepSeek", 10, palette["muted"], align=["right", "top"]),
        shape(prefix + "-context-rule", x, y + 104, 672, 1, palette["divider"]),
        shape(prefix + "-avatar", x + 22, y + 124, 28, 28, palette["accentSoft"], R["small"]),
        icon(prefix + "-avatar-icon", x + 28, y + 130, 16, "fas:crop-simple", palette["accent"]),
        text(prefix + "-answer-name", x + 62, y + 127, 150, 22, "浮问 · 刚刚", 10, palette["muted"]),
        text(prefix + "-answer-title", x + 22, y + 170, 420, 24, "它解决什么问题", 14, palette["text"], True),
        text(prefix + "-answer-body", x + 22, y + 204, 620, 48,
             "Transformer 会让每个词同时关注句子里的其他词，再计算彼此的重要程度，因此更适合理解长距离上下文。", 12, palette["body"], line=1.55, wrap=True),
        shape(prefix + "-summary", x + 22, y + 268, 628, 52, palette["accentSoft"], R["control"]),
        shape(prefix + "-summary-mark", x + 38, y + 282, 3, 24, palette["accent"], R["pill"]),
        text(prefix + "-summary-text", x + 54, y + 274, 570, 40,
             "一句话记住：看整句话，再决定每个词该关注谁。", 11, palette["text"], align=["left", "middle"]),
        shape(prefix + "-composer", x + 22, y + 334, 628, 38, palette["surface2"], R["container"], borders["control"]),
        icon(prefix + "-web", x + 38, y + 346, 14, "fas:globe", palette["accent"]),
        text(prefix + "-placeholder", x + 62, y + 338, 360, 30, "继续追问，或让我查一下…", 10, palette["muted"], align=["left", "middle"]),
        shape(prefix + "-send", x + 604, y + 340, 36, 26, palette["primaryButton"], R["small"]),
        icon(prefix + "-send-icon", x + 615, y + 347, 12, "fas:arrow-up", palette["onPrimary"]),
    ])


def page_theme_system():
    p = base_page(19, "朝日／近月 · 双主题", "同一答案窗并排校验朝日与近月；只替换语义颜色，不改变布局、圆角与阅读结构")
    e = p["elements"]
    e.extend([
        shape("theme-light-desktop", 64, 148, 720, 466, "#DFE1D8", R["window"], LB["control"]),
        text("theme-light-label", 88, 166, 260, 24, "朝日 · 柔和暖白", 12, LC["text"], True),
        text("theme-light-note", 468, 166, 292, 24, "深色描边 + 柔和投影", 10, LC["muted"], align=["right", "top"]),
        shape("theme-dark-desktop", 816, 148, 720, 466, "#101419", R["window"], B["control"]),
        text("theme-dark-label", 840, 166, 260, 24, "近月 · 安静暗色", 12, C["text"], True),
        text("theme-dark-note", 1220, 166, 292, 24, "浅色描边 + 柔和投影", 10, C["muted"], align=["right", "top"]),
        shape("theme-token-card", 64, 642, 1040, 294, C["surface"], R["container"], B["control"]),
        text("theme-token-title", 88, 660, 300, 28, "语义色映射", 15, C["text"], True),
        text("theme-token-subtitle", 394, 664, 680, 22, "实现时使用角色名称，不在组件中散落主题判断", 10, C["muted"], align=["right", "top"]),
        shape("theme-token-head-rule", 88, 704, 992, 1, C["divider"]),
        text("theme-token-head-role", 88, 712, 130, 20, "语义角色", 9, C["muted"], True),
        text("theme-token-head-light", 250, 712, 170, 20, "朝日", 9, C["muted"], True),
        text("theme-token-head-dark", 462, 712, 170, 20, "近月", 9, C["muted"], True),
        text("theme-token-head-use", 686, 712, 300, 20, "用途", 9, C["muted"], True),
        shape("theme-switch-card", 1128, 642, 408, 294, C["surface"], R["container"], B["control"]),
        text("theme-switch-title", 1152, 660, 300, 28, "切换与验收规则", 15, C["text"], True),
    ])
    mini_theme_window(e, "theme-light", 88, 206, LC, LB, True)
    mini_theme_window(e, "theme-dark", 840, 206, C, B, False)
    rows = [
        ("主表面", LC["surface"], C["surface"], "窗口与答案表面"),
        ("次表面", LC["surface2"], C["surface2"], "上下文、输入与卡片"),
        ("主文字", LC["text"], C["text"], "标题与重点内容"),
        ("正文", LC["body"], C["body"], "长文阅读"),
        ("辅助文字", LC["muted"], C["muted"], "次要说明 · 朝日 4.53:1"),
        ("强调色", LC["accent"], C["accent"], "选中、焦点与链接"),
        ("主按钮", LC["primaryButton"], C["primaryButton"], "发送与主要操作"),
    ]
    for i, (role, light, dark, usage) in enumerate(rows):
        yy = 740 + i * 26
        e.extend([
            text(f"theme-role-{i}", 88, yy, 140, 22, role, 10, C["body"]),
            circle(f"theme-light-swatch-{i}", 250, yy + 3, 15, light, LB["control"]),
            text(f"theme-light-hex-{i}", 276, yy, 130, 22, light, 10, C["muted"]),
            circle(f"theme-dark-swatch-{i}", 462, yy + 3, 15, dark, B["control"]),
            text(f"theme-dark-hex-{i}", 488, yy, 130, 22, dark, 10, C["muted"]),
            text(f"theme-usage-{i}", 686, yy, 360, 22, usage, 10, C["muted"]),
        ])
    rules = [
        ("跟随系统", "监听 Windows 深浅色变化，无需重启。"),
        ("结构一致", "布局、尺寸、圆角和组件状态保持不变。"),
        ("过渡克制", "颜色过渡 120 ms；减少动态效果时立即切换。"),
        ("浮层可读", "两种桌面均保留 1 px 描边与投影，不用发光。"),
    ]
    for i, (title, copy) in enumerate(rules):
        yy = 710 + i * 52
        e.extend([
            circle(f"theme-rule-dot-{i}", 1154, yy + 5, 7, C["accent"]),
            text(f"theme-rule-title-{i}", 1174, yy - 2, 110, 22, title, 10, C["body"], True),
            text(f"theme-rule-copy-{i}", 1174, yy + 20, 326, 26, copy, 9, C["muted"], wrap=True),
        ])
    return p


def page_light_answer():
    p = {
        "pageType": "content",
        "background": fill(LC["bg"]),
        "elements": [
            text("kicker", 64, 34, 700, 20, "FLOATASK · ASAHI LIGHT THEME / 20", 11, LC["muted"], spacing=2),
            text("page-title", 64, 65, 700, 42, "朝日 · 白天", 29, LC["text"], True),
            text("page-subtitle", 64, 110, 1080, 24, "柔和暖白降低大面积亮度；保留灰雾蓝强调色、清晰文字与既有圆角结构", 13, LC["muted"]),
        ],
    }
    e = p["elements"]
    x, y, w, h = 64, 148, 980, 788
    sx = 1080
    e.extend([
        shape("asahi-window", x, y, w, h, LC["surface"], R["window"], LB["floating"],
              {"blur": 38, "color": "#26314726", "offset": [0, 14]}),
        shape("asahi-logo-bg", x + 24, y + 20, 32, 32, LC["accentSoft"], R["small"]),
        icon("asahi-logo", x + 32, y + 28, 16, "fas:crop-simple", LC["accent"]),
        text("asahi-brand", x + 68, y + 18, 100, 28, "浮问", 19, LC["text"], True),
        text("asahi-brand-en", x + 69, y + 44, 100, 12, "FLOATASK", 8, LC["muted"], spacing=1.8),
        circle("asahi-status-dot", x + 644, y + 33, 6, LC["green"]),
        text("asahi-status", x + 660, y + 26, 66, 20, "已完成", 11, LC["muted"]),
        shape("asahi-head-line", x, y + 63, w, 1, LC["divider"]),
        shape("asahi-context-bg", x + 1, y + 64, w - 2, 43, LC["surface2"]),
        icon("asahi-context-icon", x + 24, y + 78, 14, "fas:crop-simple", LC["accent"]),
        text("asahi-context", x + 48, y + 73, 520, 24, "Transformer · 技术文章", 12, LC["muted"]),
        text("asahi-model", x + w - 190, y + 73, 120, 24, "DeepSeek", 11, LC["muted"], align=["right", "top"]),
        icon("asahi-chevron", x + w - 48, y + 80, 11, "fas:chevron-down", LC["muted"]),
        shape("asahi-context-line", x, y + 106, w, 1, LC["divider"]),
        shape("asahi-avatar", x + 26, y + 128, 28, 28, LC["accentSoft"], R["small"]),
        icon("asahi-avatar-mark", x + 32, y + 134, 16, "fas:crop-simple", LC["accent"]),
        text("asahi-answer-name", x + 66, y + 131, 160, 20, "浮问 · 刚刚", 11, LC["muted"]),
        text("asahi-intro", x + 26, y + 172, w - 52, 52,
             "<p><strong>Transformer</strong> 是一种基于自注意力机制的神经网络架构，用来处理文本、代码等序列数据。</p>",
             15, LC["text"], line=1.55, wrap=True),
        text("asahi-heading-1", x + 26, y + 246, 300, 24, "它解决什么问题", 16, LC["text"], True),
        text("asahi-body-1", x + 26, y + 278, w - 52, 48,
             "传统循环网络按顺序处理信息，长文本中的远距离关系容易变弱。Transformer 会让每个词同时关注句子里的其他词，再计算彼此的重要程度。",
             13, LC["body"], line=1.5, wrap=True),
        text("asahi-heading-2", x + 26, y + 348, 300, 24, "它带来了什么", 16, LC["text"], True),
        text("asahi-bullets", x + 26, y + 380, w - 52, 68,
             "<p><span style=\"color:#506B92\">•</span>　<strong>理解上下文</strong>：同一个词可以随语境获得不同含义。</p><p><span style=\"color:#506B92\">•</span>　<strong>并行计算</strong>：更适合利用现代硬件进行大规模训练。</p><p><span style=\"color:#506B92\">•</span>　<strong>通用架构</strong>：语言、视觉和多模态模型都能以此为基础。</p>",
             13, LC["body"], line=1.48, wrap=True),
        shape("asahi-summary-bg", x + 26, y + 470, w - 52, 62, LC["accentSoft"], R["container"]),
        shape("asahi-summary-rule", x + 42, y + 482, 3, 38, LC["accent"], R["pill"]),
        text("asahi-summary", x + 58, y + 480, w - 92, 42,
             "<p><strong>一句话记住</strong>：它让模型学会“看整句话，再决定每个词该关注谁”。</p>",
             13, LC["text"], line=1.5, wrap=True),
        shape("asahi-sources-rule", x + 26, y + 554, w - 52, 1, LC["divider"]),
        text("asahi-sources-title", x + 26, y + 574, 200, 20, "参考来源", 11, LC["muted"], True),
        circle("asahi-source-index-1", x + 26, y + 606, 18, LC["accentSoft"]),
        text("asahi-source-index-text-1", x + 26, y + 606, 18, 18, "1", 10, LC["accent"], align=["center", "middle"]),
        text("asahi-source-1", x + 54, y + 602, 450, 22, "Attention Is All You Need", 12, LC["body"]),
        text("asahi-source-domain-1", x + w - 190, y + 603, 164, 20, "arxiv.org", 10, LC["muted"], align=["right", "top"]),
        circle("asahi-source-index-2", x + 26, y + 638, 18, LC["accentSoft"]),
        text("asahi-source-index-text-2", x + 26, y + 638, 18, 18, "2", 10, LC["accent"], align=["center", "middle"]),
        text("asahi-source-2", x + 54, y + 634, 450, 22, "The Illustrated Transformer", 12, LC["body"]),
        text("asahi-source-domain-2", x + w - 190, y + 635, 164, 20, "jalammar.github.io", 10, LC["muted"], align=["right", "top"]),
        shape("asahi-footer-line", x, y + 660, w, 1, LC["divider"]),
        shape("asahi-composer-box", x + 26, y + 710, w - 52, 58, LC["surface2"], R["container"], LB["control"]),
        icon("asahi-web", x + 44, y + 731, 15, "fas:globe", LC["accent"]),
        text("asahi-web-text", x + 67, y + 727, 40, 24, "联网", 11, LC["accent"]),
        shape("asahi-composer-sep", x + 116, y + 724, 1, 30, LC["divider"]),
        text("asahi-placeholder", x + 134, y + 723, 600, 32, "继续追问，或让我查一下…", 13, LC["muted"], align=["left", "middle"]),
        shape("asahi-send", x + w - 80, y + 718, 42, 42, LC["primaryButton"], R["control"]),
        icon("asahi-send-icon", x + w - 67, y + 731, 16, "fas:arrow-up", LC["onPrimary"]),
        text("asahi-hint", x + 26, y + 778, 500, 18, "Enter 发送　·　Shift + Enter 换行", 10, LC["muted"]),
        text("asahi-vision", x + w - 326, y + 778, 300, 18, "OCR 在本机完成", 10, LC["muted"], align=["right", "top"]),
        shape("asahi-spec-card", sx, y, 456, h, LC["surface2"], R["window"], LB["floating"],
              {"blur": 30, "color": "#2631471A", "offset": [0, 10]}),
        text("asahi-spec-kicker", sx + 24, y + 24, 280, 20, "ASAHI / DAYLIGHT", 9, LC["muted"], True, spacing=1.5),
        text("asahi-spec-title", sx + 24, y + 58, 240, 40, "朝日", 28, LC["text"], True),
        text("asahi-spec-subtitle", sx + 24, y + 106, 390, 48,
             "以柔和暖白代替冷白高亮。色彩更安静，文字与功能状态仍然清晰。", 12, LC["body"], line=1.55, wrap=True),
        shape("asahi-spec-rule-1", sx + 24, y + 176, 408, 1, LC["divider"]),
        text("asahi-palette-title", sx + 24, y + 200, 240, 24, "核心色板", 13, LC["text"], True),
        shape("asahi-spec-rule-2", sx + 24, y + 400, 408, 1, LC["divider"]),
        text("asahi-soft-title", sx + 24, y + 426, 260, 24, "柔和，但不过度染色", 13, LC["text"], True),
        text("asahi-soft-copy", sx + 24, y + 460, 398, 64,
             "暖白只用于大面积表面；正文保持中性深灰，强调色沿用灰雾蓝，不使用黄色滤层或大面积绿色。", 11, LC["body"], line=1.55, wrap=True),
        text("asahi-contrast-title", sx + 24, y + 550, 260, 24, "主表面阅读对比度", 13, LC["text"], True),
        shape("asahi-name-note", sx + 24, y + 694, 408, 66, LC["accentSoft"], R["container"]),
        icon("asahi-name-icon", sx + 42, y + 716, 16, "far:sun", LC["accent"]),
        text("asahi-name-copy", sx + 72, y + 704, 336, 48,
             "朝日 · 白天　／　近月 · 深夜\n名称来自《近月少女的礼仪》的意象", 10, LC["body"], line=1.55, wrap=True),
    ])
    action_names = ["fas:crop-simple", "fas:thumbtack", "far:clock", "fas:gear", "fas:xmark"]
    for i, name in enumerate(action_names):
        e.append(icon(f"asahi-action-{i}", x + w - 220 + i * 42, y + 28, 15, name, LC["muted"]))
    chips = [("更通俗", 72), ("举个例子", 82), ("深入一点", 82), ("联网核查", 92)]
    cx = x + 26
    for i, (label, cw) in enumerate(chips):
        e.extend([
            shape(f"asahi-chip-{i}", cx, y + 672, cw, 28, LC["surface3"], R["small"]),
            text(f"asahi-chip-text-{i}", cx, y + 672, cw, 28, label, 11, LC["muted"], align=["center", "middle"]),
        ])
        cx += cw + 8
    swatches = [(LC["surface"], "主表面"), (LC["surface2"], "次表面"), (LC["accentSoft"], "柔和底色"), (LC["accent"], "强调色")]
    for i, (color, label) in enumerate(swatches):
        xx = sx + 24 + i * 104
        e.extend([
            shape(f"asahi-swatch-{i}", xx, y + 240, 88, 58, color, R["control"], LB["control"]),
            text(f"asahi-swatch-hex-{i}", xx, y + 308, 88, 20, color, 9, LC["body"], align=["center", "top"]),
            text(f"asahi-swatch-label-{i}", xx, y + 334, 88, 20, label, 9, LC["muted"], align=["center", "top"]),
        ])
    contrast = [("主文字", "14.01:1"), ("正文", "8.57:1"), ("辅助文字", "4.53:1"), ("强调色", "4.89:1")]
    for i, (label, value) in enumerate(contrast):
        yy = y + 586 + i * 26
        e.extend([
            text(f"asahi-contrast-label-{i}", sx + 24, yy, 180, 22, label, 10, LC["muted"]),
            text(f"asahi-contrast-value-{i}", sx + 280, yy, 128, 22, value, 10, LC["body"], True, ["right", "top"]),
        ])
    return p


def light_page(index, title_value, subtitle):
    return {
        "pageType": "content",
        "background": fill(LC["bg"]),
        "elements": [
            text("kicker", 64, 34, 700, 20, f"FLOATASK · ASAHI LIGHT THEME / {index:02d}", 11, LC["muted"], spacing=2),
            text("page-title", 64, 65, 700, 42, title_value, 29, LC["text"], True),
            text("page-subtitle", 64, 110, 1100, 24, subtitle, 13, LC["muted"]),
        ],
    }


def light_settings_shell(prefix, page, active, title_value, description):
    e = page["elements"]
    x, y, w, h = 64, 148, 1472, 788
    shadow = TOKENS["themes"]["light"]["shadows"]["floating"]
    e.extend([
        shape(prefix + "-window", x, y, w, h, LC["surface"], R["window"], LB["floating"], shadow),
        left_rounded(prefix + "-sidebar", x + 1, y + 1, 218, h - 2, LC["surface2"], R["window"] - 1),
        shape(prefix + "-sidebar-line", x + 219, y + 1, 1, h - 2, LC["divider"]),
        shape(prefix + "-logo-bg", x + 24, y + 22, 34, 34, LC["accentSoft"], R["small"]),
        icon(prefix + "-logo", x + 32, y + 30, 18, "fas:crop-simple", LC["accent"]),
        text(prefix + "-brand", x + 70, y + 20, 100, 28, "浮问设置", 18, LC["text"], True),
        text(prefix + "-brand-sub", x + 70, y + 49, 120, 16, "FLOATASK", 8, LC["muted"], spacing=1.8),
    ])
    nav = [("fas:sliders", "模型服务"), ("fas:globe", "联网检索"), ("fas:keyboard", "通用与快捷键"),
           ("fas:shield-halved", "历史与隐私"), ("fas:font", "外观与阅读"), ("fas:rotate", "更新与关于")]
    for i, (ic, label) in enumerate(nav):
        yy = y + 108 + i * 52
        if i == active:
            e.append(shape(f"{prefix}-nav-active", x + 14, yy - 7, 190, 40, LC["accentSoft"], R["control"]))
        e.extend([
            icon(f"{prefix}-nav-icon-{i}", x + 30, yy + 4, 15, ic, LC["accent"] if i == active else LC["muted"]),
            text(f"{prefix}-nav-text-{i}", x + 58, yy, 130, 26, label, 12, LC["text"] if i == active else LC["muted"]),
        ])
    fx = x + 258
    e.extend([
        text(prefix + "-nav-note", x + 26, y + h - 70, 170, 40, "配置仅保存在本机\nAPI Key 使用系统加密", 10, LC["muted"], line=1.5, wrap=True),
        icon(prefix + "-close", x + w - 46, y + 26, 16, "fas:xmark", LC["muted"]),
        text(prefix + "-title", fx, y + 30, 400, 34, title_value, 23, LC["text"], True),
        text(prefix + "-desc", fx, y + 72, 800, 24, description, 12, LC["muted"]),
        shape(prefix + "-save", x + w - 166, y + 28, 118, 40, LC["primaryButton"], R["control"]),
        text(prefix + "-save-text", x + w - 166, y + 28, 118, 40, "保存更改", 12, LC["onPrimary"], True, ["center", "middle"]),
    ])
    return e, fx, x, y, w, h


def page_light_settings():
    p = light_page(21, "朝日 · 模型服务设置", "与近月共用导航、表单和状态结构；暖白表面、灰雾蓝主按钮与同色系选中态共同构成朝日设置页")
    e, fx, x, y, w, h = light_settings_shell(
        "asahi-settings", p, 0, "模型服务", "选择 OpenAI 兼容服务。首次解释、追问与视觉任务可随后分别配置。"
    )
    providers = [("DS", "DeepSeek", "api.deepseek.com"), ("AI", "OpenAI", "api.openai.com"),
                 ("OR", "OpenRouter", "openrouter.ai"), ("G", "Google Gemini", "generativelanguage.googleapis.com"),
                 ("OL", "本地 Ollama", "127.0.0.1"), ("＋", "自定义服务", "OpenAI 兼容接口")]
    for i, (mark, name, domain) in enumerate(providers):
        col, row = i % 3, i // 3
        xx = fx + col * 382
        yy = y + 122 + row * 90
        active = i == 0
        e.extend([
            shape(f"asahi-provider-{i}", xx, yy, 360, 76,
                  LC["accentSoft"] if active else LC["surface2"], R["control"],
                  LB["active"] if active else LB["control"]),
            shape(f"asahi-provider-mark-bg-{i}", xx + 14, yy + 16, 30, 30, LC["surface3"], R["small"]),
            text(f"asahi-provider-mark-{i}", xx + 14, yy + 16, 30, 30, mark, 10, LC["accent"] if active else LC["muted"], True, ["center", "middle"]),
            text(f"asahi-provider-name-{i}", xx + 56, yy + 12, 210, 24, name, 13, LC["text"], True),
            text(f"asahi-provider-domain-{i}", xx + 56, yy + 40, 260, 20, domain, 10, LC["muted"]),
        ])
        if active:
            e.append(icon("asahi-provider-check", xx + 326, yy + 18, 14, "fas:check", LC["accent"]))
    fy = y + 320
    e.extend([
        text("asahi-base-label", fx, fy, 300, 20, "Base URL", 11, LC["muted"], True),
        shape("asahi-base-input", fx, fy + 26, 1124, 42, LC["surface2"], R["control"], LB["control"]),
        text("asahi-base-value", fx + 14, fy + 26, 700, 42, "https://api.deepseek.com/v1", 12, LC["body"], align=["left", "middle"]),
        text("asahi-model-label", fx, fy + 88, 300, 20, "模型名称", 11, LC["muted"], True),
        shape("asahi-model-input", fx, fy + 114, 548, 42, LC["surface2"], R["control"], LB["control"]),
        text("asahi-model-value", fx + 14, fy + 114, 500, 42, "deepseek-chat", 12, LC["body"], align=["left", "middle"]),
        text("asahi-key-label", fx + 576, fy + 88, 300, 20, "API Key", 11, LC["muted"], True),
        shape("asahi-key-input", fx + 576, fy + 114, 548, 42, LC["surface2"], R["control"], LB["control"]),
        text("asahi-key-value", fx + 590, fy + 114, 400, 42, "••••••••••••••••••••", 12, LC["body"], align=["left", "middle"]),
        text("asahi-key-show", fx + 1048, fy + 114, 60, 42, "显示", 11, LC["muted"], align=["center", "middle"]),
        text("asahi-key-help", fx + 576, fy + 162, 460, 20, "仅保存在本机，使用 Windows DPAPI 加密", 10, LC["muted"]),
        text("asahi-vision-title", fx + 48, fy + 200, 160, 24, "截图理解", 12, LC["text"], True),
        text("asahi-vision-desc", fx + 48, fy + 226, 660, 22, "将压缩后的截图一并发给视觉模型，适合图表和界面。", 11, LC["muted"]),
        shape("asahi-advanced-row", fx, fy + 272, 1124, 52, LC["surface2"], R["container"], LB["control"]),
        icon("asahi-advanced-icon", fx + 16, fy + 290, 15, "fas:layer-group", LC["muted"]),
        text("asahi-advanced-title", fx + 44, fy + 282, 520, 28, "按任务使用不同模型", 12, LC["body"], True),
        text("asahi-advanced-state", fx + 760, fy + 282, 260, 28, "未启用 · 展开配置", 11, LC["muted"], align=["right", "middle"]),
        icon("asahi-advanced-chevron", fx + 1082, fy + 290, 13, "fas:chevron-down", LC["muted"]),
        shape("asahi-test-button", fx, fy + 346, 112, 38, LC["surface3"], R["control"]),
        text("asahi-test-text", fx, fy + 346, 112, 38, "测试连接", 12, LC["body"], align=["center", "middle"]),
        circle("asahi-test-dot", fx + 130, fy + 362, 7, LC["green"]),
        text("asahi-test-result", fx + 146, fy + 354, 400, 24, "连接成功 · 218 ms", 11, LC["green"]),
        shape("asahi-settings-footer", x + 220, y + h - 1, w - 221, 1, LC["divider"]),
        text("asahi-settings-privacy", fx, y + h - 34, 720, 22, "截图默认只在本机 OCR；开启联网后，检索词会发送给搜索引擎。", 10, LC["muted"]),
    ])
    toggle(e, "asahi-vision-toggle", fx, fy + 206, True, LC)
    return p


def light_history_item(e, eid, x, y, title_value, snippet, meta, badges, selected=False, favorite=False):
    e.extend([
        shape(eid, x, y, 600, 96, LC["accentSoft"] if selected else LC["surface2"], R["container"],
              LB["active"] if selected else LB["control"]),
        text(eid + "-title", x + 16, y + 12, 450, 22, title_value, 12, LC["text"], True),
        icon(eid + "-favorite", x + 564, y + 15, 14, "fas:star" if favorite else "far:star",
             LC["accent"] if favorite else LC["muted"]),
        text(eid + "-snippet", x + 16, y + 40, 540, 20, snippet, 10, LC["muted"]),
        text(eid + "-meta", x + 16, y + 68, 360, 18, meta, 9, LC["muted"]),
        text(eid + "-badges", x + 410, y + 68, 156, 18, badges, 9,
             LC["accent"] if selected else LC["muted"], align=["right", "top"]),
    ])


def page_light_history():
    p = light_page(22, "朝日 · 历史与收藏", "列表、详情、筛选和收藏状态完整保留；浅色来源截图与暖白工作台保持同一主题，不再使用深色主题示意")
    e = p["elements"]
    x, y, w, h = 64, 148, 1472, 788
    shadow = TOKENS["themes"]["light"]["shadows"]["floating"]
    e.extend([
        shape("asahi-history-window", x, y, w, h, LC["surface"], R["window"], LB["floating"], shadow),
        left_rounded("asahi-history-sidebar", x + 1, y + 1, 218, h - 2, LC["surface2"], R["window"] - 1),
        shape("asahi-history-sidebar-line", x + 219, y + 1, 1, h - 2, LC["divider"]),
        shape("asahi-history-logo-bg", x + 24, y + 22, 34, 34, LC["accentSoft"], R["small"]),
        icon("asahi-history-logo", x + 32, y + 30, 18, "fas:crop-simple", LC["accent"]),
        text("asahi-history-brand", x + 70, y + 20, 120, 28, "历史与收藏", 18, LC["text"], True),
        text("asahi-history-brand-sub", x + 70, y + 49, 120, 16, "FLOATASK", 8, LC["muted"], spacing=1.8),
        text("asahi-history-nav-label", x + 26, y + 112, 120, 20, "记录", 10, LC["muted"], True),
        shape("asahi-history-nav-active", x + 14, y + 146, 190, 42, LC["accentSoft"], R["control"]),
        icon("asahi-history-nav-all-icon", x + 30, y + 159, 15, "far:clock", LC["accent"]),
        text("asahi-history-nav-all", x + 58, y + 146, 90, 42, "全部记录", 12, LC["text"], True, ["left", "middle"]),
        text("asahi-history-nav-all-count", x + 150, y + 146, 38, 42, "128", 10, LC["accent"], align=["right", "middle"]),
        icon("asahi-history-nav-fav-icon", x + 30, y + 211, 15, "fas:star", LC["muted"]),
        text("asahi-history-nav-fav", x + 58, y + 198, 90, 42, "已收藏", 12, LC["muted"], align=["left", "middle"]),
        text("asahi-history-nav-fav-count", x + 150, y + 198, 38, 42, "12", 10, LC["muted"], align=["right", "middle"]),
        shape("asahi-history-sidebar-rule", x + 24, y + 280, 170, 1, LC["divider"]),
        text("asahi-history-storage-title", x + 26, y + 308, 150, 24, "本机存储", 11, LC["body"], True),
        text("asahi-history-storage-copy", x + 26, y + 342, 164, 66,
             "截图、OCR 修正与对话记录仅保存在本机。卸载前请确认是否需要备份。", 10, LC["muted"], line=1.55, wrap=True),
        icon("asahi-history-storage-icon", x + 26, y + h - 72, 14, "fas:shield-halved", LC["green"]),
        text("asahi-history-storage-note", x + 50, y + h - 78, 140, 26, "无云端同步", 10, LC["green"]),
        text("asahi-history-title", x + 250, y + 24, 300, 34, "全部记录", 23, LC["text"], True),
        text("asahi-history-subtitle", x + 250, y + 64, 600, 22, "搜索问题、OCR 原文、回答内容或来源窗口", 11, LC["muted"]),
        icon("asahi-history-close", x + w - 46, y + 28, 16, "fas:xmark", LC["muted"]),
        shape("asahi-history-search", x + 250, y + 78, 1198, 44, LC["surface2"], R["control"], LB["control"]),
        icon("asahi-history-search-icon", x + 268, y + 92, 15, "fas:magnifying-glass", LC["muted"]),
        text("asahi-history-search-placeholder", x + 296, y + 84, 620, 32, "搜索历史记录…", 12, LC["muted"], align=["left", "middle"]),
        shape("asahi-history-search-key", x + w - 100, y + 87, 54, 26, LC["surface3"], R["small"]),
        text("asahi-history-search-key-text", x + w - 100, y + 87, 54, 26, "Ctrl F", 9, LC["muted"], align=["center", "middle"]),
        shape("asahi-history-detail", x + 878, y + 188, 570, 580, LC["surface2"], R["container"], LB["control"]),
        text("asahi-history-detail-label", x + 902, y + 208, 200, 24, "对话详情", 11, LC["muted"], True),
        text("asahi-history-detail-rounds", x + 1160, y + 208, 200, 24, "6 轮对话", 10, LC["muted"], align=["right", "top"]),
        icon("asahi-history-detail-more", x + 1408, y + 212, 14, "fas:ellipsis", LC["muted"]),
        text("asahi-history-detail-title", x + 1150, y + 252, 260, 48, "Transformer\n自注意力机制", 16, LC["text"], True, line=1.35, wrap=True),
        text("asahi-history-detail-source", x + 1150, y + 310, 260, 22, "VS Code · 今天 10:24", 10, LC["muted"]),
        text("asahi-history-detail-context", x + 1150, y + 340, 280, 22, "视觉模型 · 联网检索 · OCR 已修正", 9, LC["accent"]),
        shape("asahi-history-detail-rule", x + 902, y + 386, 522, 1, LC["divider"]),
        text("asahi-history-answer-label", x + 902, y + 408, 200, 22, "首次解释", 10, LC["muted"], True),
        text("asahi-history-answer", x + 902, y + 440, 500, 66,
             "Transformer 是一种基于自注意力机制的神经网络架构。它让模型读取整句话，再判断每个词应该关注谁。", 12, LC["body"], line=1.55, wrap=True),
        text("asahi-history-sources", x + 902, y + 520, 400, 22, "2 个来源 · 3 次追问 · 最后更新于 10:31", 10, LC["muted"]),
        shape("asahi-history-model-chip", x + 902, y + 558, 100, 28, LC["surface3"], R["small"]),
        text("asahi-history-model-chip-text", x + 902, y + 558, 100, 28, "DeepSeek", 9, LC["muted"], align=["center", "middle"]),
        shape("asahi-history-vision-chip", x + 1012, y + 558, 100, 28, LC["surface3"], R["small"]),
        text("asahi-history-vision-chip-text", x + 1012, y + 558, 100, 28, "截图理解", 9, LC["muted"], align=["center", "middle"]),
        shape("asahi-history-web-chip", x + 1122, y + 558, 100, 28, LC["surface3"], R["small"]),
        text("asahi-history-web-chip-text", x + 1122, y + 558, 100, 28, "联网资料", 9, LC["muted"], align=["center", "middle"]),
        text("asahi-history-reopen-note", x + 902, y + 614, 500, 44,
             "重新打开将恢复消息、模型、OCR 修正与来源。\n仅恢复本机记录，不会自动重新发送请求。", 10, LC["muted"], line=1.55, wrap=True),
        shape("asahi-history-reopen", x + 902, y + 690, 164, 40, LC["primaryButton"], R["control"]),
        icon("asahi-history-reopen-icon", x + 918, y + 703, 14, "fas:arrow-up-right-from-square", LC["onPrimary"]),
        text("asahi-history-reopen-text", x + 942, y + 690, 106, 40, "重新打开对话", 11, LC["onPrimary"], True, ["left", "middle"]),
        shape("asahi-history-unfavorite", x + 1080, y + 690, 128, 40, LC["surface3"], R["control"]),
        icon("asahi-history-unfavorite-icon", x + 1096, y + 703, 14, "fas:star", LC["accent"]),
        text("asahi-history-unfavorite-text", x + 1120, y + 690, 74, 40, "取消收藏", 11, LC["body"], align=["left", "middle"]),
        text("asahi-history-detail-hint", x + 1240, y + 690, 160, 40, "Esc 关闭详情", 9, LC["muted"], align=["right", "middle"]),
    ])
    filters = [("全部", 64), ("截图理解", 94), ("纯文本", 76), ("联网回答", 88)]
    fx = x + 250
    for i, (label, fw) in enumerate(filters):
        e.extend([
            shape(f"asahi-history-filter-{i}", fx, y + 142, fw, 30,
                  LC["accentSoft"] if i == 0 else LC["surface3"], R["small"], LB["active"] if i == 0 else None),
            text(f"asahi-history-filter-text-{i}", fx, y + 142, fw, 30, label, 10,
                 LC["accent"] if i == 0 else LC["muted"], align=["center", "middle"]),
        ])
        fx += fw + 8
    e.extend([
        text("asahi-history-result-count", x + 650, y + 142, 200, 30, "128 条结果", 10, LC["muted"], align=["left", "middle"]),
        icon("asahi-history-sort-icon", x + 1080, y + 151, 12, "fas:arrow-down-wide-short", LC["muted"]),
        text("asahi-history-sort", x + 1102, y + 142, 170, 30, "最近优先", 10, LC["muted"], align=["right", "middle"]),
        icon("asahi-history-sort-chevron", x + 1284, y + 151, 11, "fas:chevron-down", LC["muted"]),
    ])
    capture_thumbnail(e, "asahi-history-thumb", x + 902, y + 250, 224, 126, LC, LB)
    records = [
        ("Transformer 自注意力机制", "它让模型读取整句话，再决定每个词应该关注谁…", "VS Code · 今天 10:24", "视觉 · 联网", True, True),
        ("TypeError: Cannot read properties…", "这个报错表示代码正在读取 undefined 上的属性…", "IDE 报错 · 今天 09:51", "OCR", False, False),
        ("如何理解这段注意力代码", "可以把 query 看作当前问题，key 用来匹配相关信息…", "VS Code · 昨天 21:16", "视觉", False, True),
        ("Windows DPAPI 是什么", "DPAPI 使用当前 Windows 用户的凭据保护本地数据…", "设置页 · 昨天 18:42", "联网", False, False),
        ("视频字幕：latent space", "Latent space 是模型压缩信息后形成的内部表示空间…", "视频播放器 · 周二", "视觉", False, False),
    ]
    for i, record in enumerate(records):
        light_history_item(e, f"asahi-history-record-{i}", x + 250, y + 240 + i * 108, *record)
    return p


def light_toolbar(e, eid, x, y, hover=None):
    spec = TOKENS["components"]["toolbar"]
    shadow = TOKENS["themes"]["light"]["shadows"]["toolbar"]
    e.extend([
        shape(eid, x, y, *spec["expandedSize"], LC["surface"], R["pill"], LB["floating"], shadow),
        shape(eid + "-logo-bg", x + 5, y + 5, *spec["brandSize"], LC["accentSoft"], spec["primaryRadius"]),
        text(eid + "-logo", x + 5, y + 5, *spec["brandSize"], "浮", 14, LC["accent"], True, ["center", "middle"]),
        shape(eid + "-primary", x + 50, y + 5, 142, 42, LC["accentSoft"], spec["primaryRadius"]),
        icon(eid + "-primary-icon", x + 64, y + 18, 15, "fas:crop-simple", LC["accent"]),
        text(eid + "-primary-text", x + 86, y + 11, 38, 30, "框选", 12, LC["text"], True, ["left", "middle"]),
        shape(eid + "-key", x + 128, y + 14, 52, 24, LC["surface3"], R["small"]),
        text(eid + "-key-text", x + 128, y + 14, 52, 24, "Alt Q", 9, LC["muted"], align=["center", "middle"]),
    ])
    actions = [("clipboard", "far:clipboard"), ("history", "far:clock"), ("more", "fas:ellipsis")]
    for i, (name, ic) in enumerate(actions):
        xx = x + 202 + i * 40
        if hover == name:
            e.append(circle(f"{eid}-{name}-hover", xx, y + 9, 34, LC["surface3"]))
        e.append(icon(f"{eid}-{name}", xx + 9, y + 18, spec["iconSize"], ic,
                      LC["accent"] if hover == name else LC["muted"]))


def light_more_menu(e, eid, x, y, hover="settings"):
    spec = TOKENS["components"]["moreMenu"]
    shadow = TOKENS["themes"]["light"]["shadows"]["toolbar"]
    rows = [("settings", "fas:gear", "设置"), ("hide", "fas:eye-slash", "隐藏工具栏"),
            ("quit", "fas:power-off", "退出浮问")]
    e.append(shape(eid, x, y, *spec["size"], LC["surface"], spec["radius"], LB["floating"], shadow))
    for i, (name, ic, label) in enumerate(rows):
        yy = y + 6 + i * 40
        if hover == name:
            e.append(shape(f"{eid}-{name}-hover", x + 6, yy, 212, spec["itemHeight"], LC["surface3"], spec["itemRadius"]))
        color = LC["red"] if name == "quit" and hover == name else LC["accent"] if hover == name else LC["muted"]
        text_color = LC["red"] if name == "quit" and hover == name else LC["text"] if i == 0 else LC["body"]
        e.extend([
            icon(f"{eid}-{name}-icon", x + 18, yy + 10, 15, ic, color),
            text(f"{eid}-{name}-text", x + 46, yy, 140, spec["itemHeight"], label, 12, text_color, align=["left", "middle"]),
        ])
        if i == 1:
            e.append(shape(eid + "-divider", x + 12, yy + 44, 200, 1, LC["divider"]))


def light_collapsed_toolbar(e, eid, x, y, side):
    spec = TOKENS["components"]["toolbar"]
    vertical = side in ("left", "right")
    w, h = spec["collapsedVertical"] if vertical else spec["collapsedHorizontal"]
    shape_fn = {"left": right_rounded, "right": left_rounded, "top": bottom_rounded, "bottom": top_rounded}[side]
    item = shape_fn(eid, x, y, w, h, LC["surface"], 22, LB["floating"])
    item["shadow"] = TOKENS["themes"]["light"]["shadows"]["toolbar"]
    e.append(item)
    lx = x + (6 if vertical else 16)
    ly = y + (16 if vertical else 6)
    e.extend([
        shape(eid + "-logo-bg", lx, ly, spec["logoSize"], spec["logoSize"], LC["accentSoft"], spec["collapsedLogoRadius"]),
        text(eid + "-logo", lx, ly, spec["logoSize"], spec["logoSize"], "浮", 14, LC["accent"], True, ["center", "middle"]),
    ])


def page_light_toolbar():
    p = light_page(23, "朝日 · 悬浮工具栏", "完整胶囊、更多菜单与四边吸附沿用同一几何；暖白浮层依靠细描边和柔和投影脱离桌面")
    e = p["elements"]
    x, y, w, h = 64, 148, 960, 788
    sx = 1056
    e.extend([
        shape("asahi-toolbar-desktop", x, y, w, h, LC["surface3"], R["window"], LB["floating"]),
        shape("asahi-browser", x + 32, y + 48, 864, 600, LC["surface2"], R["container"], LB["control"],
              {"blur": 20, "color": "#26314714", "offset": [0, 8]}),
        top_rounded("asahi-browser-bar", x + 33, y + 49, 862, 44, LC["surface3"], R["container"] - 1),
        circle("asahi-browser-dot-1", x + 54, y + 67, 7, LC["muted"]),
        circle("asahi-browser-dot-2", x + 69, y + 67, 7, LC["divider"]),
        shape("asahi-browser-address", x + 176, y + 58, 480, 26, LC["surface2"], R["small"], LB["control"]),
        icon("asahi-browser-lock", x + 190, y + 65, 11, "fas:lock", LC["muted"]),
        text("asahi-browser-url", x + 210, y + 58, 420, 26, "developer.mozilla.org / attention", 9, LC["muted"], align=["left", "middle"]),
        text("asahi-article-kicker", x + 72, y + 128, 340, 22, "DEVELOPER NOTES · MACHINE LEARNING", 9, LC["muted"], spacing=1.1),
        text("asahi-article-title", x + 72, y + 166, 540, 48, "理解注意力机制", 25, LC["text"], True),
        text("asahi-article-intro", x + 72, y + 226, 480, 58,
             "注意力机制让模型在处理当前内容时，同时参考上下文中的相关信息。", 12, LC["body"], line=1.55, wrap=True),
        shape("asahi-article-rule", x + 72, y + 306, 760, 1, LC["divider"]),
        text("asahi-article-heading", x + 72, y + 334, 360, 28, "从序列到上下文", 15, LC["text"], True),
        text("asahi-article-copy", x + 72, y + 376, 434, 96,
             "每个词都会与序列中的其他词建立联系。模型根据相关程度分配权重，再将这些信息组合成当前词的表示。", 11, LC["body"], line=1.65, wrap=True),
        shape("asahi-article-code", x + 540, y + 334, 292, 150, LC["surface3"], R["container"], LB["control"]),
        text("asahi-article-code-text", x + 560, y + 354, 252, 110,
             "scores = query @ key.T\nweights = softmax(scores)\noutput = weights @ value", 11, LC["body"], line=1.75, wrap=True),
        shape("asahi-article-line-1", x + 72, y + 506, 434, 8, LC["surface3"], R["pill"]),
        shape("asahi-article-line-2", x + 72, y + 530, 360, 8, LC["surface3"], R["pill"]),
        text("asahi-toolbar-caption", x + 32, y + 684, 480, 24, "菜单向上展开，与工具栏保持 12 px 间距", 11, LC["muted"]),
        text("asahi-toolbar-scene-note", x + 32, y + 724, 500, 44,
             "一级只保留框选、剪贴板、历史和更多。\n菜单打开时，工具栏不会自动收起。", 10, LC["muted"], line=1.55, wrap=True),
        shape("asahi-toolbar-spec-card", sx, y, 480, h, LC["surface2"], R["window"], LB["floating"],
              TOKENS["themes"]["light"]["shadows"]["floating"]),
        text("asahi-toolbar-spec-title", sx + 24, y + 24, 300, 28, "胶囊几何", 16, LC["text"], True),
        text("asahi-toolbar-spec-subtitle", sx + 24, y + 58, 400, 22, "双主题共享尺寸，不重新排布功能", 10, LC["muted"]),
        text("asahi-toolbar-size", sx + 24, y + 176, 200, 24, "328 × 52 px", 13, LC["text"], True),
        text("asahi-toolbar-radius", sx + 232, y + 176, 200, 24, "R26 / R21", 12, LC["accent"], True, ["right", "top"]),
        text("asahi-toolbar-metrics", sx + 24, y + 204, 420, 22, "内边距 5 · 品牌区 40 × 42 · 图标 16 px", 10, LC["muted"]),
        shape("asahi-toolbar-spec-rule", sx + 24, y + 246, 432, 1, LC["divider"]),
        text("asahi-edge-title", sx + 24, y + 272, 300, 28, "边缘吸附", 16, LC["text"], True),
        text("asahi-edge-copy", sx + 24, y + 306, 420, 44,
             "距边缘 24 px 内松手吸附；展开时距边缘 8 px。", 11, LC["muted"], wrap=True),
        text("asahi-left-label", sx + 84, y + 364, 130, 64, "左侧吸附\n44 × 64 px", 11, LC["body"], line=1.6, wrap=True),
        text("asahi-right-label", sx + 244, y + 364, 144, 64, "右侧吸附\n44 × 64 px", 11, LC["body"], align=["right", "top"], line=1.6, wrap=True),
        shape("asahi-horizontal-screen", sx + 24, y + 462, 432, 170, LC["surface3"], R["container"], LB["control"]),
        text("asahi-horizontal-label", sx + 24, y + 520, 432, 48, "上下边缘使用横置半胶囊\n64 × 44 px · Logo 始终可见", 11, LC["body"], align=["center", "top"], line=1.6, wrap=True),
        text("asahi-behavior-title", sx + 24, y + 660, 300, 24, "行为保持不变", 13, LC["text"], True),
        text("asahi-toolbar-spec-note", sx + 24, y + 752, 420, 24,
             "减少动态效果时，直接切换最终状态。", 10, LC["muted"]),
    ])
    light_toolbar(e, "asahi-main-toolbar", 656, 780, hover="more")
    light_more_menu(e, "asahi-main-menu", 748, 616)
    light_toolbar(e, "asahi-spec-toolbar", sx + 24, y + 104)
    light_collapsed_toolbar(e, "asahi-left-collapsed", sx + 24, y + 362, "left")
    light_collapsed_toolbar(e, "asahi-right-collapsed", sx + 412, y + 362, "right")
    light_collapsed_toolbar(e, "asahi-top-collapsed", sx + 208, y + 462, "top")
    light_collapsed_toolbar(e, "asahi-bottom-collapsed", sx + 208, y + 588, "bottom")
    behaviors = ["悬停 120 ms 或点击展开", "移开 300 ms 后收起", "拖动或菜单打开时禁止收起"]
    for i, label in enumerate(behaviors):
        yy = y + 694 + i * 20
        e.extend([
            icon(f"asahi-behavior-check-{i}", sx + 24, yy + 3, 12, "fas:check", LC["green"]),
            text(f"asahi-behavior-text-{i}", sx + 46, yy, 360, 18, label, 10, LC["body"]),
        ])
    return p


def light_compact_answer(e, eid, x, y):
    w, h = TOKENS["components"]["answerWindow"]["compactSize"]
    e.extend([
        shape(eid, x, y, w, h, LC["surface"], R["window"], LB["floating"],
              TOKENS["themes"]["light"]["shadows"]["floating"]),
        shape(eid + "-logo-bg", x + 16, y + 12, 24, 24, LC["accentSoft"], R["small"]),
        icon(eid + "-logo", x + 22, y + 18, 12, "fas:crop-simple", LC["accent"]),
        text(eid + "-brand", x + 48, y + 10, 60, 26, "浮问", 15, LC["text"], True),
        circle(eid + "-status-dot", x + 116, y + 22, 5, LC["green"]),
        text(eid + "-status", x + 128, y + 14, 48, 20, "已完成", 10, LC["muted"]),
        shape(eid + "-head-line", x, y + 47, w, 1, LC["divider"]),
        shape(eid + "-context-bg", x + 1, y + 48, w - 2, 32, LC["surface2"]),
        icon(eid + "-context-icon", x + 16, y + 58, 12, "fas:crop-simple", LC["accent"]),
        text(eid + "-context", x + 36, y + 53, 250, 22, "Transformer · 技术文章", 10, LC["muted"]),
        text(eid + "-model", x + w - 100, y + 53, 80, 22, "DeepSeek", 10, LC["muted"], align=["right", "top"]),
        shape(eid + "-avatar", x + 18, y + 94, 24, 24, LC["accentSoft"], R["small"]),
        icon(eid + "-avatar-icon", x + 24, y + 100, 12, "fas:crop-simple", LC["accent"]),
        text(eid + "-answer-name", x + 52, y + 96, 160, 20, "浮问 · 刚刚", 10, LC["muted"]),
        text(eid + "-summary", x + 18, y + 126, w - 36, 62,
             "<p><strong>Transformer</strong> 是一种用自注意力理解上下文的神经网络架构。它让模型读取整句话，再判断每个词应该关注谁。</p>",
             12, LC["body"], line=1.5, wrap=True),
        text(eid + "-expand", x + 18, y + 194, 230, 24, "展开阅读 · 完整回答与来源", 11, LC["accent"], True),
        icon(eid + "-expand-icon", x + 202, y + 199, 12, "fas:arrow-right", LC["accent"]),
        shape(eid + "-footer-line", x, y + 226, w, 1, LC["divider"]),
        shape(eid + "-chip-1", x + 18, y + 240, 72, 26, LC["surface3"], R["small"]),
        text(eid + "-chip-text-1", x + 18, y + 240, 72, 26, "更通俗", 10, LC["muted"], align=["center", "middle"]),
        shape(eid + "-chip-2", x + 98, y + 240, 82, 26, LC["surface3"], R["small"]),
        text(eid + "-chip-text-2", x + 98, y + 240, 82, 26, "举个例子", 10, LC["muted"], align=["center", "middle"]),
        shape(eid + "-box", x + 18, y + 278, w - 36, 48, LC["surface2"], R["container"], LB["control"]),
        icon(eid + "-web", x + 32, y + 295, 13, "fas:globe", LC["accent"]),
        text(eid + "-placeholder", x + 54, y + 287, 280, 30, "继续追问…", 11, LC["muted"], align=["left", "middle"]),
        shape(eid + "-send", x + w - 59, y + 285, 34, 34, LC["primaryButton"], R["control"]),
        icon(eid + "-send-icon", x + w - 49, y + 295, 14, "fas:arrow-up", LC["onPrimary"]),
        text(eid + "-hint", x + 18, y + 334, 190, 14, "Enter 发送 · Shift + Enter 换行", 9, LC["muted"]),
        text(eid + "-privacy", x + w - 158, y + 334, 140, 14, "OCR 在本机完成", 9, LC["muted"], align=["right", "top"]),
    ])
    for i, name in enumerate(["fas:crop-simple", "fas:thumbtack", "fas:expand", "fas:xmark"]):
        e.append(icon(f"{eid}-action-{i}", x + 332 + i * 34, y + 18, 12, name, LC["muted"]))


def page_light_selection():
    p = light_page(24, "朝日 · 框选与悬浮工具栏", "浅色桌面使用中性遮罩降低干扰；选中区域保持清晰，取景框角是唯一品牌装饰")
    e = p["elements"]
    x, y, w, h = 64, 148, 1472, 794
    e.extend([
        shape("asahi-select-desktop", x, y, w, h, LC["surface3"], R["window"], LB["floating"]),
        left_rounded("asahi-select-sidebar", x + 1, y + 1, 210, h - 2, LC["surface2"], R["window"] - 1),
        shape("asahi-select-tabbar", x + 211, y + 1, w - 212, 48, LC["surface2"]),
        bottom_rounded("asahi-select-status", x + 1, y + h - 30, w - 2, 29, LC["surface2"], R["window"] - 1),
        text("asahi-select-nav-title", x + 24, y + 18, 160, 24, "EXPLORER", 10, LC["muted"], spacing=1.2),
        text("asahi-select-project", x + 24, y + 62, 170, 24, "FLOATASK", 12, LC["body"], True),
        text("asahi-select-files", x + 40, y + 104, 160, 160,
             "▾  src\n　▾  renderer\n　　result.js\n　　theme.css\n　　selection.js\n　▾  main\n　　main.js", 12, LC["muted"], line=1.65, wrap=True),
        shape("asahi-select-tab", x + 226, y + 10, 156, 38, LC["surface3"], R["small"]),
        text("asahi-select-tab-text", x + 244, y + 15, 120, 26, "transformer.py", 11, LC["body"]),
        text("asahi-select-code-outside", x + 250, y + 88, 1060, 580,
             "import torch\nimport torch.nn as nn\n\nclass MultiHeadAttention(nn.Module):\n    def __init__(self, hidden_size, heads):\n        super().__init__()\n        self.heads = heads\n        self.attention = nn.Linear(hidden_size, hidden_size)\n\n    def forward(self, query, key, value):\n        scores = query @ key.transpose(-2, -1)\n        weights = torch.softmax(scores, dim=-1)\n        return weights @ value\n\n# Each token learns which other tokens to attend to\n# Context shapes the meaning of the current token",
             13, LC["muted"], line=1.65, wrap=True),
        shape("asahi-select-overlay", x + 1, y + 1, w - 2, h - 2, LC["overlay"], R["window"] - 1),
        shape("asahi-select-region", 494, 300, 700, 344, LC["accent"] + "08", 0,
              {"width": 1, "color": LC["accent"] + "CC"}),
        text("asahi-select-code-inside", 520, 326, 650, 280,
             "class MultiHeadAttention(nn.Module):\n    def __init__(self, hidden_size, heads):\n        super().__init__()\n        self.heads = heads\n        self.attention = nn.Linear(hidden_size, hidden_size)\n\n    def forward(self, query, key, value):\n        scores = query @ key.transpose(-2, -1)\n        weights = torch.softmax(scores, dim=-1)\n        return weights @ value",
             13, LC["text"], line=1.65, wrap=True),
        shape("asahi-select-size", 1060, 654, 134, 30, LC["surface2"], R["small"], LB["control"]),
        text("asahi-select-size-text", 1060, 654, 134, 30, "700 × 344", 11, LC["body"], align=["center", "middle"]),
        shape("asahi-select-hint", 568, 176, 464, 48, LC["surface2"], R["window"], LB["floating"],
              TOKENS["themes"]["light"]["shadows"]["toolbar"]),
        icon("asahi-select-hint-icon", 590, 191, 17, "fas:crop-simple", LC["accent"]),
        text("asahi-select-hint-text", 620, 185, 270, 30, "拖拽框选要解释的内容", 13, LC["text"], align=["left", "middle"]),
        shape("asahi-select-key", 902, 187, 54, 26, LC["surface3"], R["small"]),
        text("asahi-select-key-text", 902, 187, 54, 26, "Esc", 11, LC["muted"], align=["center", "middle"]),
        text("asahi-select-cancel", 964, 185, 50, 30, "取消", 11, LC["muted"], align=["left", "middle"]),
        text("asahi-select-caption", 82, 906, 650, 20, "遮罩只降低干扰，不改变截图内容；OCR 仍在本机完成。", 11, LC["muted"]),
    ])
    corners = [(494, 300, "tl"), (1194, 300, "tr"), (494, 644, "bl"), (1194, 644, "br")]
    for cx, cy, pos in corners:
        left = cx - 3 if pos in ("tl", "bl") else cx - 21
        top = cy - 3 if pos in ("tl", "tr") else cy - 21
        e.append(shape(f"asahi-corner-h-{pos}", left, top if pos in ("tl", "tr") else cy + 1, 24, 3, LC["accent"]))
        e.append(shape(f"asahi-corner-v-{pos}", left if pos in ("tl", "bl") else cx + 1, top, 3, 24, LC["accent"]))
    light_toolbar(e, "asahi-selection-toolbar", 1168, 848)
    return p


def page_light_compact():
    p = light_page(25, "朝日 · 紧凑答案窗", "480 × 360 px 只呈现摘要；在网页与浅色 IDE 上使用同一轮廓、功能和输入区")
    e = p["elements"]
    scenes = [(64, "文档网页 · 浮层分离"), (816, "浅色 IDE · 同一组件")]
    for i, (xx, title_value) in enumerate(scenes):
        e.extend([
            text(f"asahi-compact-scene-title-{i}", xx, 150, 500, 26, title_value, 14, LC["text"], True),
            shape(f"asahi-compact-desktop-{i}", xx, 190, 720, 744, LC["surface3"], R["window"], LB["floating"]),
            top_rounded(f"asahi-compact-topbar-{i}", xx + 1, 191, 718, 46, LC["surface2"], R["window"] - 1),
            circle(f"asahi-compact-dot-{i}", xx + 22, 211, 7, LC["muted"]),
            shape(f"asahi-compact-address-{i}", xx + 68, 202, 500, 26, LC["surface3"], R["small"]),
        ])
    e.extend([
        text("asahi-compact-url", 148, 204, 450, 22, "arxiv.org / attention-is-all-you-need", 9, LC["muted"]),
        text("asahi-compact-web-title", 112, 282, 540, 40, "Attention Is All You Need", 22, LC["text"], True),
        text("asahi-compact-web-meta", 112, 332, 420, 22, "Ashish Vaswani et al. · 2017", 10, LC["muted"]),
        shape("asahi-compact-web-rule", 112, 378, 600, 1, LC["divider"]),
        text("asahi-compact-web-copy", 112, 408, 540, 110,
             "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.\n\nExperiments show that these models are superior in quality while being more parallelizable.",
             11, LC["body"], line=1.65, wrap=True),
        text("asahi-compact-ide-title", 984, 204, 240, 24, "FLOATASK · EXPLORER", 9, LC["muted"], spacing=1.1),
        left_rounded("asahi-compact-ide-sidebar", 817, 237, 136, 696, LC["surface2"], R["window"] - 1),
        text("asahi-compact-ide-files", 842, 268, 104, 146, "FLOATASK\n▾ renderer\n　result.js\n　theme.css\n▾ main\n　main.js", 10, LC["muted"], line=1.75, wrap=True),
        shape("asahi-compact-ide-tab", 970, 248, 152, 34, LC["surface2"], R["small"]),
        text("asahi-compact-ide-tab-text", 986, 253, 120, 24, "transformer.py", 10, LC["body"]),
        text("asahi-compact-ide-code", 982, 308, 520, 260,
             "import torch\nimport torch.nn as nn\n\nclass MultiHeadAttention(nn.Module):\n    def forward(self, query, key, value):\n        scores = query @ key.transpose(-2, -1)\n        weights = torch.softmax(scores, dim=-1)\n        return weights @ value",
             11, LC["body"], line=1.65, wrap=True),
        text("asahi-compact-caption-1", 184, 746, 480, 24, "暖白浮层依靠描边与投影保持独立", 11, LC["muted"], align=["center", "top"]),
        text("asahi-compact-caption-2", 936, 746, 480, 24, "重新框选、置顶、展开和关闭全部保留", 11, LC["muted"], align=["center", "top"]),
        shape("asahi-compact-rule-1", 184, 792, 480, 1, LC["divider"]),
        shape("asahi-compact-rule-2", 936, 792, 480, 1, LC["divider"]),
        text("asahi-compact-spec-1", 184, 812, 480, 64,
             "默认 480 × 360 px · 外窗 R16\n摘要 12 px / 1.5 · 输入区固定", 11, LC["muted"], line=1.65, wrap=True),
        text("asahi-compact-spec-2", 936, 812, 480, 64,
             "主操作与发送按钮统一使用灰雾蓝\n完整回答进入扩展阅读，不缩小字号", 11, LC["muted"], line=1.65, wrap=True),
    ])
    light_compact_answer(e, "asahi-compact-web-answer", 184, 366)
    light_compact_answer(e, "asahi-compact-ide-answer", 936, 366)
    return p


def light_stream_window(e, eid, x, y, state):
    w, h = 440, 500
    status = {"follow": "实时跟随", "paused": "已暂停跟随", "resumed": "已恢复跟随"}[state]
    e.extend([
        shape(eid, x, y, w, h, LC["surface"], R["window"], LB["floating"], TOKENS["themes"]["light"]["shadows"]["toolbar"]),
        shape(eid + "-logo-bg", x + 14, y + 10, 24, 24, LC["accentSoft"], R["small"]),
        icon(eid + "-logo", x + 20, y + 16, 12, "fas:crop-simple", LC["accent"]),
        text(eid + "-brand", x + 46, y + 9, 60, 26, "浮问", 14, LC["text"], True),
        circle(eid + "-dot", x + 242, y + 21, 5, LC["green"] if state != "paused" else LC["accent"]),
        text(eid + "-status", x + 254, y + 13, 104, 22, status, 10, LC["muted"]),
        icon(eid + "-close", x + 402, y + 17, 12, "fas:xmark", LC["muted"]),
        shape(eid + "-head-line", x, y + 43, w, 1, LC["divider"]),
        shape(eid + "-context", x + 1, y + 44, w - 2, 30, LC["surface2"]),
        icon(eid + "-context-icon", x + 16, y + 53, 11, "fas:crop-simple", LC["accent"]),
        text(eid + "-context-text", x + 34, y + 49, 280, 20, "Transformer · 技术文章", 9, LC["muted"]),
        shape(eid + "-avatar", x + 16, y + 88, 24, 24, LC["accentSoft"], R["small"]),
        icon(eid + "-avatar-icon", x + 22, y + 94, 12, "fas:crop-simple", LC["accent"]),
        text(eid + "-name", x + 50, y + 90, 180, 20, "浮问 · 正在回答", 10, LC["muted"]),
        shape(eid + "-track", x + w - 7, y + 88, 3, 284, LC["surface3"], R["pill"]),
        shape(eid + "-footer", x, y + 382, w, 1, LC["divider"]),
        shape(eid + "-box", x + 16, y + 398, w - 32, 44, LC["surface2"], R["container"], LB["control"]),
        icon(eid + "-web", x + 30, y + 413, 12, "fas:globe", LC["accent"]),
        text(eid + "-placeholder", x + 50, y + 405, 240, 30, "正在生成回答…", 10, LC["muted"], align=["left", "middle"]),
        shape(eid + "-stop", x + w - 53, y + 404, 32, 32, LC["redSoft"], R["control"]),
        icon(eid + "-stop-icon", x + w - 42, y + 415, 10, "fas:stop", LC["red"]),
        text(eid + "-hint", x + 16, y + 452, 180, 16, "Esc 停止生成", 9, LC["muted"]),
        text(eid + "-fixed", x + w - 174, y + 452, 158, 16, "输入区位置固定", 9, LC["muted"], align=["right", "top"]),
    ])
    if state == "paused":
        e.extend([
            text(eid + "-heading", x + 16, y + 126, 320, 24, "它解决什么问题", 13, LC["text"], True),
            text(eid + "-body", x + 16, y + 160, w - 44, 140,
                 "传统循环网络按顺序处理信息，长文本中的远距离关系容易变弱。\n\nTransformer 会让每个词同时关注句子里的其他词，再计算彼此的重要程度。你正在查看这一早期段落。",
                 11, LC["body"], line=1.55, wrap=True),
            shape(eid + "-thumb", x + w - 7, y + 142, 3, 82, LC["muted"], R["pill"]),
            shape(eid + "-bottom-button", x + 146, y + 336, 148, 34, LC["primaryButton"], R["control"]),
            icon(eid + "-bottom-icon", x + 162, y + 346, 12, "fas:arrow-down", LC["onPrimary"]),
            text(eid + "-bottom-text", x + 182, y + 336, 98, 34, "回到底部", 11, LC["onPrimary"], True, ["left", "middle"]),
        ])
    else:
        cursor = f"<span style=\"color:{LC['accent']}\">▍</span>" if state == "follow" else ""
        e.extend([
            text(eid + "-body", x + 16, y + 126, w - 44, 124,
                 "<p><strong>Transformer</strong> 是一种基于自注意力机制的神经网络架构。</p><p style=\"margin-top:10px\">它让模型处理一个词时，同时参考句子里的其他词。</p>",
                 11, LC["body"], line=1.5, wrap=True),
            text(eid + "-heading", x + 16, y + 256, 300, 24, "它带来了什么", 13, LC["text"], True),
            text(eid + "-latest", x + 16, y + 290, w - 44, 66,
                 "并行计算让训练更高效，通用架构也能扩展到视觉和多模态任务。" + cursor,
                 11, LC["body"], line=1.55, wrap=True),
            shape(eid + "-thumb", x + w - 7, y + 294, 3, 78, LC["accent"] if state == "resumed" else LC["muted"], R["pill"]),
        ])
        if state == "resumed":
            e.extend([
                icon(eid + "-resumed-icon", x + 18, y + 354, 11, "fas:check", LC["green"]),
                text(eid + "-resumed-note", x + 36, y + 348, 240, 22, "已回到最新内容，继续自动跟随", 9, LC["green"]),
            ])


def page_light_stream():
    p = light_page(26, "朝日 · 流式跟随", "位于底部时自动跟随；向上阅读后暂停，回到底部再恢复，固定输入区始终不跳动")
    e = p["elements"]
    cards = [(64, "01 · 位于底部", "新内容到达时自动跟随"),
             (564, "02 · 向上阅读", "保留当前位置，不强行跳动"),
             (1064, "03 · 回到底部", "恢复实时跟随，按钮退出")]
    for i, (xx, title_value, subtitle) in enumerate(cards):
        e.extend([
            shape(f"asahi-stream-card-{i}", xx, 170, 472, 600, LC["surface3"], R["window"], LB["control"]),
            text(f"asahi-stream-card-title-{i}", xx + 20, 192, 360, 28, title_value, 14, LC["text"], True),
            text(f"asahi-stream-card-sub-{i}", xx + 20, 224, 400, 22, subtitle, 10, LC["muted"]),
        ])
    light_stream_window(e, "asahi-stream-follow", 80, 264, "follow")
    light_stream_window(e, "asahi-stream-paused", 580, 264, "paused")
    light_stream_window(e, "asahi-stream-resumed", 1080, 264, "resumed")
    e.extend([
        icon("asahi-stream-arrow-1", 540, 494, 16, "fas:arrow-right", LC["accent"]),
        icon("asahi-stream-arrow-2", 1040, 494, 16, "fas:arrow-right", LC["accent"]),
    ])
    behaviors = [
        ("自动跟随", "仅当视口已位于底部时启用；流式追加不改变上方布局。"),
        ("暂停跟随", "检测到用户向上滚动后立即暂停；生成任务继续在后台进行。"),
        ("恢复位置", "点击回到底部后平滑定位；减少动态效果时立即到位。"),
        ("稳定布局", "状态文字、按钮与滚动条不挤占内容，不移动固定输入区。"),
    ]
    for i, (title_value, copy) in enumerate(behaviors):
        xx = 64 + i * 376
        e.extend([
            shape(f"asahi-stream-behavior-{i}", xx, 802, 344, 134, LC["surface2"], R["container"], LB["control"]),
            icon(f"asahi-stream-behavior-icon-{i}", xx + 18, 822, 14,
                 ["fas:arrow-down", "fas:pause", "fas:rotate", "fas:lock"][i], LC["accent"] if i != 1 else LC["muted"]),
            text(f"asahi-stream-behavior-title-{i}", xx + 44, 816, 240, 26, title_value, 12, LC["text"], True),
            text(f"asahi-stream-behavior-copy-{i}", xx + 18, 858, 308, 54, copy, 10, LC["muted"], line=1.55, wrap=True),
        ])
    return p


def light_recovery_card(e, eid, x, title_value, body, action, secondary, note, icon_name, tone):
    y, w, h = 694, 472, 242
    action_w = 156 if eid == "asahi-search-fail" else 112
    e.extend([
        shape(eid, x, y, w, h, LC["surface2"], R["window"], LB["control"]),
        shape(eid + "-symbol", x + 24, y + 22, 34, 34, LC["redSoft"] if tone == "error" else LC["accentSoft"], R["small"]),
        icon(eid + "-icon", x + 33, y + 31, 16, icon_name, LC["red"] if tone == "error" else LC["accent"]),
        text(eid + "-title", x + 70, y + 24, 350, 30, title_value, 14, LC["text"], True),
        text(eid + "-body", x + 24, y + 76, w - 48, 52, body, 11, LC["muted"], line=1.55, wrap=True),
        shape(eid + "-action", x + 24, y + 140, action_w, 36, LC["primaryButton"], R["control"]),
        text(eid + "-action-text", x + 24, y + 140, action_w, 36, action, 10, LC["onPrimary"], True, ["center", "middle"]),
        text(eid + "-secondary", x + 270, y + 140, 174, 36, secondary, 10, LC["body"], align=["right", "middle"]),
        shape(eid + "-rule", x + 24, y + 190, w - 48, 1, LC["divider"]),
        text(eid + "-note", x + 24, y + 204, w - 48, 20, note, 9, LC["muted"]),
    ])


def page_light_recovery():
    p = light_page(27, "朝日 · 空态与异常恢复", "保留当前截图与 OCR 上下文；错误色只用于需要处理的问题，每种状态都有明确恢复动作")
    e = p["elements"]
    e.extend([
        shape("asahi-empty-ocr", 64, 170, 900, 500, LC["surface2"], R["window"], LB["control"]),
        text("asahi-empty-ocr-heading", 88, 192, 400, 28, "01 · 无 OCR 结果", 14, LC["text"], True),
        shape("asahi-empty-ocr-badge", 806, 192, 134, 26, LC["surface3"], R["small"]),
        icon("asahi-empty-ocr-badge-icon", 820, 199, 12, "fas:image", LC["muted"]),
        text("asahi-empty-ocr-badge-text", 840, 192, 86, 26, "截图仍保留", 10, LC["muted"], align=["left", "middle"]),
        text("asahi-empty-ocr-title", 440, 250, 400, 32, "没有识别到可用文字", 18, LC["text"], True),
        text("asahi-empty-ocr-body", 440, 298, 456, 62,
             "文字可能过小、对比度不足，或当前区域主要包含图像。可以调整框选范围，也可以直接使用视觉模型。", 12, LC["muted"], line=1.55, wrap=True),
        icon("asahi-empty-ocr-tip-icon", 440, 374, 13, "fas:lightbulb", LC["accent"]),
        text("asahi-empty-ocr-tip", 464, 368, 420, 26, "尽量放大目标文字，减少无关背景", 11, LC["body"]),
        shape("asahi-empty-ocr-reselect", 440, 420, 124, 38, LC["primaryButton"], R["control"]),
        icon("asahi-empty-ocr-reselect-icon", 454, 432, 13, "fas:crop-simple", LC["onPrimary"]),
        text("asahi-empty-ocr-reselect-text", 476, 420, 74, 38, "重新框选", 11, LC["onPrimary"], True, ["left", "middle"]),
        shape("asahi-empty-ocr-manual", 576, 420, 124, 38, LC["surface3"], R["control"]),
        icon("asahi-empty-ocr-manual-icon", 590, 432, 13, "fas:keyboard", LC["muted"]),
        text("asahi-empty-ocr-manual-text", 612, 420, 74, 38, "手动输入", 11, LC["body"], align=["left", "middle"]),
        icon("asahi-empty-ocr-vision-icon", 440, 482, 14, "fas:eye", LC["accent"]),
        text("asahi-empty-ocr-vision", 464, 476, 360, 26, "使用截图理解 · 需已配置视觉模型", 11, LC["accent"], True),
        shape("asahi-empty-ocr-rule", 88, 534, 852, 1, LC["divider"]),
        icon("asahi-empty-ocr-privacy-icon", 88, 566, 14, "fas:shield-halved", LC["green"]),
        text("asahi-empty-ocr-privacy", 114, 560, 640, 26,
             "OCR 空结果不会触发文字上传；只有主动使用截图理解时才发送压缩截图。", 10, LC["muted"]),
        text("asahi-empty-ocr-caption", 88, 606, 600, 22, "框选来源 VS Code · transformer.py", 10, LC["muted"]),
        shape("asahi-capture-fail", 996, 170, 540, 500, LC["surface2"], R["window"], LB["control"]),
        text("asahi-capture-fail-heading", 1020, 192, 360, 28, "02 · 截图失败", 14, LC["text"], True),
        shape("asahi-capture-fail-symbol", 1020, 250, 40, 40, LC["redSoft"], R["small"]),
        icon("asahi-capture-fail-icon", 1031, 261, 18, "fas:triangle-exclamation", LC["red"]),
        text("asahi-capture-fail-title", 1076, 252, 400, 30, "无法获取框选图像", 16, LC["text"], True),
        text("asahi-capture-fail-body", 1020, 316, 468, 56,
             "Windows 未能返回屏幕截图。当前窗口上下文仍保留，可直接重试，不需要重新开始提问。", 11, LC["muted"], line=1.55, wrap=True),
        shape("asahi-capture-fail-cause", 1020, 392, 492, 92, LC["surface"], R["container"], LB["control"]),
        text("asahi-capture-fail-cause-title", 1038, 406, 200, 22, "常见原因", 10, LC["muted"], True),
        text("asahi-capture-fail-cause-copy", 1038, 434, 450, 36,
             "DRM 受保护内容 · 部分独占全屏游戏 · 捕获权限或显示状态变化", 10, LC["body"], wrap=True),
        shape("asahi-capture-fail-retry", 1020, 512, 112, 38, LC["primaryButton"], R["control"]),
        icon("asahi-capture-fail-retry-icon", 1034, 524, 13, "fas:rotate", LC["onPrimary"]),
        text("asahi-capture-fail-retry-text", 1056, 512, 60, 38, "重试截图", 11, LC["onPrimary"], True, ["left", "middle"]),
        shape("asahi-capture-fail-help", 1144, 512, 132, 38, LC["surface3"], R["control"]),
        text("asahi-capture-fail-help-text", 1144, 512, 132, 38, "查看捕获帮助", 11, LC["body"], align=["center", "middle"]),
        text("asahi-capture-fail-detail", 1390, 512, 100, 38, "错误详情", 10, LC["muted"], align=["right", "middle"]),
        shape("asahi-capture-fail-rule", 1020, 580, 492, 1, LC["divider"]),
        icon("asahi-capture-fail-shield", 1020, 608, 14, "fas:shield-halved", LC["green"]),
        text("asahi-capture-fail-privacy", 1046, 602, 420, 26, "截图未生成，不会上传任何图像", 10, LC["muted"]),
    ])
    capture_thumbnail(e, "asahi-empty-ocr-thumb", 88, 250, 320, 180, LC, LB)
    light_recovery_card(e, "asahi-missing-key", 64, "03 · 未配置模型服务",
                        "截图与 OCR 结果已保留。完成 OpenAI 兼容服务配置后，可从当前上下文继续。",
                        "打开设置", "稍后再配置", "API Key 使用 Windows DPAPI 加密", "fas:key", "normal")
    light_recovery_card(e, "asahi-offline", 564, "04 · 网络连接不可用",
                        "本次模型请求尚未发送。网络恢复后可从当前上下文重试，无需重新框选。",
                        "重试", "查看 OCR 原文", "恢复网络后保留当前问题与上下文", "fas:wifi", "error")
    light_recovery_card(e, "asahi-search-fail", 1064, "05 · 联网检索失败",
                        "可基于截图与 OCR 直接回答；也可以保留当前问题，稍后重试检索。",
                        "不联网，继续", "重试检索", "未使用联网资料时，不生成来源标注", "fas:globe", "normal")
    return p


def asahi_transform(value, element_type, element_id):
    """Map a dark component tree to Asahi without changing its geometry."""
    if isinstance(value, dict):
        return {key: asahi_transform(item, element_type, element_id) for key, item in value.items()}
    if isinstance(value, list):
        return [asahi_transform(item, element_type, element_id) for item in value]
    if not isinstance(value, str):
        return value
    color_map = {
        C["bg"]: LC["bg"], C["surface2"]: LC["surface2"], C["surface3"]: LC["surface3"],
        C["divider"]: LC["divider"], C["body"]: LC["body"], C["muted"]: LC["muted"],
        C["faint"]: LC["faint"], C["accent"]: LC["accent"], C["accentSoft"]: LC["accentSoft"],
        C["green"]: LC["green"], C["red"]: LC["red"], C["redSoft"]: LC["redSoft"],
        C["overlay"]: LC["overlay"], "#12161C": LC["surface3"], "#12151A": LC["surface3"],
        "#C7D0DC": LC["body"], B["floating"]["color"]: LB["floating"]["color"],
        B["control"]["color"]: LB["control"]["color"], B["active"]["color"]: LB["active"]["color"],
        "#00000066": "#26314726", "#00000077": "#2631472E", "#00000055": "#2631471A",
        "#00000073": "#26314726", "#00000080": "#26314738",
    }
    if element_type == "shape":
        color_map.update({
            C["surface"]: LC["surface"], C["primaryButton"]: LC["primaryButton"],
            C["onPrimary"]: LC["onPrimary"] if element_id.endswith("-knob") else LC["surface"],
        })
    else:
        color_map.update({
            C["surface"]: LC["surface"], C["text"]: LC["text"], C["onPrimary"]: LC["onPrimary"],
        })
    for dark, light in color_map.items():
        value = value.replace(dark, light)
    return value


def asahi_variant(source, index, title_value, subtitle, preserve_dark=(), text_changes=None):
    page = copy.deepcopy(source)
    page["background"] = fill(LC["bg"])
    for element in page["elements"]:
        element_id = element.get("elementId", "")
        if not element_id.startswith(preserve_dark):
            converted = asahi_transform(element, element.get("elementType"), element_id)
            element.clear()
            element.update(converted)
        if element_id == "kicker":
            element["content"]["text"] = f"FLOATASK · ASAHI LIGHT THEME / {index:02d}"
        elif element_id == "page-title":
            element["content"]["text"] = title_value
        elif element_id == "page-subtitle":
            element["content"]["text"] = subtitle
        if text_changes and element.get("elementType") == "text":
            content = element["content"]["text"]
            for old, new in text_changes.items():
                content = content.replace(old, new)
            element["content"]["text"] = content
    return page


def page_light_long_scroll():
    return asahi_variant(
        page_long_scroll(), 28, "朝日 · 长内容与滚动",
        "沿用近月的固定分区与局部滚动；浅色代码、表格和来源不撑宽窗口，也不降低文字对比度",
    )


def page_light_capture_context():
    return asahi_variant(
        page_capture_context(), 29, "朝日 · 截图与识别上下文",
        "浅色截图摘要、OCR 展开修正与视觉附件共用同一套边界；发送范围与本机保留内容清晰可见",
    )


def page_light_general_settings():
    return asahi_variant(
        page_general_settings(), 30, "朝日 · 通用与快捷键",
        "快捷键录制、冲突反馈、工具栏与启动行为完整保留；双主题只替换语义外观",
    )


def page_light_search_settings():
    return asahi_variant(
        page_search_settings(), 31, "朝日 · 联网检索",
        "服务选择、连接反馈、检索参数与数据流向同屏呈现；无网降级不生成虚假来源",
    )


def page_light_privacy_settings():
    return asahi_variant(
        page_privacy_settings(), 32, "朝日 · 历史与隐私",
        "本机保存边界、收藏保留与就地二次确认完整保留；错误色只用于需要处理的操作",
    )


def page_light_appearance_settings():
    return asahi_variant(
        page_appearance_settings(), 33, "朝日 · 外观与阅读",
        "主题、字体与阅读密度共用实时预览；朝日控件中仍保留真实的近月主题小样",
        preserve_dark=(
            "appearance-theme-preview-2", "appearance-theme-mini-window-2",
            "appearance-theme-mini-logo-2", "appearance-theme-mini-line-1-2",
            "appearance-theme-mini-line-2-2", "appearance-system-dark", "appearance-system-moon",
        ),
        text_changes={"深夜 · 标准密度": "朝日 · 标准密度", "当前为近月": "当前为朝日"},
    )


def setup_button(elements, eid, x, y, w, label, primary=False, enabled=True):
    bg = C["primaryButton"] if primary else C["surface3"]
    fg = C["onPrimary"] if primary else C["body"]
    if not enabled:
        bg, fg = C["surface2"], C["faint"]
    elements.extend([
        shape(eid, x, y, w, 40, bg, R["control"], None if primary else B["control"]),
        text(eid + "-label", x, y, w, 40, label, 12, fg, primary,
             align=["center", "middle"]),
    ])


def setup_field(elements, eid, x, y, w, label, value, secret=False, status=None):
    elements.extend([
        text(eid + "-label", x, y, w, 20, label, 11, C["muted"]),
        shape(eid + "-box", x, y + 26, w, 44, C["surface2"], R["control"], B["control"]),
        text(eid + "-value", x + 14, y + 26, w - 54, 44,
             "••••••••••••••••" if secret else value, 12, C["body"], align=["left", "middle"]),
    ])
    if secret:
        elements.append(icon(eid + "-eye", x + w - 34, y + 40, 15, "far:eye", C["muted"]))
    if status:
        elements.extend([
            circle(eid + "-status-dot", x, y + 84, 6, C["green"]),
            text(eid + "-status", x + 14, y + 77, w - 14, 20, status, 10, C["green"]),
        ])


def setup_steps(elements, eid, x, y, active=1):
    labels = ["模型服务", "快捷键与隐私", "开始使用"]
    for i, label in enumerate(labels, 1):
        sx = x + (i - 1) * 174
        selected = i == active
        completed = i < active
        elements.extend([
            circle(f"{eid}-dot-{i}", sx, y, 24,
                   C["accent"] if selected else C["accentSoft"] if completed else C["surface3"]),
            text(f"{eid}-number-{i}", sx, y, 24, 24,
                 "✓" if completed else str(i), 10,
                 C["surface"] if selected else C["accent"] if completed else C["muted"],
                 True, align=["center", "middle"]),
            text(f"{eid}-label-{i}", sx + 34, y, 120, 24, label, 11,
                 C["text"] if selected else C["muted"], selected, align=["left", "middle"]),
        ])
        if i < 3:
            elements.append(shape(f"{eid}-line-{i}", sx + 139, y + 12, 26, 1, C["divider"]))


def setup_window(elements, eid, x, y, w, h, step=1):
    elements.extend([
        shape(eid, x, y, w, h, C["surface"], R["window"], B["floating"],
              {"blur": 38, "color": "#00000066", "offset": [0, 14]}),
        shape(eid + "-logo-bg", x + 28, y + 24, 40, 40, C["accentSoft"], R["small"]),
        text(eid + "-logo", x + 28, y + 24, 40, 40, "浮", 18, C["accent"], True,
             align=["center", "middle"]),
        text(eid + "-brand", x + 82, y + 24, 160, 26, "浮问 FloatAsk", 18, C["text"], True),
        text(eid + "-tagline", x + 82, y + 51, 180, 18, "框一下，就懂了", 10, C["muted"]),
        icon(eid + "-close", x + w - 46, y + 34, 15, "fas:xmark", C["muted"]),
        shape(eid + "-head-line", x, y + 87, w, 1, C["divider"]),
    ])
    setup_steps(elements, eid + "-steps", x + 30, y + 110, step)


def note_block(elements, eid, x, y, w, title_value, lines):
    elements.extend([
        text(eid + "-title", x, y, w, 26, title_value, 14, C["text"], True),
        shape(eid + "-line", x, y + 38, w, 1, C["divider"]),
        text(eid + "-body", x, y + 54, w, 28 * len(lines), "\n".join(lines), 12, C["muted"], wrap=True, line=1.75),
    ])


def page_onboarding_model():
    p = base_page(34, "首次配置 · 模型服务", "三步完成最小配置；密钥本机加密，跳过配置也能保留截图与 OCR 上下文")
    e = p["elements"]
    x, y, w, h = 64, 176, 1090, 734
    setup_window(e, "onboard-model", x, y, w, h, 1)
    e.extend([
        text("onboard-model-title", x + 30, y + 160, 600, 34, "先连接一个模型服务", 23, C["text"], True),
        text("onboard-model-subtitle", x + 30, y + 200, 770, 44,
             "使用任意 OpenAI 兼容接口。首次解释、追问和截图理解稍后可以在设置中分别配置。",
             12, C["muted"], wrap=True),
    ])
    providers = [("DeepSeek", "推荐 · 国内可直连", "fas:bolt"), ("OpenAI 兼容", "自建或第三方服务", "fas:server"), ("本地 Ollama", "模型留在本机", "fas:computer")]
    for i, (name, desc, ico) in enumerate(providers):
        px = x + 30 + i * 338
        selected = i == 0
        e.extend([
            shape(f"onboard-provider-{i}", px, y + 264, 318, 82,
                  C["accentSoft"] if selected else C["surface2"], R["control"],
                  B["active"] if selected else B["control"]),
            icon(f"onboard-provider-icon-{i}", px + 18, y + 284, 19, ico, C["accent"] if selected else C["muted"]),
            text(f"onboard-provider-name-{i}", px + 52, y + 276, 230, 24, name, 13, C["text"], selected),
            text(f"onboard-provider-desc-{i}", px + 52, y + 304, 240, 20, desc, 10, C["muted"]),
        ])
        if selected:
            e.append(icon(f"onboard-provider-check-{i}", px + 280, y + 282, 16, "fas:circle-check", C["accent"]))
    setup_field(e, "onboard-endpoint", x + 30, y + 376, 500, "接口地址", "https://api.deepseek.com/v1")
    setup_field(e, "onboard-key", x + 554, y + 376, 506, "API Key · 使用 Windows DPAPI 加密", "", True)
    setup_field(e, "onboard-name", x + 30, y + 490, 500, "模型名称", "deepseek-chat", status="连接成功 · 已读取模型，延迟 684 ms（界面示例）")
    e.extend([
        shape("onboard-privacy-icon-bg", x + 554, y + 500, 38, 38, C["surface3"], R["small"]),
        icon("onboard-privacy-icon", x + 565, y + 511, 16, "fas:shield-halved", C["accent"]),
        text("onboard-privacy-title", x + 606, y + 496, 420, 22, "密钥不会写入明文配置", 12, C["body"], True),
        text("onboard-privacy-copy", x + 606, y + 523, 430, 40,
             "测试连接只向当前服务发送必要请求；浮问无自建服务器与遥测。", 10, C["muted"], wrap=True),
        shape("onboard-footer-line", x, y + h - 83, w, 1, C["divider"]),
        text("onboard-skip", x + 30, y + h - 60, 180, 30, "稍后配置", 12, C["muted"], align=["left", "middle"]),
        text("onboard-footnote", x + 220, y + h - 60, 460, 30, "跳过后，首次提问时会引导返回此页", 10, C["muted"], align=["left", "middle"]),
    ])
    setup_button(e, "onboard-test", x + w - 342, y + h - 65, 138, "测试连接")
    setup_button(e, "onboard-next", x + w - 190, y + h - 65, 160, "下一步", True)
    note_block(e, "onboard-note-1", 1210, 202, 320, "最小必填项", ["• 接口地址、API Key、模型名称", "• Ollama 可不要求 API Key", "• 测试失败时保留全部输入"])
    note_block(e, "onboard-note-2", 1210, 386, 320, "配置可恢复", ["• 上一步不丢失已填内容", "• 关闭窗口等同“稍后配置”", "• 再次进入从未完成步骤继续"])
    note_block(e, "onboard-note-3", 1210, 570, 320, "安全边界", ["• API Key 使用 DPAPI 加密", "• 不在日志或诊断信息中显示密钥", "• 截图默认仅在本机执行 OCR"])
    return p


def page_onboarding_ready():
    p = base_page(35, "首次配置 · 快捷键与完成", "先验证全局快捷键，再明确本机 OCR 与可选上传；完成页给出唯一主动作")
    e = p["elements"]
    x, y, w, h = 64, 184, 680, 704
    setup_window(e, "onboard-hotkey", x, y, w, h, 2)
    e.extend([
        text("hotkey-title", x + 30, y + 160, 520, 32, "试试你的框选快捷键", 22, C["text"], True),
        text("hotkey-subtitle", x + 30, y + 201, 560, 40, "按下组合键即可录制；若系统占用，可修改后继续。", 12, C["muted"]),
        shape("hotkey-recorder", x + 30, y + 261, w - 60, 96, C["accentSoft"], R["container"], B["active"]),
        text("hotkey-key", x + 30, y + 273, w - 60, 46, "Alt  +  Q", 25, C["accent"], True, align=["center", "middle"]),
        text("hotkey-state", x + 30, y + 323, w - 60, 22, "✓ 系统注册成功", 11, C["green"], align=["center", "middle"]),
        icon("hotkey-reset", x + w - 64, y + 278, 15, "fas:rotate-right", C["muted"]),
        text("hotkey-privacy-title", x + 30, y + 391, 400, 26, "识别与发送", 14, C["text"], True),
        shape("hotkey-privacy-box", x + 30, y + 432, w - 60, 124, C["surface2"], R["container"], B["control"]),
        icon("hotkey-ocr-icon", x + 50, y + 453, 17, "fas:font", C["accent"]),
        text("hotkey-ocr-title", x + 82, y + 446, 410, 24, "本机 OCR · 始终启用", 12, C["body"], True),
        text("hotkey-ocr-copy", x + 82, y + 475, 500, 38, "识别文字会随模型请求发送；原始截图默认只保留在本机。", 10, C["muted"], wrap=True),
        shape("hotkey-vision-track", x + w - 92, y + 451, 42, 24, C["surface3"], "pill"),
        circle("hotkey-vision-knob", x + w - 90, y + 453, 20, C["muted"]),
        text("hotkey-vision-label", x + 50, y + 520, 500, 22, "截图理解默认关闭，可在需要时开启", 10, C["muted"]),
        shape("hotkey-footer-line", x, y + h - 83, w, 1, C["divider"]),
        text("hotkey-back", x + 30, y + h - 60, 100, 30, "← 上一步", 12, C["muted"], align=["left", "middle"]),
    ])
    setup_button(e, "hotkey-next", x + w - 190, y + h - 65, 160, "下一步", True)
    rx, rw = 788, 742
    setup_window(e, "onboard-ready", rx, y, rw, h, 3)
    e.extend([
        shape("ready-hero", rx + 30, y + 165, rw - 60, 250, C["surface2"], R["container"]),
        shape("ready-logo-bg", rx + rw / 2 - 34, y + 192, 68, 68, C["accentSoft"], R["window"]),
        text("ready-logo", rx + rw / 2 - 34, y + 192, 68, 68, "浮", 29, C["accent"], True, align=["center", "middle"]),
        text("ready-title", rx + 30, y + 278, rw - 60, 34, "准备就绪", 24, C["text"], True, align=["center", "middle"]),
        text("ready-copy", rx + 70, y + 320, rw - 140, 48, "在任意页面按下 Alt + Q，框选你想理解的内容。", 13, C["muted"], align=["center", "top"], wrap=True),
        shape("ready-key", rx + rw / 2 - 80, y + 374, 160, 30, C["surface3"], R["small"]),
        text("ready-key-text", rx + rw / 2 - 80, y + 374, 160, 30, "Alt  +  Q", 12, C["body"], True, align=["center", "middle"]),
        text("ready-toolbar-label", rx + 30, y + 448, 360, 22, "悬浮工具栏已显示，可拖到屏幕边缘吸附", 11, C["muted"]),
        shape("ready-toolbar", rx + 30, y + 486, 360, 52, C["surface2"], "pill", B["floating"]),
        shape("ready-brand", rx + 35, y + 491, 66, 42, C["surface3"], "pill"),
        text("ready-brand-text", rx + 35, y + 491, 66, 42, "浮", 14, C["text"], True, align=["center", "middle"]),
        shape("ready-capture", rx + 109, y + 491, 126, 42, C["accentSoft"], "pill"),
        icon("ready-capture-icon", rx + 125, y + 504, 16, "fas:crop-simple", C["accent"]),
        text("ready-capture-text", rx + 151, y + 491, 72, 42, "框选", 12, C["accent"], True, align=["center", "middle"]),
        icon("ready-clipboard", rx + 250, y + 504, 16, "far:clipboard", C["muted"]),
        icon("ready-history", rx + 295, y + 504, 16, "far:clock", C["muted"]),
        icon("ready-more", rx + 340, y + 504, 16, "fas:ellipsis", C["muted"]),
        shape("ready-footer-line", rx, y + h - 83, rw, 1, C["divider"]),
        text("ready-back", rx + 30, y + h - 60, 100, 30, "← 上一步", 12, C["muted"], align=["left", "middle"]),
        text("ready-settings", rx + 160, y + h - 60, 220, 30, "打开完整设置", 11, C["muted"], align=["left", "middle"]),
    ])
    setup_button(e, "ready-start", rx + rw - 218, y + h - 65, 188, "开始第一次框选", True)
    return p


def update_release_notes(elements, eid, x, y, w):
    elements.extend([
        text(eid + "-title", x, y, w, 24, "此版本包含", 12, C["text"], True),
        text(eid + "-body", x, y + 34, w, 104,
             "• 改进长回答滚动与代码块复制\n• 新增悬浮工具栏边缘吸附\n• 修正部分快捷键冲突与 OCR 异常",
             11, C["muted"], wrap=True, line=1.8),
    ])


def page_update_flow():
    p = base_page(36, "更新 · 发现、下载与校验", "版本、来源、校验和重启时机透明可见；更新不覆盖模型配置与本机历史")
    e = p["elements"]
    x, y, w, h = 64, 184, 980, 700
    e.extend([
        shape("update-window", x, y, w, h, C["surface"], R["window"], B["floating"],
              {"blur": 38, "color": "#00000066", "offset": [0, 14]}),
        shape("update-logo-bg", x + 30, y + 26, 42, 42, C["accentSoft"], R["small"]),
        icon("update-logo", x + 41, y + 37, 20, "fas:download", C["accent"]),
        text("update-title", x + 88, y + 25, 300, 28, "软件更新", 20, C["text"], True),
        text("update-current", x + 88, y + 56, 300, 18, "当前版本 v0.3.1", 10, C["muted"]),
        icon("update-close", x + w - 46, y + 38, 15, "fas:xmark", C["muted"]),
        shape("update-head-line", x, y + 92, w, 1, C["divider"]),
        text("update-found", x + 30, y + 124, 550, 34, "发现新版本 v0.4.0", 23, C["text"], True),
        shape("update-chip", x + w - 160, y + 126, 130, 30, C["accentSoft"], R["small"]),
        text("update-chip-text", x + w - 160, y + 126, 130, 30, "稳定版", 11, C["accent"], True, align=["center", "middle"]),
        text("update-meta", x + 30, y + 166, 700, 22, "发布于 2026-10-30 · 48.6 MB · 来自 GitHub Releases（界面示例）", 10, C["muted"]),
        shape("update-notes", x + 30, y + 208, w - 60, 170, C["surface2"], R["container"], B["control"]),
    ])
    update_release_notes(e, "update-release", x + 52, y + 232, w - 104)
    e.extend([
        text("update-progress-label", x + 30, y + 410, 450, 22, "正在下载更新包", 12, C["body"], True),
        text("update-progress-value", x + w - 260, y + 410, 230, 22, "31.1 / 48.6 MB · 64%", 11, C["muted"], align=["right", "top"]),
        shape("update-progress-track", x + 30, y + 446, w - 60, 8, C["surface3"], "pill"),
        shape("update-progress-bar", x + 30, y + 446, (w - 60) * 0.64, 8, C["accent"], "pill"),
        shape("update-verify-box", x + 30, y + 482, w - 60, 82, C["surface2"], R["container"]),
        icon("update-verify-icon", x + 50, y + 505, 18, "fas:shield-halved", C["accent"]),
        text("update-verify-title", x + 82, y + 494, 520, 24, "下载完成后自动执行 SHA-256 校验", 12, C["body"], True),
        text("update-verify-copy", x + 82, y + 523, 720, 22, "校验通过后才允许安装；校验失败的安装包不会保留。", 10, C["muted"]),
        shape("update-footer-line", x, y + h - 96, w, 1, C["divider"]),
        text("update-later", x + 30, y + h - 70, 160, 34, "稍后提醒", 12, C["muted"], align=["left", "middle"]),
        text("update-preserve", x + 190, y + h - 70, 430, 34, "安装前提示保存工作，不会自动重启", 10, C["muted"], align=["left", "middle"]),
    ])
    setup_button(e, "update-cancel", x + w - 340, y + h - 72, 140, "取消下载")
    setup_button(e, "update-install", x + w - 186, y + h - 72, 156, "重启并安装", True, False)
    note_block(e, "update-note-1", 1110, 202, 420, "更新链路", ["1. 获取版本信息与更新包", "2. 显示下载进度，可取消", "3. SHA-256 校验通过", "4. 用户确认后重启安装"])
    note_block(e, "update-note-2", 1110, 420, 420, "配置与数据", ["• 模型配置、DPAPI 密钥与历史保留", "• 未完成的回答先提示保存", "• 取消下载不影响当前版本"])
    note_block(e, "update-note-3", 1110, 620, 420, "完成态", ["校验完成后，进度区变为“已验证”，主按钮启用；按钮文案保持“重启并安装”，不自动关闭其他窗口。"])
    return p


def update_recovery_card(elements, eid, x, y, w, title_value, body, primary, secondary, detail, error=False):
    color = C["red"] if error else C["accent"]
    elements.extend([
        shape(eid, x, y, w, 420, C["surface"], R["window"], B["floating"]),
        shape(eid + "-icon-bg", x + 24, y + 24, 42, 42, C["redSoft"] if error else C["accentSoft"], R["small"]),
        icon(eid + "-icon", x + 35, y + 35, 20, "fas:triangle-exclamation" if error else "fas:wifi", color),
        text(eid + "-title", x + 82, y + 25, w - 108, 26, title_value, 16, C["text"], True),
        text(eid + "-stage", x + 82, y + 57, w - 108, 20, "当前版本 v0.3.1 仍可继续使用", 10, C["muted"]),
        shape(eid + "-line", x + 24, y + 94, w - 48, 1, C["divider"]),
        text(eid + "-body", x + 24, y + 118, w - 48, 84, body, 12, C["body"], wrap=True, line=1.65),
        shape(eid + "-detail-bg", x + 24, y + 218, w - 48, 68, C["surface2"], R["container"]),
        text(eid + "-detail", x + 40, y + 230, w - 80, 46, detail, 10, C["muted"], wrap=True),
    ])
    setup_button(elements, eid + "-secondary", x + 24, y + 342, (w - 60) / 2, secondary)
    setup_button(elements, eid + "-primary", x + 36 + (w - 60) / 2, y + 342, (w - 60) / 2, primary, True)


def page_update_recovery():
    p = base_page(37, "更新 · 失败与恢复", "区分下载前、校验后与安装阶段；任何失败都不破坏当前可用版本")
    e = p["elements"]
    update_recovery_card(e, "update-offline", 64, 202, 472, "无法检查更新",
                         "网络连接不可用，尚未下载更新包。恢复网络后可重新检查，无需重启应用。",
                         "重新检查", "稍后", "未发起安装，当前配置和回答不受影响。")
    update_recovery_card(e, "update-hash", 564, 202, 472, "更新包校验失败",
                         "SHA-256 与发布信息不一致，已阻止安装并删除下载文件。请重新从发布页获取。",
                         "重新下载", "查看发布页", "校验失败时不显示“重启并安装”，也不复用旧安装包。", True)
    update_recovery_card(e, "update-install-fail", 1064, 202, 472, "安装未能完成",
                         "安装程序已退出，浮问仍运行在原版本。可稍后重试，或打开发布页手动安装。",
                         "重试安装", "发布页", "保留已验证安装包；重试前再次确认未保存的回答。", True)
    e.extend([
        shape("update-recovery-rule", 64, 676, 1472, 170, C["surface2"], R["container"], B["control"]),
        text("update-recovery-rule-title", 92, 700, 420, 26, "统一恢复原则", 15, C["text"], True),
        text("update-recovery-rule-body", 92, 744, 1380, 64,
             "说明当前阶段、安装包是否保留、当前版本是否可用，并给出主要恢复动作。错误只作用于状态图标与必要文案，不使用整窗红色；诊断信息不得包含 API Key、OCR 原文或截图。",
             12, C["muted"], wrap=True, line=1.7),
    ])
    return p


def page_about():
    p = base_page(38, "关于 · 版本与开放许可", "产品身份、更新入口、开源许可和隐私边界集中在一处；诊断信息由用户主动复制")
    e = p["elements"]
    x, y, w, h = 64, 174, 1050, 730
    e.extend([
        shape("about-window", x, y, w, h, C["surface"], R["window"], B["floating"],
              {"blur": 38, "color": "#00000066", "offset": [0, 14]}),
        shape("about-sidebar", x + 1, y + 1, 214, h - 2, C["surface2"], R["window"]),
        text("about-settings", x + 26, y + 30, 150, 28, "设置", 20, C["text"], True),
    ])
    navs = ["模型服务", "联网检索", "通用与快捷键", "历史与隐私", "外观与阅读", "更新与关于"]
    for i, label in enumerate(navs):
        ny = y + 100 + i * 52
        selected = i == 5
        if selected:
            e.append(shape(f"about-nav-bg-{i}", x + 16, ny, 182, 40, C["accentSoft"], R["control"]))
        e.append(text(f"about-nav-{i}", x + 32, ny, 150, 40, label, 12, C["accent"] if selected else C["muted"], selected, align=["left", "middle"]))
    cx = x + 246
    e.extend([
        text("about-heading", cx, y + 30, 400, 32, "更新与关于", 22, C["text"], True),
        shape("about-identity", cx, y + 88, w - 278, 158, C["surface2"], R["container"], B["control"]),
        shape("about-logo-bg", cx + 24, y + 116, 72, 72, C["accentSoft"], R["window"]),
        text("about-logo", cx + 24, y + 116, 72, 72, "浮", 31, C["accent"], True, align=["center", "middle"]),
        text("about-name", cx + 120, y + 111, 300, 32, "FloatAsk 浮问", 21, C["text"], True),
        text("about-version", cx + 120, y + 150, 300, 22, "v0.3.1 · Windows x64", 11, C["muted"]),
        text("about-tagline", cx + 120, y + 180, 300, 24, "框一下，就懂了。", 12, C["body"]),
        shape("about-latest", cx + 504, y + 116, 218, 34, C["surface3"], R["small"]),
        text("about-latest-text", cx + 504, y + 116, 218, 34, "✓ 当前已是最新版本", 10, C["green"], align=["center", "middle"]),
        text("about-check-time", cx + 504, y + 162, 218, 20, "上次检查：今天 19:36", 9, C["muted"], align=["center", "top"]),
        shape("about-divider-1", cx, y + 278, w - 278, 1, C["divider"]),
        text("about-open-title", cx, y + 304, 400, 26, "开源与发布", 14, C["text"], True),
        icon("about-github", cx, y + 352, 17, "fab:github", C["muted"]),
        text("about-repo", cx + 30, y + 345, 450, 30, "GitHub 仓库与问题反馈", 12, C["body"], align=["left", "middle"]),
        icon("about-release-icon", cx, y + 402, 17, "fas:file-lines", C["muted"]),
        text("about-release", cx + 30, y + 395, 450, 30, "版本发布说明", 12, C["body"], align=["left", "middle"]),
        icon("about-license-icon", cx, y + 452, 17, "fas:scale-balanced", C["muted"]),
        text("about-license", cx + 30, y + 445, 450, 30, "MIT 许可与第三方组件许可", 12, C["body"], align=["left", "middle"]),
        shape("about-privacy", cx, y + 508, w - 278, 82, C["surface2"], R["container"]),
        icon("about-privacy-icon", cx + 20, y + 532, 18, "fas:shield-halved", C["accent"]),
        text("about-privacy-text", cx + 52, y + 520, w - 360, 52,
             "无自建服务器、无遥测。API Key 使用 DPAPI 加密；截图与历史仅保存在本机，模型与检索的数据流向以设置为准。",
             10, C["muted"], wrap=True),
        shape("about-footer-line", cx, y + h - 104, w - 278, 1, C["divider"]),
        text("about-copyright", cx, y + h - 78, 430, 26, "© FloatAsk contributors · MIT License", 10, C["muted"], align=["left", "middle"]),
    ])
    setup_button(e, "about-diagnostics", cx + 422, y + h - 84, 142, "复制诊断信息")
    setup_button(e, "about-check", cx + 578, y + h - 84, 164, "检查更新", True)
    note_block(e, "about-note", 1180, 220, 350, "诊断信息边界", ["仅包含版本、系统版本、DPI、显示配置和可脱敏错误码。", "复制前显示内容预览；不得包含密钥、OCR 原文、截图或完整对话。"])
    note_block(e, "about-note-2", 1180, 478, 350, "外部链接", ["GitHub、发布说明与许可使用系统默认浏览器打开；离开应用前有清晰外链图标，不在浮窗内嵌网页。"])
    return p


def page_light_onboarding_model():
    return asahi_variant(page_onboarding_model(), 39, "朝日 · 首次配置与模型服务",
                         "三步配置、连接反馈与 DPAPI 说明完整保留；浅色主操作与选中态沿用同一语义层级")


def page_light_onboarding_ready():
    return asahi_variant(page_onboarding_ready(), 40, "朝日 · 快捷键与完成",
                         "快捷键验证、本机 OCR 与可选上传清晰可读；完成页保持同一胶囊几何与唯一主动作")


def page_light_update_flow():
    return asahi_variant(page_update_flow(), 41, "朝日 · 更新下载与校验",
                         "版本、下载进度、SHA-256 与重启确认在暖白表面中保持清晰，不新增状态色")


def page_light_about():
    return asahi_variant(page_about(), 42, "朝日 · 更新与关于",
                         "关于、许可、隐私与诊断边界完整保留；双主题共享导航、间距、圆角和功能入口")


def mini_toolbar(elements, eid, x, y, scale=1.0, collapsed=False):
    if collapsed:
        elements.extend([
            shape(eid, x, y, 44 * scale, 64 * scale, C["surface2"], "pill", B["floating"]),
            shape(eid + "-brand", x + 6 * scale, y + 6 * scale, 32 * scale, 32 * scale,
                  C["surface3"], 16 * scale),
            text(eid + "-brand-text", x + 6 * scale, y + 6 * scale, 32 * scale, 32 * scale,
                 "浮", 12 * scale, C["text"], True, align=["center", "middle"]),
        ])
        return
    w, h = 328 * scale, 52 * scale
    elements.extend([
        shape(eid, x, y, w, h, C["surface2"], "pill", B["floating"]),
        shape(eid + "-brand", x + 5 * scale, y + 5 * scale, 54 * scale, 42 * scale, C["surface3"], "pill"),
        text(eid + "-brand-text", x + 5 * scale, y + 5 * scale, 54 * scale, 42 * scale,
             "浮", 13 * scale, C["text"], True, align=["center", "middle"]),
        shape(eid + "-capture", x + 67 * scale, y + 5 * scale, 114 * scale, 42 * scale, C["accentSoft"], "pill"),
        icon(eid + "-capture-icon", x + 81 * scale, y + 18 * scale, 15 * scale, "fas:crop-simple", C["accent"]),
        text(eid + "-capture-text", x + 105 * scale, y + 5 * scale, 64 * scale, 42 * scale,
             "框选", 11 * scale, C["accent"], True, align=["center", "middle"]),
        icon(eid + "-clipboard", x + 204 * scale, y + 18 * scale, 15 * scale, "far:clipboard", C["muted"]),
        icon(eid + "-history", x + 249 * scale, y + 18 * scale, 15 * scale, "far:clock", C["muted"]),
        icon(eid + "-more", x + 294 * scale, y + 18 * scale, 15 * scale, "fas:ellipsis", C["muted"]),
    ])


def page_windows_displays():
    p = base_page(43, "Windows · 多显示器与屏幕边缘", "以工作区和每屏 DIP 计算位置；跨屏、任务栏与边缘吸附不遮挡主要内容")
    e = p["elements"]
    e.extend([
        shape("display-map", 64, 184, 980, 566, C["surface"], R["window"], B["floating"]),
        text("display-map-title", 92, 208, 500, 28, "混合显示器拓扑 · 界面示例", 15, C["text"], True),
        text("display-map-subtitle", 92, 242, 650, 20, "逻辑坐标以每块屏幕的工作区为基准，不使用整张虚拟桌面的统一缩放。", 10, C["muted"]),
        shape("display-left", 104, 306, 520, 292, C["surface2"], R["container"], B["control"]),
        text("display-left-label", 124, 322, 300, 24, "显示器 1 · 2560 × 1440 · 100%", 11, C["body"], True),
        shape("display-left-taskbar", 104, 566, 520, 32, C["surface3"]),
        text("display-left-workarea", 124, 570, 300, 20, "工作区扣除任务栏", 9, C["muted"]),
        shape("display-answer", 154, 382, 280, 160, C["surface"], R["window"], B["active"]),
        shape("display-answer-head", 154, 382, 280, 36, C["surface3"], R["control"]),
        text("display-answer-title", 170, 382, 180, 36, "答案窗 · 480 × 360 DIP", 10, C["text"], align=["left", "middle"]),
        text("display-answer-copy", 174, 440, 210, 48, "跟随触发框选的显示器\n完整落在当前工作区内", 10, C["muted"], wrap=True),
        shape("display-right", 652, 340, 336, 226, C["surface2"], R["container"], B["control"]),
        text("display-right-label", 670, 354, 290, 24, "显示器 2 · 1920 × 1080 · 125%", 10, C["body"], True),
        shape("display-right-taskbar", 652, 536, 336, 30, C["surface3"]),
        shape("display-crossing", 566, 424, 134, 68, C["accentSoft"], R["control"], B["active"]),
        text("display-crossing-text", 566, 424, 134, 68, "禁止答案窗\n横跨屏幕接缝", 10, C["accent"], True, align=["center", "middle"], wrap=True),
    ])
    mini_toolbar(e, "display-toolbar-right", 924, 408, 0.72, True)
    e.extend([
        text("display-right-snap", 760, 584, 228, 22, "外侧右缘 · 半胶囊吸附", 10, C["muted"], align=["right", "top"]),
        shape("display-bottom", 104, 640, 884, 70, C["surface2"], R["container"]),
        text("display-bottom-label", 124, 654, 220, 22, "底部工作区边缘", 11, C["body"], True),
        text("display-bottom-copy", 124, 680, 380, 18, "展开距边缘 8 DIP，不压任务栏", 9, C["muted"]),
    ])
    mini_toolbar(e, "display-toolbar-bottom", 586, 649, 1.0, False)
    note_block(e, "display-note-1", 1110, 202, 420, "窗口归属", ["• 框选与答案窗跟随当前显示器", "• 窗口迁移后重新读取目标屏 DPI", "• 外接屏移除时迁回主屏工作区"])
    note_block(e, "display-note-2", 1110, 398, 420, "边缘行为", ["• 使用工作区，不覆盖任务栏", "• 吸附阈值 24 DIP，展开间距 8 DIP", "• 屏幕接缝处不跨屏展开菜单"])
    note_block(e, "display-note-3", 1110, 594, 420, "验收组合", ["左右排列、上下排列、不同缩放、主副屏切换、断开外接屏，以及任务栏位于四边时的完整恢复路径。"])
    return p


def dpi_card(elements, eid, x, y, w, scale, physical, focused=False):
    elements.extend([
        shape(eid, x, y, w, 496, C["surface"], R["window"], B["active"] if focused else B["floating"]),
        text(eid + "-scale", x + 24, y + 24, w - 48, 32, f"{scale}% 缩放", 20, C["text"], True),
        text(eid + "-physical", x + 24, y + 62, w - 48, 22, f"物理像素 {physical}", 10, C["muted"]),
        shape(eid + "-stage", x + 24, y + 110, w - 48, 230, C["surface2"], R["container"], B["control"]),
        shape(eid + "-window", x + 48, y + 140, w - 96, 156, C["surface"], R["window"], B["floating"]),
        shape(eid + "-head", x + 48, y + 140, w - 96, 32, C["surface3"], R["control"]),
        text(eid + "-title", x + 62, y + 140, w - 124, 32, "浮问 · 紧凑答案窗", 10, C["text"], align=["left", "middle"]),
        text(eid + "-body", x + 64, y + 192, w - 128, 44, "同一逻辑尺寸 480 × 360 DIP\n文字与圆角不随物理像素改写", 10, C["muted"], wrap=True),
        shape(eid + "-stroke", x + 64, y + 256, w - 128, 1, C["divider"]),
        text(eid + "-stroke-text", x + 64, y + 268, w - 128, 18, "1 DIP 描边 · 对齐物理像素网格", 9, C["muted"]),
        text(eid + "-rule", x + 24, y + 372, w - 48, 70,
             "布局、字号、点击区域使用 DIP；渲染时由系统缩放，不对 CSS 再乘一次 DPI。",
             11, C["body"], wrap=True, line=1.65),
    ])


def page_windows_dpi():
    p = base_page(44, "Windows · DPI 与窗口迁移", "100%／125%／150% 保持相同逻辑布局；跨屏迁移只重排位置，不重复缩放")
    e = p["elements"]
    dpi_card(e, "dpi-100", 64, 198, 472, 100, "480 × 360")
    dpi_card(e, "dpi-125", 564, 198, 472, 125, "600 × 450", True)
    dpi_card(e, "dpi-150", 1064, 198, 472, 150, "720 × 540")
    e.extend([
        shape("dpi-migration", 64, 742, 1472, 136, C["surface2"], R["container"], B["control"]),
        icon("dpi-migration-icon", 92, 774, 22, "fas:arrow-right", C["accent"]),
        text("dpi-migration-title", 132, 760, 350, 26, "迁移到另一块显示器", 14, C["text"], True),
        text("dpi-migration-copy", 132, 798, 1340, 48,
             "保留窗口在目标工作区内的相对中心，重新读取 DPI 并夹紧边界；若空间不足，优先保证标题栏、回答视口和输入区完整可见。禁止用目标屏缩放比例再次缩放已经由系统处理的界面。",
             11, C["muted"], wrap=True),
    ])
    return p


def focus_badge(elements, eid, x, y, number):
    elements.extend([
        circle(eid, x, y, 24, C["accent"]),
        text(eid + "-text", x, y, 24, 24, str(number), 10, C["surface"], True, align=["center", "middle"]),
    ])


def page_keyboard_focus():
    p = base_page(45, "可访问性 · 键盘焦点与操作", "Tab 顺序与视觉阅读顺序一致；焦点清晰、Esc 可预期，弹层不会形成键盘陷阱")
    e = p["elements"]
    x, y, w, h = 64, 182, 980, 704
    app_window(e, "focus-window", x, y, w, h, "Transformer · 屏幕框选", "已完成")
    e.extend([
        text("focus-answer-title", x + 30, y + 136, 620, 30, "Transformer 是什么？", 18, C["text"], True),
        text("focus-answer-body", x + 30, y + 184, w - 60, 116,
             "它是一种基于自注意力机制的神经网络架构，会让模型在处理一个词时，同时参考句子里的其他词。你当前框选的是论文中的概念解释段落。",
             12, C["body"], wrap=True, line=1.65),
        shape("focus-source", x + 30, y + 320, w - 60, 64, C["surface2"], R["container"], B["control"]),
        icon("focus-source-icon", x + 48, y + 342, 16, "fas:link", C["accent"]),
        text("focus-source-text", x + 78, y + 334, 620, 36, "[1] Attention Is All You Need · arXiv", 11, C["body"], align=["left", "middle"]),
        shape("focus-copy", x + w - 150, y + 334, 96, 36, C["surface3"], R["control"]),
        text("focus-copy-text", x + w - 150, y + 334, 96, 36, "复制来源", 10, C["body"], align=["center", "middle"]),
        shape("focus-input", x + 30, y + 432, w - 60, 64, C["surface2"], R["container"],
              {"style": "solid", "width": 2, "color": C["accent"]}),
        text("focus-input-text", x + 52, y + 432, w - 180, 64, "继续追问，或让我查一下…", 12, C["muted"], align=["left", "middle"]),
        shape("focus-send", x + w - 104, y + 443, 42, 42, C["primaryButton"], R["control"]),
        icon("focus-send-icon", x + w - 91, y + 456, 16, "fas:arrow-up", C["onPrimary"]),
        text("focus-ring-label", x + 52, y + 508, 420, 20, "2 DIP 焦点外描边 · 与控件边界间隔 2 DIP", 10, C["accent"]),
        shape("focus-menu", x + w - 282, y + 546, 224, 116, C["surface2"], R["container"], B["floating"]),
        text("focus-menu-item-1", x + w - 266, y + 558, 192, 36, "重新框选", 11, C["body"], align=["left", "middle"]),
        shape("focus-menu-active", x + w - 266, y + 602, 192, 36, C["accentSoft"], R["control"],
              {"style": "solid", "width": 2, "color": C["accent"]}),
        text("focus-menu-item-2", x + w - 250, y + 602, 160, 36, "关闭答案窗", 11, C["accent"], align=["left", "middle"]),
    ])
    for args in [
        ("focus-badge-1", x + w - 226, y + 16, 1),
        ("focus-badge-2", x + w - 164, y + 310, 2),
        ("focus-badge-3", x + 12, y + 414, 3),
        ("focus-badge-4", x + w - 118, y + 420, 4),
        ("focus-badge-5", x + w - 294, y + 532, 5),
    ]:
        focus_badge(e, *args)
    note_block(e, "focus-note-1", 1110, 202, 420, "焦点顺序", ["1. 标题栏与窗口操作", "2. 回答、来源与上下文", "3. 追问输入", "4. 发送、快捷 chips 和次级动作", "5. 菜单与弹层"])
    note_block(e, "focus-note-2", 1110, 408, 420, "弹层与 Esc", ["菜单打开后焦点进入菜单；方向键移动，Enter 执行。Esc 关闭菜单并返回触发按钮，再次 Esc 才关闭答案窗。"])
    note_block(e, "focus-note-3", 1110, 618, 420, "焦点可见性", ["2 DIP `active` 外描边，偏移 2 DIP；不被父容器裁剪。disabled 不进入 Tab 顺序，图标按钮均有可访问名称与 tooltip。"])
    return p


def page_accessibility():
    p = base_page(46, "可访问性 · 高对比度与减少动态", "系统高对比度优先于主题色板；减少动态不改变功能，屏幕阅读器只接收有意义的状态")
    e = p["elements"]
    e.extend([
        shape("access-contrast", 64, 190, 714, 650, C["surface"], R["window"], B["floating"]),
        text("access-contrast-title", 94, 218, 500, 28, "Windows 高对比度", 18, C["text"], True),
        text("access-contrast-copy", 94, 258, 610, 48,
             "检测到系统高对比度后，使用系统前景、背景、链接与按钮文字角色；不强行套用朝日或近月颜色。",
             11, C["muted"], wrap=True),
        shape("access-system-badge", 94, 310, 244, 20, C["accentSoft"], R["small"]),
        text("access-system-badge-text", 104, 310, 224, 20, "系统接管配色 · 非朝日／近月主题色", 9, C["accent"], True, align=["left", "middle"]),
        shape("hc-preview", 94, 334, 654, 270, "#000000", R["container"], {"style": "solid", "width": 1, "color": "#FFFFFF"}),
        text("hc-preview-title", 120, 358, 420, 30, "浮问 · 系统高对比度示意", 15, "#FFFFFF", True),
        shape("hc-preview-focus", 120, 414, 380, 52, "#000000", R["control"], {"style": "solid", "width": 2, "color": "#FFFF00"}),
        text("hc-preview-input", 140, 414, 340, 52, "继续追问…", 12, "#FFFFFF", align=["left", "middle"]),
        shape("hc-preview-button", 520, 414, 198, 52, "#000000", R["control"], {"style": "solid", "width": 1, "color": "#FFFFFF"}),
        text("hc-preview-button-text", 520, 414, 198, 52, "发送", 12, "#FFFFFF", True, align=["center", "middle"]),
        text("hc-preview-note", 120, 504, 560, 54,
             "焦点、边框和文字不能仅靠阴影或浅灰区分；示例中的系统黄仅用于高对比度焦点。",
             11, "#FFFFFF", wrap=True),
        shape("access-contrast-rule", 94, 640, 654, 1, C["divider"]),
        text("access-contrast-rule-text", 94, 666, 624, 88,
             "保留 1 DIP 控件边界与 2 DIP 焦点外描边；图标提供文本名称。禁用状态除颜色外，同时使用文案与不可交互行为表达。",
             11, C["body"], wrap=True, line=1.65),
        shape("access-motion", 812, 190, 724, 650, C["surface"], R["window"], B["floating"]),
        text("access-motion-title", 842, 218, 500, 28, "减少动态与辅助播报", 18, C["text"], True),
        text("access-motion-normal", 842, 278, 220, 24, "标准动态", 12, C["text"], True),
        shape("access-motion-track-1", 842, 320, 620, 12, C["surface3"], "pill"),
        shape("access-motion-bar-1", 842, 320, 420, 12, C["accent"], "pill"),
        text("access-motion-normal-copy", 842, 346, 620, 22, "胶囊收放 180 ms · 次级内容错峰淡入淡出", 10, C["muted"]),
        text("access-motion-reduced", 842, 404, 260, 24, "减少动态效果", 12, C["text"], True),
        shape("access-motion-track-2", 842, 446, 620, 12, C["surface3"], "pill"),
        shape("access-motion-bar-2", 842, 446, 620, 12, C["accent"], "pill"),
        text("access-motion-reduced-copy", 842, 472, 620, 22, "立即切换最终状态 · 无位移、缩放或闪烁", 10, C["muted"]),
        shape("access-motion-divider", 842, 526, 620, 1, C["divider"]),
        icon("access-reader-icon", 842, 558, 18, "fas:volume-high", C["accent"]),
        text("access-reader-title", 876, 550, 460, 26, "屏幕阅读器播报", 13, C["text"], True),
        text("access-reader-copy", 842, 596, 620, 94,
             "流式生成期间不逐字播报；完成后播报“回答已生成”，错误时播报状态与恢复动作。OCR 原文、来源与按钮使用可读标签，装饰图标隐藏。",
             11, C["body"], wrap=True, line=1.65),
        shape("access-motion-note", 842, 718, 620, 76, C["surface2"], R["container"]),
        text("access-motion-note-text", 862, 732, 580, 48,
             "减少动态不删除进度、状态或焦点反馈，只移除非必要运动。", 11, C["muted"], wrap=True),
    ])
    return p


def page_light_windows_displays():
    return asahi_variant(page_windows_displays(), 47, "朝日 · 多显示器与屏幕边缘",
                         "工作区、任务栏与跨屏恢复规则不变；浅色拓扑和胶囊使用同一几何与边界")


def page_light_windows_dpi():
    return asahi_variant(page_windows_dpi(), 48, "朝日 · DPI 与窗口迁移",
                         "100%／125%／150% 使用同一逻辑尺寸；浅色描边和文字在目标屏上重新对齐")


def page_light_keyboard_focus():
    return asahi_variant(page_keyboard_focus(), 49, "朝日 · 键盘焦点与操作",
                         "焦点顺序、弹层返回与 Esc 行为保持一致；灰雾蓝焦点外描边在暖白表面清晰可见")


def page_light_accessibility():
    return asahi_variant(page_accessibility(), 50, "朝日 · 高对比度与减少动态",
                         "系统高对比度保持系统色板，不被朝日漂白；减少动态与辅助播报规则跨主题一致",
                         preserve_dark=("hc-",))


pages = [
    page_long_answer(), page_states(), page_settings(), page_selection(),
    page_geometry(), page_toolbar(), page_more_menu(), page_toolbar_motion(),
    page_compact_answer(), page_long_scroll(), page_stream_follow(), page_capture_context(),
    page_recovery_states(), page_history(), page_general_settings(), page_search_settings(),
    page_privacy_settings(), page_appearance_settings(), page_theme_system(), page_light_answer(),
    page_light_settings(), page_light_history(), page_light_toolbar(), page_light_selection(),
    page_light_compact(), page_light_stream(), page_light_recovery(), page_light_long_scroll(),
    page_light_capture_context(), page_light_general_settings(), page_light_search_settings(),
    page_light_privacy_settings(), page_light_appearance_settings(), page_onboarding_model(),
    page_onboarding_ready(), page_update_flow(), page_update_recovery(), page_about(),
    page_light_onboarding_model(), page_light_onboarding_ready(), page_light_update_flow(), page_light_about(),
    page_windows_displays(), page_windows_dpi(), page_keyboard_focus(), page_accessibility(),
    page_light_windows_displays(), page_light_windows_dpi(), page_light_keyboard_focus(), page_light_accessibility(),
]
page_names = [
    "1-long-answer.page", "2-result-states.page", "3-settings.page",
    "4-selection-bubble.page", "5-radius-border.page", "6-floating-toolbar.page",
    "7-more-menu.page", "8-toolbar-motion.page", "9-compact-answer.page",
    "10-long-scroll.page", "11-stream-follow.page", "12-capture-context.page",
    "13-recovery-states.page", "14-history.page", "15-general-settings.page",
    "16-search-settings.page", "17-privacy-settings.page", "18-appearance-settings.page",
    "19-theme-system.page", "20-asahi-light-answer.page", "21-asahi-settings.page",
    "22-asahi-history.page", "23-asahi-toolbar-menu.page", "24-asahi-selection.page",
    "25-asahi-compact-answer.page", "26-asahi-stream-follow.page", "27-asahi-recovery.page",
    "28-asahi-long-scroll.page", "29-asahi-capture-context.page", "30-asahi-general-settings.page",
    "31-asahi-search-settings.page", "32-asahi-privacy-settings.page", "33-asahi-appearance-settings.page",
    "34-onboarding-model.page", "35-onboarding-ready.page", "36-update-flow.page",
    "37-update-recovery.page", "38-about.page", "39-asahi-onboarding-model.page",
    "40-asahi-onboarding-ready.page", "41-asahi-update-flow.page", "42-asahi-about.page",
    "43-windows-displays.page", "44-windows-dpi.page", "45-keyboard-focus.page",
    "46-accessibility.page", "47-asahi-windows-displays.page", "48-asahi-windows-dpi.page",
    "49-asahi-keyboard-focus.page", "50-asahi-accessibility.page",
]
for name, page in zip(page_names, pages):
    (PAGES / name).write_text(yaml.safe_dump(page, allow_unicode=True, sort_keys=False, width=1200), encoding="utf-8")

main = {
    "version": "v2",
    "title": "FloatAsk 朝日／近月全状态设计板",
    "size": [1600, 1000],
    "customFonts": [
        {"family": "Liter", "src": "https://statics.kimi.ai/neo-design-static/p-font/Liter.ttf"},
        {"family": "MiSans", "src": "https://statics.kimi.ai/neo-design-static/p-font/MiSans.ttf"},
    ],
    "theme": {
        "colors": {"accent": C["accent"], "text": C["text"], "secondary": C["muted"]},
        "textStyles": {"body": {"fontSize": 14, "color": "$text", "fontFamily": FONT, "lineHeight": 1.55}},
    },
    "pages": [f"pages/{name}" for name in page_names],
}
(ROOT / "floatask-graphite-system.kanva.pptd").write_text(
    yaml.safe_dump(main, allow_unicode=True, sort_keys=False, width=1200), encoding="utf-8"
)
print(f"Generated {len(pages)} pages in {ROOT}")
