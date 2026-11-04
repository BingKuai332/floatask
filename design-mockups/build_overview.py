from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
PREVIEW = ROOT / "graphite-preview"
THUMB_SIZE = (800, 500)
MARGIN = 20
GAP = 20
COLS = 2
PAGE_COUNT = 50
ROWS = (PAGE_COUNT + COLS - 1) // COLS

canvas = Image.new(
    "RGB",
    (
        MARGIN * 2 + COLS * THUMB_SIZE[0] + (COLS - 1) * GAP,
        MARGIN * 2 + ROWS * THUMB_SIZE[1] + (ROWS - 1) * GAP,
    ),
    "#0C0E12",
)

for index in range(1, PAGE_COUNT + 1):
    source = PREVIEW / f"page-{index}.png"
    with Image.open(source) as image:
        thumb = image.convert("RGB").resize(THUMB_SIZE, Image.Resampling.LANCZOS)
    col = (index - 1) % COLS
    row = (index - 1) // COLS
    x = MARGIN + col * (THUMB_SIZE[0] + GAP)
    y = MARGIN + row * (THUMB_SIZE[1] + GAP)
    canvas.paste(thumb, (x, y))

output = PREVIEW / "overview.png"
canvas.save(output, optimize=True)
print(f"Generated {output}")
