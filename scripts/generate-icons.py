"""Generate original hall icons. No third-party marks or stock art."""
from pathlib import Path
from PIL import Image, ImageDraw

BLUE = (26, 95, 184, 255)
CREAM = (247, 245, 240, 255)
LINTEL = (232, 224, 204, 255)
SCREEN_A = (255, 236, 170, 255)
SCREEN_B = (196, 224, 255, 255)
SCREEN_C = (255, 214, 196, 255)
SILL = (210, 200, 178, 255)

def paint(size: int, margin: float) -> Image.Image:
    img = Image.new('RGBA', (size, size), BLUE)
    draw = ImageDraw.Draw(img)
    m = size * margin
    inner = size - 2 * m
    pad = inner * 0.10
    x0, y0 = m + pad, m + pad * 1.05
    x1, y1 = size - m - pad, size - m - pad * 0.85
    draw.rounded_rectangle((x0, y0, x1, y1), radius=inner * 0.14, fill=CREAM)
    ly0 = y0 + inner * 0.10
    ly1 = ly0 + inner * 0.08
    draw.rounded_rectangle((x0 + inner * 0.08, ly0, x1 - inner * 0.08, ly1), radius=inner * 0.03, fill=LINTEL)
    gap = inner * 0.05
    top = ly1 + inner * 0.07
    bot = y1 - inner * 0.20
    avail_w = (x1 - x0) - inner * 0.16
    w = (avail_w - 2 * gap) / 3
    left = x0 + inner * 0.08
    rad = w * 0.18
    for i, color in enumerate((SCREEN_A, SCREEN_B, SCREEN_C)):
        sx = left + i * (w + gap)
        draw.rounded_rectangle((sx, top, sx + w, bot), radius=rad, fill=color)
        shine_y = top + (bot - top) * 0.18
        draw.rounded_rectangle((sx + w * 0.18, shine_y, sx + w * 0.82, shine_y + (bot - top) * 0.08), radius=rad * 0.4, fill=CREAM)
    by0 = y1 - inner * 0.13
    draw.rounded_rectangle((x0 + inner * 0.14, by0, x1 - inner * 0.14, y1 - inner * 0.04), radius=inner * 0.04, fill=SILL)
    return img

def save(img: Image.Image, path: Path, size: int) -> None:
    out = img.resize((size, size), Image.Resampling.LANCZOS)
    bg = Image.new('RGBA', (size, size), BLUE)
    bg.alpha_composite(out)
    path.parent.mkdir(parents=True, exist_ok=True)
    bg.convert('RGB').save(path, 'PNG', optimize=True)

def main() -> None:
    root = Path(__file__).resolve().parents[1] / 'public'
    icons = root / 'icons'
    base = paint(1024, 0.0)
    mask = paint(1024, 0.22)
    save(base, icons / 'icon-192.png', 192)
    save(base, icons / 'icon-512.png', 512)
    save(mask, icons / 'icon-192-maskable.png', 192)
    save(mask, icons / 'icon-512-maskable.png', 512)
    save(base, root / 'apple-touch-icon.png', 180)

if __name__ == '__main__':
    main()
