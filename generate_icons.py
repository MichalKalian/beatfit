#!/usr/bin/env python3
"""
Generates simple Beatfit PWA icons (192x192 and 512x512).
Run: python3 generate_icons.py
Output: icon-192.png, icon-512.png  (place both in /public)
Requires: pip install Pillow
"""
from PIL import Image, ImageDraw, ImageFont
import os

def make_icon(size):
    img = Image.new("RGB", (size, size), "#0f0f0f")
    draw = ImageDraw.Draw(img)

    # rounded rect background
    pad = size // 8
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=size // 5,
        fill="#1a1a2e"
    )

    # "B" letter
    font_size = size // 2
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except Exception:
        font = ImageFont.load_default()

    text = "B"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1]
    draw.text((x, y), text, fill="#38bdf8", font=font)

    return img

for sz, name in [(192, "icon-192.png"), (512, "icon-512.png")]:
    icon = make_icon(sz)
    icon.save(name)
    print(f"Generated {name}")

print("Done — copy both files to your project's /public folder.")