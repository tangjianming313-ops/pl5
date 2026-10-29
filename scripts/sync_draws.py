#!/usr/bin/env python3
"""Fetch verified consecutive P5 draws; fail closed if the stored history cannot be joined."""
import json, re, urllib.request, urllib.error, pathlib, datetime, sys, time
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"draws-auto.json"
BASE_LAST="4157"
URL="https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry"
HEADERS={"User-Agent":"Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36","Referer":"https://m.lottery.gov.cn/","Accept":"application/json"}
def rows(obj):
    if isinstance(obj,dict):
        if "lotteryDrawNum" in obj and "lotteryDrawResult" in obj:
            yield obj
        for v in obj.values(): yield from rows(v)
    elif isinstance(obj,list):
        for v in obj: yield from rows(v)
def fetch(page):
    from urllib.parse import urlencode
    params={"gameNo":"37","provinceId":"0","pageSize":"100","isVerify":"1","pageNo":str(page)}
    req=urllib.request.Request(URL+"?"+urlencode(params),headers=HEADERS)
    obj=None
    for attempt in range(1,4):
        try:
            with urllib.request.urlopen(req,timeout=25) as response:
                obj=json.loads(response.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as exc:
            print(f"Official API HTTP {exc.code}, attempt {attempt}/3",file=sys.stderr,flush=True)
            if attempt==3:
                raise RuntimeError(f"Official API unavailable (HTTP {exc.code}); existing history preserved") from exc
        except (urllib.error.URLError,TimeoutError) as exc:
            print(f"Official API network error, attempt {attempt}/3: {exc}",file=sys.stderr,flush=True)
            if attempt==3:
                raise RuntimeError("Official API unreachable; existing history preserved") from exc
        time.sleep(attempt*3)
    out=[]
    for item in rows(obj):
        issue=str(item["lotteryDrawNum"])
        parts=re.findall(r"\d+",str(item["lotteryDrawResult"]))
        if not issue.isdigit() or len(parts)!=5 or any(len(p)!=1 for p in parts):continue
        out.append({"issue":issue,"front4":"".join(parts[:4]),"date":str(item.get("lotteryDrawTime",""))[:10]})
    return out
def main():
    fetched=[]
    for page in range(1,11):
        batch=fetch(page)
        if not batch:break
        fetched.extend(batch)
        if any(x["front4"]==BASE_LAST for x in batch):break
    seen=set(); ordered=[]
    for x in fetched:
        if x["issue"] not in seen:seen.add(x["issue"]);ordered.append(x)
    if len(ordered)<2:raise RuntimeError("No valid official draws; retaining existing history")
    ordered.sort(key=lambda x:int(x["issue"]))
    anchors=[i for i,x in enumerate(ordered) if x["front4"]==BASE_LAST]
    if not anchors:raise RuntimeError("History anchor 4157 not found within fetched official draws; manual reconciliation required")
    anchor=anchors[-1]
    updates=ordered[anchor+1:]
    if len(updates)>120:raise RuntimeError("Unexpected number of new draws")
    previous=json.loads(OUT.read_text()) if OUT.exists() else {}
    payload={"source":"中国体育彩票开奖数据接口","anchor":"4157","updatedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"draws":updates}
    if previous.get("draws")==updates:
        print("No new draw; keeping previous verified file");return
    OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n")
    print(f"Verified {len(updates)} post-anchor draws; latest {updates[-1]['issue'] if updates else 'anchor'}")
if __name__=="__main__":main()
