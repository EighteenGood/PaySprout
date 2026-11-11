"""Generate local, scalable app icons. Requires Pillow (build-time only)."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent / 'assets'
root.mkdir(exist_ok=True)
img = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle((5, 5, 507, 507), radius=115, fill='#254732')
d.ellipse((63, 63, 449, 449), fill='#2e5338')
d.polygon([(233, 381), (215, 276), (154, 175), (184, 180), (239, 235), (259, 310), (264, 185), (283, 113), (321, 77), (329, 140), (315, 213), (284, 313), (329, 263), (386, 239), (423, 245), (394, 298), (350, 345), (292, 381)], fill='#dceba9')
d.polygon([(213, 381), (148, 366), (101, 314), (96, 289), (146, 301), (187, 335), (237, 381)], fill='#9fbc71')
d.line([(163, 392), (337, 392)], fill='#dceba9', width=13)
img.save(root / 'icon.png')
img.save(root / 'icon.ico', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
img.resize((32, 32), Image.Resampling.LANCZOS).save(root / 'tray.png')
