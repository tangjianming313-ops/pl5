#!/usr/bin/env python3
"""Synchronize P5 draws from a public CSV mirror; never append unverified rows."""
import csv
import datetime
import io
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "draws-auto.json"
INDEX = ROOT / "index.html"
SOURCE = "https://raw.githubusercontent.com/BrookeMa/pl5-data/main/pl5_5digit.csv"
ANCHOR = "4157"

def fetch_csv():
    req = urllib.request.Request(SOURCE, headers={"User-Agent": "binbin-p5-sync/1.0", "Accept": "text/plain,text/csv"})
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                return response.read().decode("utf-8-sig")
        except (urllib.error.URLError, TimeoutError) as exc:
            print(f"CSV mirror fetch failed ({attempt}/3): {exc}", file=sys.stderr, flush=True)
            if attempt == 3:
                raise RuntimeError("CSV source unavailable; previous draw data preserved") from exc
            time.sleep(3 * attempt)

def main():
    html = INDEX.read_text(encoding="utf-8")
    match = re.search(r"const BASE=(\[[\s\S]*?\]);const STORAGE=", html)
    if not match:
        raise RuntimeError("Cannot read embedded history; refusing to synchronize")
    base = json.loads(match.group(1))
    if len(base) < 7000 or base[-1] != ANCHOR or any(not re.fullmatch(r"\d{4}", x) for x in base):
        raise RuntimeError("Embedded history does not match expected baseline")

    reader = csv.DictReader(io.StringIO(fetch_csv()))
    if not {"period", "date", "winningNumber"}.issubset(reader.fieldnames or []):
        raise RuntimeError("CSV schema changed; previous data preserved")
    rows = []
    seen = set()
    for item in reader:
        issue = (item["period"] or "").strip()
        number = (item["winningNumber"] or "").strip()
        date = (item["date"] or "").strip()
        if not re.fullmatch(r"\d{7}", issue) or not re.fullmatch(r"\d{5}", number) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
            raise RuntimeError(f"Malformed CSV draw: {item!r}")
        if issue in seen or (rows and int(issue) <= int(rows[-1]["issue"])):
            raise RuntimeError("Duplicate or out-of-order issue in CSV")
        datetime.date.fromisoformat(date)
        seen.add(issue)
        rows.append({"issue": issue, "date": date, "front4": number[:4]})
    if len(rows) < 7000:
        raise RuntimeError("Incomplete CSV history; refusing update")

    # The embedded 7,763-row baseline includes one draw not yet in the mirror
    # as of 2026-10-28. Require the entire available history to agree, in order.
    common = min(len(base), len(rows))
    for i in range(common):
        if base[i] != rows[i]["front4"]:
            raise RuntimeError(f"Historical mismatch at row {i+1} (issue {rows[i]['issue']}); manual review required")
    if len(rows) < len(base):
        if len(base) - len(rows) > 1:
            raise RuntimeError("Mirror is more than one draw behind embedded baseline")
        print("Mirror has not published the baseline's final draw yet; preserving data")
        return
    updates = rows[len(base):]
    if len(updates) > 120:
        raise RuntimeError("Unexpected number of post-baseline draws")
    previous = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    if previous.get("draws") == updates:
        print(f"No change; mirror currently has {len(rows)} validated draws")
        return
    payload = {
        "source": "公开历史开奖CSV镜像（非官方）：BrookeMa/pl5-data",
        "sourceUrl": SOURCE,
        "anchor": ANCHOR,
        "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "draws": updates,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Validated {len(rows)} historical rows; appended {len(updates)} draws")
    if updates:
        print(f"Latest: issue {updates[-1]['issue']} front4 {updates[-1]['front4']}")

if __name__ == "__main__":
    main()
