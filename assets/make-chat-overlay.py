from PIL import Image, ImageDraw, ImageFont
img = Image.new('RGB', (1280, 720), color=(30,30,30))
draw = ImageDraw.Draw(img)
# Use a monospaced font if available
try:
    font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 24)
except Exception:
    font = ImageFont.load_default()
# Write chat lines
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
    "// saved in memory"
]
y = 50
for line in lines:
    draw.text((50, y), line, font=font, fill=(200,200,200))
    y += 30
img.save('assets/chat-overlay.png')
print('saved')
