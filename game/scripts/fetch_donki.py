"""Fetch real NASA DONKI space-weather events and distil them into one record per day.

Source: NASA CCMC DONKI web service (public, no key needed):
    https://ccmc.gsfc.nasa.gov/DONKI/WS/get/{FLR|SEP|GST|CME}?startDate=...&endDate=...
The service allows at most 60 days per request, so we fetch in chunks.

Output: data/donki-daily.json  (embedded into the game by build.py)
Run:    python scripts/fetch_donki.py [START] [END]     e.g. 2024-01-01 2025-10-31
"""
import json
import subprocess
import sys
import time
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://ccmc.gsfc.nasa.gov/DONKI/WS/get"
START = date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else date(2024, 1, 1)
END = date.fromisoformat(sys.argv[2]) if len(sys.argv) > 2 else date(2025, 10, 31)


def fetch(kind, a, b):
    url = f"{BASE}/{kind}?startDate={a}&endDate={b}"
    for attempt in range(3):
        try:
            # curl uses the operating system's trust store; Python's bundled one rejected this host.
            body = subprocess.run(["curl", "-sS", "--fail", "-m", "90", url], capture_output=True,
                                  text=True, check=True).stdout
            return json.loads(body) if body.strip() else []
        except Exception as e:  # network hiccups are common on this service
            print(f"  retry {kind} {a}: {e}")
            time.sleep(2 + attempt * 3)
    raise SystemExit(f"giving up on {kind} {a}..{b}")


def chunks():
    a = START
    while a <= END:
        b = min(a + timedelta(days=58), END)
        yield a, b
        a = b + timedelta(days=1)


def flare_rank(cls):
    """'X1.2' -> comparable number. Letter order: A<B<C<M<X."""
    order = {"A": 0, "B": 1, "C": 2, "M": 3, "X": 4}
    try:
        return order[cls[0]] * 100 + float(cls[1:])
    except Exception:
        return -1


def day_of(ts):
    return ts[:10]


days = defaultdict(lambda: {"flare": None, "flareId": None, "sep": False, "sepId": None,
                            "kp": 0.0, "gstId": None, "cmeSpeed": 0, "cmeId": None})
raw_counts = defaultdict(int)
for a, b in chunks():
    print(f"fetching {a}..{b}")
    for ev in fetch("FLR", a, b):
        raw_counts["FLR"] += 1
        d = days[day_of(ev["beginTime"])]
        if d["flare"] is None or flare_rank(ev["classType"]) > flare_rank(d["flare"]):
            d["flare"], d["flareId"] = ev["classType"], ev["flrID"]
    for ev in fetch("SEP", a, b):
        raw_counts["SEP"] += 1
        d = days[day_of(ev["eventTime"])]
        d["sep"], d["sepId"] = True, ev["sepID"]
    for ev in fetch("GST", a, b):
        raw_counts["GST"] += 1
        for k in ev.get("allKpIndex", []):
            d = days[day_of(k["observedTime"])]
            if k["kpIndex"] > d["kp"]:
                d["kp"], d["gstId"] = k["kpIndex"], ev["gstID"]
    for ev in fetch("CME", a, b):
        raw_counts["CME"] += 1
        speeds = [x.get("speed") or 0 for x in ev.get("cmeAnalyses") or []]
        sp = max(speeds) if speeds else 0
        d = days[day_of(ev["startTime"])]
        if sp > d["cmeSpeed"]:
            d["cmeSpeed"], d["cmeId"] = sp, ev["activityID"]
    time.sleep(0.5)


def risk_of(d):
    """0 calm, 1 watch, 2 storm. The rule is deliberately simple so kids and judges can follow it."""
    f = d["flare"] or ""
    if f.startswith("X") or d["sep"]:
        return 2
    if f.startswith("M") or d["cmeSpeed"] >= 1500:
        return 1
    return 0


out_days = []
cur = START
while cur <= END:
    key = cur.isoformat()
    d = days.get(key, {"flare": None, "flareId": None, "sep": False, "sepId": None,
                       "kp": 0.0, "gstId": None, "cmeSpeed": 0, "cmeId": None})
    out_days.append({"date": key, "risk": risk_of(d), "flare": d["flare"], "sep": d["sep"],
                     "kp": round(d["kp"], 2), "cmeSpeed": round(d["cmeSpeed"]),
                     "ids": [x for x in (d["flareId"], d["sepId"], d["gstId"], d["cmeId"]) if x]})
    cur += timedelta(days=1)

# Windows of 5 consecutive real days that make a fair game: sol 1 is not a storm,
# there are 1 or 2 storm days, and no two storms are back to back.
windows = []
for i in range(len(out_days) - 4):
    w = out_days[i:i + 5]
    r = [x["risk"] for x in w]
    if r[0] == 2 or r.count(2) not in (1, 2):
        continue
    if any(r[j] == 2 and r[j + 1] == 2 for j in range(4)):
        continue
    windows.append(i)

summary = {"calm": sum(x["risk"] == 0 for x in out_days), "watch": sum(x["risk"] == 1 for x in out_days),
           "storm": sum(x["risk"] == 2 for x in out_days)}
result = {
    "source": "NASA CCMC DONKI (Space Weather Database Of Notifications, Knowledge, Information)",
    "url": "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
    "fetched": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    "fetchedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "windowRule": "A playable week is 5 consecutive real days where sol 1 is not a Storm, there are one or two Storm days, and no two Storms are back to back. This keeps every mission winnable. The archive is therefore curated, not a random sample of all weeks.",
    "windowsPossible": len(out_days) - 4,
    "range": [START.isoformat(), END.isoformat()],
    "ruleText": "Storm = an X-class flare or a solar particle event that day. Watch = an M-class flare or a very fast CME. Calm = anything quieter.",
    "counts": dict(raw_counts),
    "dayCounts": summary,
    "windows": windows,
    "days": out_days,
}
(ROOT / "data").mkdir(exist_ok=True)
(ROOT / "data" / "donki-daily.json").write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")
print("raw events:", dict(raw_counts))
print("days:", summary, "| playable windows:", len(windows))
