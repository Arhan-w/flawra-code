from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 640
BG = (10, 10, 15)
FG = (232, 232, 236)
MUTED = (106, 106, 114)
ACCENT = (0, 245, 255)
ACCENT2 = (113, 112, 255)

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

def font(size, bold=False):
    paths = [
        r"C:\Windows\Fonts\segoeui%s.ttf" % ("bold" if bold else "semilight"),
        r"C:\Windows\Fonts\arial%s.ttf" % ("bd" if bold else ""),
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()

def mono(size):
    for p in [r"C:\Windows\Fonts\consola.ttf", r"C:\Windows\Fonts\cour.ttf"]:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()

# subtle grid dots
for x in range(0, W, 32):
    for y in range(0, H, 32):
        d.point((x, y), fill=(18, 18, 24))

# top accent line
d.rectangle([80, 150, 80 + 64, 153], fill=ACCENT)

# title
t = font(72, bold=True)
d.text((80, 180), "FLAWRA-CODE", font=t, fill=FG)

# tagline
s = font(26)
d.text((82, 285), "Your repo, your terminal, your model.", font=s, fill=MUTED)

# feature chips (two rows to avoid crowding the terminal)
chips = [["persistent memory", "code review", "git native"], ["any provider", "local models", "sub-agents"]]
cf = mono(17)
cy = 345
for row in chips:
    cx = 82
    for c in row:
        w = d.textlength(c, font=cf)
        d.rounded_rectangle([cx, cy, cx + w + 28, cy + 36], radius=6, outline=(40, 40, 50), width=1)
        d.text((cx + 14, cy + 9), c, font=cf, fill=(180, 180, 190))
        cx += w + 44
    cy += 48

# terminal mock on the right
term_font = mono(16)
lines = [
    ("$ flawra", FG),
    ("", None),
    ("> remember my fav color is red", ACCENT),
    ("  Memory  saved  user_favorite_color", MUTED),
    ("", None),
    ("> what is my fav color?", ACCENT),
    ("  Memory  recall  ->  red", MUTED),
    ("  Your favorite color is red.", FG),
    ("", None),
    ("$ flawra providers", FG),
    ("  * ollama  localhost:11434", ACCENT2),
    ("    sonnet -> qwen3-coder:30b", MUTED),
]
tx, ty = 700, 120
d.rounded_rectangle([tx - 24, ty - 24, W - 56, ty + 340], radius=10, fill=(14, 14, 20), outline=(35, 35, 45), width=1)
# window dots
for i, col in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
    d.ellipse([tx - 8 + i * 18, ty - 12, tx + 2 + i * 18, ty - 2], fill=col)
yy = ty + 24
for text, col in lines:
    if text:
        d.text((tx + 8, yy), text, font=term_font, fill=col)
    yy += 26

# bottom bar
d.text((82, 560), "made by Arhan", font=mono(15), fill=(110, 110, 122))
d.text((W - 220, 560), "bun · ink · sqlite", font=mono(15), fill=(110, 110, 122))

img.save("D:/claude/flawra-code/assets/hero.png")
print("saved hero.png", img.size)
