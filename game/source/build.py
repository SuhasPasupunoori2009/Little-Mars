"""Rebuild game/index.html from the sources. Run: python game/source/build.py

Embeds Three.js, the real NASA DONKI archive (data/donki-daily.json), the space-weather module,
the mission model (model.js and model4.js) and the game (with the v3 layer from v3ui.js and the v4 modules from source/v4 placed inside it), into one self-contained file that opens with no server.
"""
import json
from pathlib import Path

p = Path(__file__).resolve().parent
root = next(r for r in (p.parent.parent, p.parent) if (r / "data" / "donki-daily.json").exists())
html = (p / "shell.html").read_text(encoding="utf-8")
donki = json.loads((root / "data" / "donki-daily.json").read_text(encoding="utf-8"))
data_js = "window.DONKI_DAILY=" + json.dumps(donki, separators=(",", ":")) + ";"
# v4: the new systems live in small files under source/v4. They are joined in this order and placed inside game.js at the
# V4 marker, after the v3 layer, so they share the game's variables without creating globals.
V4_ORDER = ["core.js", "world.js", "rover.js", "colony.js", "science.js", "missions.js", "saves.js", "look.js"]
v4 = "\n".join("/* ---- v4/%s ---- */\n%s" % (f, (p / "v4" / f).read_text(encoding="utf-8")) for f in V4_ORDER)
game = (p / "game.js").read_text(encoding="utf-8")
for marker, body in (("/*@V3UI@*/", (p / "v3ui.js").read_text(encoding="utf-8")), ("/*@V4@*/", v4)):
    assert game.count(marker) == 1, "missing marker " + marker
    game = game.replace(marker, body)
html = html.replace("</style></head>", (p / "v4" / "v4.css").read_text(encoding="utf-8") + "</style></head>", 1)
parts = [
    ("LIBRARY", (p / "three.min.js").read_text(encoding="utf-8")),
    ("DATA", data_js),
    ("SPACEWEATHER", (p / "spaceweather.js").read_text(encoding="utf-8")),
    ("MODEL", (p / "model.js").read_text(encoding="utf-8")),
    ("MODEL4", (p / "model4.js").read_text(encoding="utf-8")),
    ("STORY", (p / "story.js").read_text(encoding="utf-8")),
    ("GAME", game),
]
for marker, body in parts:
    token = "<!-- " + marker + " -->"
    assert token in html, "missing marker " + marker
    html = html.replace(token, "<script>\n" + body.replace("</script>", "<\\/script>") + "\n</script>")
html = html.replace("</body>", "<!-- Three.js MIT license\n" + (p.parent / "THREE-LICENSE.txt").read_text(encoding="utf-8") + "\n-->\n</body>")
(p.parent / "index.html").write_text(html, encoding="utf-8")
print("Built game/index.html (%d KB). Open it in your browser to play." % (len(html) // 1024))
