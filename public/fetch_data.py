"""
STOCK DATA FETCHER
==================
Τρέξε αυτό για να ανανεώσεις τα δεδομένα:
    python fetch_data.py

Αποθηκεύει data.json στον ίδιο φάκελο.
Μετά κάνε refresh το browser.
"""
import finviz
from finviz.screener import Screener
import yfinance as yf
import json, os, time
from datetime import datetime

# ══════════════════════════════════════════════════════════
# 👉 ΑΛΛΑΞΕ ΤΙΣ ΜΕΤΟΧΕΣ ΣΟΥ ΕΔΩ
WATCHLIST = ["NVDA","MU","NOW","ASML","AAPL","MSFT","PYPL","PLTR","AMZN","AMD","GOOG","NFLX","META"]

GROWTH_FILTERS = [
    "cap_midover","fa_epsyoy_o20","fa_epsyoy1_o15",
    "fa_grossmargin_o40","fa_roe_o15","fa_debteq_u1",
]
# ══════════════════════════════════════════════════════════

def pn(v):
    if v is None or str(v).strip() in ["-","","N/A","nan"]: return None
    try:
        s=str(v).strip().replace(",","").replace("%","").replace("$","")
        if s.endswith("B"): return float(s[:-1])*1000
        if s.endswith("M"): return float(s[:-1])
        if s.endswith("K"): return float(s[:-1])/1000
        return float(s)
    except: return None

def fetch_one(t):
    fv={}
    try: fv=finviz.get_stock(t)
    except Exception as e: print(f"  fv {t}: {e}")
    yi={}
    try: yi=yf.Ticker(t).info or {}
    except: pass
    fn=lambda k: pn(fv.get(k))
    fs=lambda k: str(fv.get(k,"") or "").strip() if fv.get(k) and str(fv.get(k))!="-" else ""
    pr=fn("Price") or pn(yi.get("currentPrice"))
    tg=fn("Target Price")
    up=round((tg-pr)/pr*100,1) if pr and tg else None
    return {
        "ticker":t,"name":yi.get("longName") or yi.get("shortName") or t,
        "sector":yi.get("sector") or "","country":yi.get("country") or "",
        "price":pr,"high52":fn("52W High"),"low52":fn("52W Low"),
        "beta":fn("Beta"),"target":tg,"upside":up,"rsi":fn("RSI (14)"),
        "recom":fs("Recom"),"earnings":fs("Earnings"),
        "mktcap":fn("Market Cap"),
        "pe_ttm":fn("P/E"),"pe_fwd":fn("Forward P/E"),"peg":fn("PEG"),
        "ps":fn("P/S"),"pb":fn("P/B"),"pfcf":fn("P/FCF"),
        "revenue":fn("Sales"),"eps_ttm":fn("EPS (ttm)"),
        "eps_fwd":pn(yi.get("forwardEps")),"booksh":fn("Book/sh"),
        "gross_mgn":fn("Gross Margin"),"oper_mgn":fn("Oper. Margin"),
        "net_mgn":fn("Profit Margin"),"roe":fn("ROE"),
        "roa":fn("ROA"),"roi":fn("ROI"),
        "eps_this_y":fn("EPS this Y"),"eps_next_y":fn("EPS next Y"),
        "eps_next_q":fn("EPS next Q"),"eps_5y":fn("EPS past 5Y"),
        "sales_5y":fn("Sales past 5Y"),"debt_eq":fn("Debt/Eq"),
        "current_r":fn("Current Ratio"),"div_yield":fn("Dividend %"),
        "short_float":fs("Short Float"),"insider_own":fs("Insider Own"),
        "inst_own":fs("Inst Own"),"perf_week":fs("Perf Week"),
        "perf_month":fs("Perf Month"),"perf_ytd":fs("Perf YTD"),
    }

def calc_score(d):
    return sum([
        bool(d.get("gross_mgn") and d["gross_mgn"]>40),
        bool(d.get("roe") and d["roe"]>15),
        bool(d.get("eps_this_y") and d["eps_this_y"]>20),
        bool(d.get("eps_next_y") and d["eps_next_y"]>15),
        bool(d.get("debt_eq") is not None and 0<=d["debt_eq"]<1),
        bool(d.get("current_r") and d["current_r"]>1.5),
        bool(d.get("peg") and 0<d["peg"]<2),
        bool(d.get("rsi") and 30<d["rsi"]<65),
    ])

def fetch_history(tickers):
    hist={}
    for t in tickers:
        try:
            h=yf.Ticker(t).history(period="1y")
            if not h.empty:
                hist[t]={
                    "dates":[str(d.date()) for d in h.index],
                    "close":[round(v,2) for v in h["Close"].tolist()],
                }
                print(f"  📈 History {t}: {len(h)} days")
        except Exception as e: print(f"  history {t}: {e}")
    return hist

if __name__=="__main__":
    print("""
╔══════════════════════════════════════╗
║   STOCK DATA FETCHER                 ║
╚══════════════════════════════════════╝
    """)

    # 1. Watchlist
    print(f"🔍 Fetching {len(WATCHLIST)} watchlist stocks...")
    watch=[]
    for t in WATCHLIST:
        try:
            d=fetch_one(t); d["score"]=calc_score(d)
            watch.append(d); print(f"  ✅ {t} — {d['name']}")
        except Exception as e: print(f"  ❌ {t}: {e}")

    # 2. Growth screener
    print(f"\n🚀 Running Growth Screener...")
    growth=[]
    try:
        sl=Screener(filters=GROWTH_FILTERS,table="Overview",order="market cap")
        print(f"  Found {len(sl)} stocks")
        for s in sl:
            try:
                d=fetch_one(s["Ticker"]); d["score"]=calc_score(d)
                growth.append(d); print(f"  ✅ {s['Ticker']}")
            except Exception as e: print(f"  ❌ {s['Ticker']}: {e}")
    except Exception as e: print(f"  Screener error: {e}")

    # 3. Price history
    print(f"\n📈 Fetching price history...")
    all_tickers=list({d["ticker"] for d in watch})
    history=fetch_history(all_tickers)

    # 4. Save
    data={
        "watch":watch,
        "growth":growth,
        "history":history,
        "updated":datetime.now().strftime("%d/%m/%Y %H:%M"),
    }
    with open("data.json","w") as f:
        json.dump(data,f)

    print(f"""
✅ Αποθηκεύτηκε: data.json
   {len(watch)} watchlist stocks
   {len(growth)} growth candidates
   {len(history)} price histories
   Updated: {data['updated']}

👉 Τώρα κάνε refresh το browser!
    """)
