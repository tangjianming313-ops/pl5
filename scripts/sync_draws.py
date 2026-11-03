#!/usr/bin/env python3
"""Synchronize verified P5 draw results with multiple independent sources.

Primary: Jiangsu Sports Lottery public result history (official provincial).
Backup: Gansu official draw page, national Sporttery API, and validated CSV mirror.
Never replace saved draws with missing, conflicting or out-of-order entries.
"""
import csv
import datetime as dt
import io
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "draws-auto.json"
BASE_FILE = ROOT / "miniprogram/data/history.json"
ANCHOR = "4157"
ANCHOR_ISSUE = "2026288"
JIANGSU = "https://api.js-lottery.com/wfzq/p3p5/p5data"
GANSU = "https://www.gstc.org.cn/wanfa/pl"
SPORTTERY = ("https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry"
             "?gameNo=37&provinceId=0&pageSize=50&isVerify=1&pageNo=1")
MIRROR = "https://raw.githubusercontent.com/BrookeMa/pl5-data/main/pl5_5digit.csv"
MOBILE_UA = ("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 "
             "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")


def download(url, mobile=False):
    headers = {"User-Agent": MOBILE_UA, "Accept": "text/html,application/json,text/plain,*/*"}
    if mobile:
        headers["Referer"] = "https://m.lottery.gov.cn/"
    request = urllib.request.Request(url, headers=headers)
    last_error = None
    for attempt in range(2):
        try:
            with urllib.request.urlopen(request, timeout=18) as response:
                if response.status != 200:
                    raise ValueError(f"HTTP {response.status}")
                body = response.read(2_500_000)
                if not body:
                    raise ValueError("Empty response")
                return body.decode("utf-8-sig", errors="replace")
        except (OSError, ValueError) as exc:
            last_error = exc
            print(f"Fetch failed ({attempt + 1}/2) from {url}: {exc}", file=sys.stderr)
            if attempt == 0:
                time.sleep(2)
    raise RuntimeError(f"Cannot fetch {url}: {last_error}")


def normalize_issue(value):
    issue = re.sub(r"\s+", "", str(value))
    if re.fullmatch(r"20\d{5}", issue):
        return issue
    if re.fullmatch(r"\d{5}", issue):
        return "20" + issue
    return None


def verified_draw(issue, day, five):
    issue = normalize_issue(issue)
    if not issue:
        return None
    date_match = re.search(r"20\d{2}-\d{2}-\d{2}", str(day))
    if not date_match:
        return None
    date = date_match.group(0)
    dt.date.fromisoformat(date)
    digits = re.sub(r"\D", "", str(five))
    if len(digits) != 5:
        return None
    if issue[:4] != date[:4]:
        return None
    return {"issue": issue, "date": date, "front4": digits[:4]}


def consolidate(items):
    result = {}
    for item in items:
        old = result.get(item["issue"])
        if old is not None and old != item:
            raise ValueError(f"Conflicting duplicate draw {item['issue']}")
        result[item["issue"]] = item
    return result


class DrawTableParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows = []
        self.in_row = False
        self.in_cell = False
        self.cells = []
        self.fragments = []

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.in_row = True
            self.cells = []
        elif self.in_row and tag in ("td", "th"):
            self.in_cell = True
            self.fragments = []

    def handle_data(self, data):
        if self.in_cell:
            self.fragments.append(data)

    def handle_endtag(self, tag):
        if self.in_row and tag in ("td", "th") and self.in_cell:
            self.cells.append(" ".join(self.fragments).strip())
            self.in_cell = False
        elif tag == "tr" and self.in_row:
            self.rows.append(self.cells)
            self.in_row = False
            self.in_cell = False


class VisibleTextParser(HTMLParser):
    """Read visible text independently of the source site's HTML table layout."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.values = []
        self.ignored = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript"):
            self.ignored += 1

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript"):
            self.ignored = max(0, self.ignored - 1)

    def handle_data(self, data):
        if not self.ignored and data.strip():
            self.values.append(" ".join(data.split()))


def page_text(html):
    parser = VisibleTextParser()
    parser.feed(html)
    return " ".join(parser.values)


def fetch_jiangsu():
    html = download(JIANGSU)
    parser = DrawTableParser()
    parser.feed(html)
    parsed = []
    for cells in parser.rows:
        if len(cells) < 3:
            continue
        row = verified_draw(cells[1], cells[0], cells[2])
        if row is not None:
            parsed.append(row)

    # Some versions of this public site render the list using div/li instead
    # of <table> elements. Also accept normalized visible row text.
    text = page_text(html)
    pattern = re.compile(
        r"(20\d{2}-\d{2}-\d{2})\s*(?:[|｜]\s*)?"
        r"(\d{5}|20\d{5})\s*(?:[|｜]\s*)?"
        r"((?:\d[\s,，]*){5})(?!\d)"
    )
    for match in pattern.finditer(text):
        row = verified_draw(match.group(2), match.group(1), match.group(3))
        if row is not None:
            parsed.append(row)
    if not parsed:
        raise ValueError("Jiangsu official page returned no parseable P5 records")
    return consolidate(parsed)


def fetch_gansu():
    text = page_text(download(GANSU))
    pattern = re.compile(
        r"\b(\d{5}|20\d{5})\s*期.{0,240}?"
        r"开奖日期\s*[：:]\s*(20\d{2}-\d{2}-\d{2}).{0,160}?"
        r"排列\s*5\s*[：:]\s*((?:\d\s*){5})(?!\d)"
    )
    match = pattern.search(text)
    if not match:
        raise ValueError("Gansu official page returned no parseable current P5 draw")
    record = verified_draw(match.group(1), match.group(2), match.group(3))
    if record is None:
        raise ValueError("Invalid Gansu official current draw")
    return {record["issue"]: record}


def fetch_sporttery():
    raw = json.loads(download(SPORTTERY, mobile=True))
    records = []

    def walk(node):
        if isinstance(node, list):
            for item in node:
                walk(item)
        elif isinstance(node, dict):
            if "lotteryDrawNum" in node and "lotteryDrawResult" in node:
                date = (node.get("lotteryDrawTime") or node.get("lotteryDrawDate")
                        or node.get("drawTime") or "")
                row = verified_draw(node["lotteryDrawNum"], date, node["lotteryDrawResult"])
                if row is not None:
                    records.append(row)
            else:
                for value in node.values():
                    if isinstance(value, (list, dict)):
                        walk(value)

    walk(raw)
    if not records:
        raise ValueError("Sporttery API returned no valid P5 records")
    return consolidate(records)


def fetch_mirror(base):
    data = download(MIRROR)
    reader = csv.DictReader(io.StringIO(data))
    if not {"period", "date", "winningNumber"}.issubset(reader.fieldnames or []):
        raise ValueError("CSV mirror schema changed")
    all_rows = []
    for item in reader:
        row = verified_draw(item["period"], item["date"], item["winningNumber"])
        if row is None:
            raise ValueError(f"Malformed CSV record: {item!r}")
        if all_rows and int(row["issue"]) != int(all_rows[-1]["issue"]) + 1:
            # A new-year change is permitted after December's final draw.
            previous, current = all_rows[-1]["issue"], row["issue"]
            if not (int(current[:4]) == int(previous[:4]) + 1
                    and int(current[4:]) == 1):
                raise ValueError(f"CSV mirror has a gap or out-of-order draw at {current}")
        all_rows.append(row)
    if len(all_rows) < len(base) or len(all_rows) < 7000:
        raise ValueError("CSV mirror shorter than the verified historical baseline")
    for i, number in enumerate(base):
        if all_rows[i]["front4"] != number:
            raise ValueError(f"CSV mirror history mismatch at row {i + 1}")
    if all_rows[len(base) - 1]["issue"] != ANCHOR_ISSUE:
        raise ValueError("CSV mirror baseline issue mismatch")
    return consolidate(all_rows[len(base) - 1:])


def next_issue(issue, available):
    year, serial = int(issue[:4]), int(issue[4:])
    same_year = f"{year}{serial + 1:03d}"
    if same_year in available:
        return same_year
    first_next_year = f"{year + 1}001"
    if first_next_year in available and not any(
        key.startswith(str(year)) and int(key[4:]) > serial for key in available
    ):
        return first_next_year
    return None


def main():
    baseline = json.loads(BASE_FILE.read_text(encoding="utf-8"))["front4"]
    if len(baseline) < 7000 or baseline[-1] != ANCHOR or any(
        not isinstance(x, str) or not re.fullmatch(r"\d{4}", x) for x in baseline
    ):
        raise RuntimeError("Historical baseline failed validation")

    old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    existing = old.get("draws", [])
    if not isinstance(existing, list) or len(existing) > 120:
        raise RuntimeError("Saved automatic draws are malformed")
    known = {ANCHOR_ISSUE: {"issue": ANCHOR_ISSUE, "date": "2026-10-29", "front4": ANCHOR}}
    last = ANCHOR_ISSUE
    for draw in existing:
        if not isinstance(draw, dict) or not re.fullmatch(r"\d{4}", str(draw.get("front4", ""))):
            raise RuntimeError("Saved draws include invalid numbers")
        issue = str(draw.get("issue", ""))
        if issue != next_issue(last, {issue}):
            raise RuntimeError(f"Saved results are not continuous near {issue}")
        known[issue] = draw
        last = issue

    sources = {}
    for label, function in [
        ("江苏省体育彩票管理中心", fetch_jiangsu),
        ("甘肃省体育彩票管理中心", fetch_gansu),
        ("中国体育彩票开奖查询接口", fetch_sporttery),
        ("第三方历史CSV备用镜像", lambda: fetch_mirror(baseline)),
    ]:
        try:
            entries = function()
            if not any(issue in known for issue in entries):
                next_expected = next_issue(max(known), entries)
                if not next_expected:
                    raise ValueError("Source has neither overlapping nor immediately next verified draw")
            for issue, item in entries.items():
                if issue in known and known[issue] != item:
                    raise ValueError(f"Source conflicts with stored results at {issue}")
                for other_label, other in sources.items():
                    if issue in other and other[issue] != item:
                        raise ValueError(f"Sources {label} and {other_label} disagree at {issue}")
            sources[label] = entries
            print(f"Verified {label}: {len(entries)} draws, latest {max(entries)}")
        except Exception as exc:
            print(f"Source unavailable/invalid ({label}): {exc}", file=sys.stderr)

    if not sources:
        raise RuntimeError("All lottery result sources unavailable or unverifiable; saved data kept")

    combined = {}
    for label, records in sources.items():
        for issue, draw in records.items():
            combined.setdefault(issue, (draw, label))
    updates = list(existing)
    last = max(known)
    latest_source = old.get("source", "已保存的历史开奖")
    latest_url = old.get("sourceUrl", "")
    urls = {
        "江苏省体育彩票管理中心": JIANGSU,
        "甘肃省体育彩票管理中心": GANSU,
        "中国体育彩票开奖查询接口": SPORTTERY,
        "第三方历史CSV备用镜像": MIRROR,
    }
    while len(updates) < 120:
        new_issue = next_issue(last, combined)
        if not new_issue:
            break
        draw, label = combined[new_issue]
        updates.append(draw)
        last = new_issue
        latest_source, latest_url = label, urls[label]

    future = [key for key in combined if key > last]
    if future:
        print(f"Gap detected after {last}; not skipping to {min(future)}", file=sys.stderr)
    if updates == existing:
        print(f"No new verified draws; latest remains {last}")
        return
    payload = {
        "source": latest_source,
        "sourceUrl": latest_url,
        "anchor": ANCHOR,
        "updatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "draws": updates,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Added {len(updates) - len(existing)} draws; latest issue {last} = {updates[-1]['front4']}")


if __name__ == "__main__":
    main()
