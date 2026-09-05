import os, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# Directory for frames
tmp_dir = Path('assets/chat_frames')
tmp_dir.mkdir(parents=True, exist_ok=True)

font_path = 'C:/Windows/Fonts/consola.ttf'
try:
    font = ImageFont.truetype(font_path, 24)
except Exception:
    font = ImageFont.load_default()

lines = [
    "User: build a rate limiter in TypeScript and save it in memory",
    "",
    "FLAWRA: Generating rate limiter...",
    "export function rateLimiter(max: number) {",
    "  let count = 0;",
    "  return () => {",
    "    if (count < max) {",
    "      count++; return true;",
    "    } return false;",
    "  };",
    "}",
    "// saved in memory",
    "",
    "User: show the memory entry",
    "",
    "FLAWRA: Memory entry retrieved: rateLimiter function stored.",
]

frame_idx = 0
for i, line in enumerate(lines):
    # Create an image showing all lines up to i
    img = Image.new('RGB', (1280, 720), color=(30,30,30))
    draw = ImageDraw.Draw(img)
    y = 30
    for l in lines[:i+1]:
        draw.text((50, y), l, font=font, fill=(200,200,200))
        y += 30
    # Save multiple frames to hold this state for 1.5 sec @30fps => 45 frames
    for _ in range(45):
        frame_path = tmp_dir / f"frame{frame_idx:04d}.png"
        img.save(frame_path)
        frame_idx += 1

# Build video with ffmpeg
out_path = Path('assets/chat-demo.mp4')
subprocess.run([
    'ffmpeg', '-y', '-framerate', '30', '-i', str(tmp_dir / 'frame%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', str(out_path)
], check=True)
# Cleanup frames
for p in tmp_dir.iterdir():
    p.unlink()
tmp_dir.rmdir()
print('Generated', out_path)
