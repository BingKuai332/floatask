from pathlib import Path
import json

import yaml
from PIL import Image

ROOT = Path(__file__).resolve().parent
SYSTEM = ROOT / "graphite-system"
PREVIEW = ROOT / "graphite-preview"
BOARD = SYSTEM / "floatask-graphite-system.kanva.pptd"

board = yaml.safe_load(BOARD.read_text(encoding="utf-8"))
pages = board["pages"]
assert len(pages) == 50, f"页面引用数量错误：{len(pages)}"
assert len(set(pages)) == 50, "页面引用存在重复"
missing_sources = [page for page in pages if not (SYSTEM / page).is_file()]
assert not missing_sources, f"页面源文件缺失：{missing_sources}"

missing_previews = []
oversized_previews = []
for index in range(1, 51):
    image_path = PREVIEW / f"page-{index}.png"
    if not image_path.is_file():
        missing_previews.append(image_path.name)
    elif image_path.stat().st_size >= 3 * 1024 * 1024:
        oversized_previews.append(image_path.name)
assert not missing_previews, f"预览缺失：{missing_previews}"
assert not oversized_previews, f"预览大于 3 MB：{oversized_previews}"

overview_path = PREVIEW / "overview.png"
with Image.open(overview_path) as overview:
    overview_size = overview.size
assert overview_size == (1660, 13020), f"总览尺寸错误：{overview_size}"

tokens = yaml.safe_load((SYSTEM / "design-tokens.yaml").read_text(encoding="utf-8"))
assert tokens["version"] == "1.4.2"
assert tokens["accessibility"]["keyboardFocusOutlineWidth"] == 2
assert tokens["accessibility"]["keyboardFocusOutlineOffset"] == 2
assert tokens["accessibility"]["windowsCoordinateUnit"] == "DIP"
assert tokens["accessibility"]["windowsUseWorkArea"] is True
assert tokens["accessibility"]["systemHighContrastPriority"] is True
assert tokens["compatibility"]["changePolicy"] == "additive"

spec = (SYSTEM / "IMPLEMENTATION_SPEC.md").read_text(encoding="utf-8")
readme = (ROOT / "README.md").read_text(encoding="utf-8")
handoff_path = ROOT.parent / "docs/superpowers/plans/2026-10-30-floatask-ui-implementation.md"
handoff = handoff_path.read_text(encoding="utf-8")
assert "版本：1.4.2" in spec
assert "1.4.2（2026-10-30）" in spec
assert "四十二" not in readme
assert "主要界面、双主题与系统状态设计已覆盖" in readme
assert handoff.count("### Task ") == 13
assert sum(1 for line in handoff.splitlines() if line.startswith("| ") and line[2:4].isdigit()) == 50
assert "系统接管配色 · 非朝日／近月主题色" in handoff
assert "## 实施前置：上游基线与冲突防护" in handoff
assert "## 新功能扩展契约" in handoff

print(json.dumps({
    "pages": len(pages),
    "uniquePageReferences": len(set(pages)),
    "missingSources": missing_sources,
    "previews": 50,
    "oversizedPreviews": oversized_previews,
    "overviewSize": overview_size,
    "overviewBytes": overview_path.stat().st_size,
    "tokenVersion": tokens["version"],
    "specVersion": "1.4.2",
    "handoffTasks": 13,
    "handoffPageRows": 50,
    "extensionContract": True,
}, ensure_ascii=False, indent=2))
