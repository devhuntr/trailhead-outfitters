"""Resize and compress product photos for the catalog.

Originals go in raw-images/ (git-ignored, keep the full-resolution downloads
there). Optimized copies are written to public/images/, which is what the site
actually serves.

    python scripts/optimize_images.py              # process every raw image
    python scripts/optimize_images.py boot-ridgeline.jpg   # just one

The output filename must match the `image` field in public/data/products.json,
so name the raw file after the product id: pack-summit-45.jpg.

Aspect ratio is preserved rather than cropped to 4:3. The catalog uses
object-fit: cover, so the browser crops for display, and keeping the full frame
means a portrait shot is not silently decapitated here.
"""

import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "raw-images"
OUT_DIR = ROOT / "public" / "images"

# Cards display at 400x300 and the modal at roughly 600 wide, so 900px on the
# long edge covers a 2x retina card with room to spare.
MAX_EDGE = 900
QUALITY = 82
SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def optimize(source: Path) -> tuple[int, int]:
    """Write an optimized copy to OUT_DIR. Returns (bytes_before, bytes_after)."""
    before = source.stat().st_size

    with Image.open(source) as image:
        # Phones record orientation in EXIF rather than rotating the pixels.
        # Without this, portrait shots come out sideways once EXIF is stripped.
        image = ImageOps.exif_transpose(image)

        if image.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", image.size, (245, 243, 240))
            converted = image.convert("RGBA")
            background.paste(converted, mask=converted.split()[-1])
            image = background
        elif image.mode != "RGB":
            image = image.convert("RGB")

        image.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)

        target = OUT_DIR / f"{source.stem}.jpg"
        OUT_DIR.mkdir(parents=True, exist_ok=True)

        # No exif= argument, so metadata (including GPS) is dropped.
        image.save(target, "JPEG", quality=QUALITY, optimize=True, progressive=True)

    return before, target.stat().st_size


def human(size: int) -> str:
    for unit in ("B", "KB", "MB"):
        if size < 1024 or unit == "MB":
            return f"{size:.0f}{unit}" if unit == "B" else f"{size:.1f}{unit}"
        size /= 1024
    return f"{size:.1f}MB"


def main(argv: list[str]) -> int:
    if not RAW_DIR.exists():
        print(f"No raw-images/ directory. Create it and put originals there.")
        return 1

    if argv:
        sources = [RAW_DIR / name for name in argv]
        missing = [p for p in sources if not p.exists()]
        if missing:
            for p in missing:
                print(f"not found: {p.relative_to(ROOT)}")
            return 1
    else:
        sources = sorted(p for p in RAW_DIR.iterdir() if p.suffix.lower() in SUFFIXES)

    if not sources:
        print("Nothing to do -- raw-images/ has no images in it.")
        return 0

    total_before = total_after = 0

    for source in sources:
        before, after = optimize(source)
        total_before += before
        total_after += after
        saved = 100 * (1 - after / before) if before else 0
        print(f"{source.name:<28} {human(before):>8} -> {human(after):>8}  ({saved:.0f}% smaller)")

    if len(sources) > 1:
        saved = 100 * (1 - total_after / total_before) if total_before else 0
        print(f"{'':<28} {human(total_before):>8} -> {human(total_after):>8}  ({saved:.0f}% smaller)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
