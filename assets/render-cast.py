"""Render assets/demo-v3.cast -> assets/demo-v3.mp4.

The .cast is a v2 asciicast — one event per output chunk. We rebuild the
screen state per frame, draw it to a PIL Image, then encode to mp4 with
per-frame PTS so variable-duration frames are preserved.
"""
from __future__ import annotations
import json, os, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

CAST = Path(sys.argv[1] if len(sys.argv) > 1 else "assets/demo-v3.cast")
OUT  = Path(sys.argv[2] if len(sys.argv) > 2 else "assets/demo-v3.mp4")
CAST = CAST.resolve()
OUT  = OUT.resolve()
COLS, ROWS = 110, 30
W, H = 1320, 600
FONT_PT = 14
PADDING = 16

def load_font(size: int) -> ImageFont.FreeTypeFont:
    for p in [
        r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\cour.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    ]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

font = load_font(FONT_PT)

events: list[tuple[float, str, str]] = []
with CAST.open() as f:
    head = f.readline().strip()
    meta = json.loads(head)
    assert meta.get("version") == 2
    for line in f:
        line = line.strip()
        if not line: continue
        t, k, v = json.loads(line)
        if k == "o":
            events.append((float(t), k, v))
if not events: raise SystemExit("no output events in cast")

def ansi_to_lines(text: str, current: list[str]) -> list[str]:
    out = current[:]
    i = 0
    while i < len(text):
        c = text[i]
        if c == "\x1b" and i + 1 < len(text) and text[i+1] == "[":
            j = i + 2
            while j < len(text) and text[j] not in "ABCDEFGHJKSTfmnsulhABCDEFGH~":
                j += 1
            i = j + 1; continue
        if c == "\r":
            if out: out[-1] = ""
            i += 1; continue
        if c == "\n":
            out.append(""); i += 1; continue
        if not out: out.append("")
        out[-1] += c; i += 1
    if len(out) > ROWS: out = out[-ROWS:]
    return out

def draw(lines: list[str]) -> Image.Image:
    img = Image.new("RGB", (W, H), (16, 16, 20))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((6, 6, W-6, H-6), radius=12, fill=(24, 24, 32))
    for i, col in enumerate([(255,95,86),(255,189,46),(39,201,63)]):
        cx = 22 + i*18
        d.ellipse((cx-6, 18, cx+6, 30), fill=col)
    d.text((PADDING+4+30, 18), "FLAWRA-CODE — terminal session", fill=(160,160,170), font=font)
    y = 48; line_h = FONT_PT + 4
    for ln in lines:
        if len(ln) > COLS: ln = ln[:COLS]
        d.text((PADDING+4, y), ln, fill=(220,220,220), font=font)
        y += line_h
        if y > H - 20: break
    return img

# Build frames + durations. Each event either changes the screen (new frame)
# or is absorbed as additional duration on the previous frame.
TMP = CAST.parent / "_frames"
TMP.mkdir(exist_ok=True)
for old in TMP.glob("*.png"):
    old.unlink()

lines = [""]
frame_paths: list[Path] = []
frame_durations: list[float] = []
prev_t = 0.0
for t, _, v in events:
    new_lines = ansi_to_lines(v, lines)
    delta = max(0.1, t - prev_t)
    if new_lines != lines:
        lines = new_lines
        img = draw(lines)
        p = TMP / f"f{len(frame_paths):04d}.png"
        img.save(p, optimize=False)
        frame_paths.append(p)
        # First frame: hold ~1s for lead-in; subsequent frames: use delta
        frame_durations.append(max(1.0 if len(frame_paths) == 1 else 0.3, delta))
    else:
        if frame_durations:
            frame_durations[-1] += delta
    prev_t = t
# final hold
if frame_durations: frame_durations[-1] += 1.5

print(f"frames: {len(frame_paths)}, total duration: {sum(frame_durations):.2f}s")

# Use ffmpeg image2 demuxer with per-frame PTS via concat+setpts.
# Trick: pipe a single PNG (each frame), but with explicit -framerate and an
# intermediate concat+setpts that pads each frame to its target duration.
# Cleanest: produce one frame at constant rate and use ffmpeg's tpad via
# sendcmd filter. Even simpler: re-emit each frame N times at 12 fps where
# N = round(duration * 12), then write with -r 12.
FPS = 12
expanded: list[Path] = []
for p, d in zip(frame_paths, frame_durations):
    n = max(1, round(d * FPS))
    for i in range(n):
        # hard link to save space
        link = TMP / f"e{len(expanded):05d}.png"
        try: os.link(p, link)
        except OSError: pass  # already linked
        expanded.append(link)

print(f"expanded frames: {len(expanded)}")

# write concat
list_path = CAST.parent / "_frames.txt"
with list_path.open("w") as f:
    for p in expanded:
        f.write(f"file '{p.as_posix()}'\nduration {(1.0/FPS):.4f}\n")

out = subprocess.run([
    "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_path),
    "-vsync", "cfr", "-r", str(FPS),
    "-pix_fmt", "yuv420p",
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-movflags", "+faststart", "-an", str(OUT)
], capture_output=True, text=True)
if out.returncode != 0:
    print("FFMPEG STDERR:", out.stderr[-2000:])
    raise SystemExit(out.returncode)

# cleanup
for p in frame_paths + expanded:
    try: p.unlink()
    except: pass
list_path.unlink()
TMP.rmdir()
print("wrote", OUT, OUT.stat().st_size, "bytes")
