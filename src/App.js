import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

// ── Colors ──────────────────────────────────────────────
const C = {
  bg:"#0d1117", card:"#161b22", border:"#21262d", border2:"#30363d",
  accent:"#0a84ff", green:"#3fb950", red:"#f85149",
  yellow:"#e3b341", purple:"#a78bfa", cyan:"#00d4ff",
  text:"#e6edf3", sub:"#8b949e", dim:"#484f58",
};
const SCOLS = {
  Semiconductors:"#a78bfa", Software:"#34d399", Technology:"#00d4ff",
  Cybersecurity:"#e879f9", Fintech:"#f472b6", Energy:"#4ade80",
  Healthcare:"#38bdf8", Consumer:"#fb923c", Communication:"#f59e0b",
  Industrials:"#6ee7b7",
};
const sc = s => SCOLS[s] || C.sub;

// ── Helpers ──────────────────────────────────────────────
const fmt  = (v,d=2) => v != null ? Number(v).toFixed(d) : "—";
const fmtP = v => v != null ? `${v>0?"+":""}${Number(v).toFixed(1)}%` : "—";
const fmtM = v => {
  if (!v) return "—";
  if (v>=1000000) return `$${(v/1000000).toFixed(2)}T`;
  if (v>=1000)    return `$${(v/1000).toFixed(1)}B`;
  return `$${v.toFixed(0)}M`;
};

const pColor = v => v == null ? C.text : v > 0 ? C.green : v < 0 ? C.red : C.text;

const SCORE_CRITERIA = [
  {k:"gross_mgn", label:"Gross Mgn > 40%",  check: v => v > 40},
  {k:"roe",       label:"ROE > 15%",         check: v => v > 15},
  {k:"eps_this_y",label:"EPS This Y > 20%",  check: v => v > 20},
  {k:"eps_next_y",label:"EPS Next Y > 15%",  check: v => v > 15},
  {k:"debt_eq",   label:"Debt/Eq < 1",       check: v => v >= 0 && v < 1},
  {k:"current_r", label:"Current R > 1.5",   check: v => v > 1.5},
  {k:"peg",       label:"PEG < 2",           check: v => v > 0 && v < 2},
  {k:"rsi",       label:"RSI 30-65",         check: v => v > 30 && v < 65},
];

// ── Components ───────────────────────────────────────────
const Card = ({children, style={}}) => (
  <div style={{backgroundColor:C.card, border:`1px solid ${C.border}`,
    borderRadius:10, padding:16, ...style}}>{children}</div>
);

const Label = ({children}) => (
  <div style={{fontSize:9,color:C.sub,letterSpacing:"2px",marginBottom:6}}>{children}</div>
);

const KPI = ({label, value, color=C.text, sub}) => (
  <Card>
    <Label>{label}</Label>
    <div style={{fontSize:20,fontWeight:800,color,fontFamily:"monospace"}}>{value}</div>
    {sub && <div style={{fontSize:9,color:C.dim,marginTop:2}}>{sub}</div>}
  </Card>
);

const MetricCard = ({label, value, suffix="", good, bad}) => {
  const n = value != null ? parseFloat(value) : null;
  const isGood = n != null && good && good(n);
  const isBad  = n != null && bad  && bad(n);
  const color  = isGood ? C.green : isBad ? C.red : C.text;
  const disp   = n != null ? `${fmt(n, n>100?0:n>10?1:2)}${suffix}` : "—";
  return (
    <div style={{
      backgroundColor: isGood ? "#0d2e0d" : isBad ? "#2e0d0d" : C.bg,
      border:`1px solid ${isGood ? C.green+"40" : isBad ? C.red+"40" : C.border}`,
      borderRadius:6, padding:"9px 10px",
    }}>
      <div style={{fontSize:8,color:C.sub,letterSpacing:"1px",marginBottom:4}}>{label}</div>
      <div style={{fontSize:13,fontWeight:700,color,fontFamily:"monospace"}}>{disp}</div>
      {isGood && <div style={{fontSize:7,color:C.green,marginTop:1}}>▲</div>}
      {isBad  && <div style={{fontSize:7,color:C.red,  marginTop:1}}>▼</div>}
    </div>
  );
};

const MetricGroup = ({label, children}) => (
  <div style={{marginBottom:12}}>
    <Label style={{marginTop:14}}>{label}</Label>
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>{children}</div>
  </div>
);

const SideRow = ({label, value}) => {
  const v = String(value || "");
  const c = v.startsWith("+") ? C.green : v.startsWith("-") ? C.red : C.text;
  return (
    <div style={{display:"flex",justifyContent:"space-between",
      padding:"4px 0",borderBottom:`1px solid ${C.border}20`,fontSize:11}}>
      <span style={{color:C.sub}}>{label}</span>
      <span style={{color:c,fontFamily:"monospace",fontWeight:600}}>{value||"—"}</span>
    </div>
  );
};

// ── Score Bar ─────────────────────────────────────────────
const ScoreBar = ({score}) => {
  const color = score>=6 ? C.green : score>=4 ? C.yellow : C.red;
  return (
    <div style={{display:"flex",alignItems:"center",gap:4}}>
      {Array.from({length:8}).map((_,i) => (
        <div key={i} style={{width:4,height:12,borderRadius:2,
          background:i<score?color:C.border}} />
      ))}
      <span style={{fontSize:10,color,fontFamily:"monospace",marginLeft:2}}>{score}/8</span>
    </div>
  );
};

// ── Stock Table ───────────────────────────────────────────
const StockTable = ({stocks, onSelect}) => {
  const [sortK, setSortK] = useState("mktcap");
  const [sortD, setSortD] = useState(-1);
  const [search, setSearch] = useState("");

  const filtered = stocks
    .filter(s =>
      s.ticker.includes(search.toUpperCase()) ||
      (s.name||"").toLowerCase().includes(search.toLowerCase()) ||
      (s.sector||"").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a,b) => {
      const av = a[sortK] ?? -Infinity;
      const bv = b[sortK] ?? -Infinity;
      return av > bv ? sortD : -sortD;
    });

  const SH = ({label, k, align="right"}) => (
    <th onClick={()=>{ if(sortK===k) setSortD(d=>-d); else{setSortK(k);setSortD(-1);} }}
      style={{padding:"9px 12px",textAlign:align,fontSize:9,letterSpacing:"1.5px",
        color:sortK===k?C.accent:C.sub,cursor:"pointer",userSelect:"none",
        background:sortK===k?C.bg:"transparent",whiteSpace:"nowrap",fontWeight:400,
        borderBottom:`1px solid ${C.border}`}}>
      {label}{sortK===k?(sortD>0?" ↑":" ↓"):""}
    </th>
  );

  return (
    <div>
      <input value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="Search ticker, name, sector..."
        style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:6,
          color:C.text,padding:"6px 12px",fontSize:11,width:220,outline:"none",
          fontFamily:"monospace",marginBottom:12}}
      />
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead>
            <tr>
              <th style={{width:30,borderBottom:`1px solid ${C.border}`}}/>
              <SH label="TICKER"      k="ticker"     align="left"/>
              <SH label="SECTOR"      k="sector"     align="left"/>
              <SH label="PRICE"       k="price"/>
              <SH label="P/E TTM"     k="pe_ttm"/>
              <SH label="PEG"         k="peg"/>
              <SH label="GROSS MGN"   k="gross_mgn"/>
              <SH label="ROE%"        k="roe"/>
              <SH label="EPS THIS Y"  k="eps_this_y"/>
              <SH label="UPSIDE"      k="upside"/>
              <SH label="SCORE"       k="score"/>
              <th style={{width:40,borderBottom:`1px solid ${C.border}`}}/>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s,i) => {
              const col = sc(s.sector);
              return (
                <tr key={s.ticker} onClick={()=>onSelect(s)}
                  style={{borderBottom:`1px solid ${C.border}`,cursor:"pointer",
                    background:i%2===0?C.bg:"#0f1318",transition:"background .1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.card}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.bg:"#0f1318"}>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{width:6,height:6,borderRadius:"50%",
                      background:col,boxShadow:`0 0 5px ${col}`}}/>
                  </td>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{fontWeight:800,color:C.accent,fontFamily:"monospace"}}>{s.ticker}</div>
                    <div style={{fontSize:9,color:C.sub,marginTop:1,maxWidth:160,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                  </td>
                  <td style={{padding:"10px 12px"}}>
                    <span style={{fontSize:9,color:col,background:`${col}15`,
                      padding:"2px 7px",borderRadius:3}}>{s.sector||"—"}</span>
                  </td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700}}>${fmt(s.price)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",
                    color:s.pe_ttm!=null&&s.pe_ttm<25?C.green:s.pe_ttm>50?C.red:C.text}}>
                    {s.pe_ttm!=null?`${fmt(s.pe_ttm,1)}x`:"—"}
                  </td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",
                    color:s.peg!=null&&s.peg<1?C.green:s.peg>2?C.red:C.text}}>
                    {s.peg!=null?fmt(s.peg,2):"—"}
                  </td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",
                    color:s.gross_mgn!=null&&s.gross_mgn>50?C.green:C.text}}>
                    {s.gross_mgn!=null?`${fmt(s.gross_mgn,1)}%`:"—"}
                  </td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",
                    color:s.roe!=null&&s.roe>15?C.green:s.roe<5?C.red:C.text}}>
                    {s.roe!=null?`${fmt(s.roe,1)}%`:"—"}
                  </td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",
                    color:pColor(s.eps_this_y)}}>
                    {s.eps_this_y!=null?fmtP(s.eps_this_y):"—"}
                  </td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",
                    color:pColor(s.upside)}}>
                    {s.upside!=null?fmtP(s.upside):"—"}
                  </td>
                  <td style={{padding:"10px 12px",textAlign:"right"}}>
                    <ScoreBar score={s.score||0}/>
                  </td>
                  <td style={{padding:"10px 12px",textAlign:"center"}}>
                    <span style={{fontSize:10,color:C.accent,background:`${C.accent}15`,
                      padding:"3px 8px",borderRadius:4,fontFamily:"monospace"}}>→</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Detail View ───────────────────────────────────────────
const DetailView = ({stock, allStocks, history}) => {
  const col = sc(stock.sector);

  // 1Y Price chart
  const hist = history[stock.ticker];
  const histData = hist
    ? hist.dates.map((d,i) => ({date:d, price:hist.close[i]})).filter((_,i)=>i%3===0)
    : [];

  // Sector comparison
  const sectorStocks = allStocks.filter(s => s.sector===stock.sector && s.ticker!==stock.ticker);
  const kpiKeys = ["pe_ttm","ps","pb","gross_mgn","net_mgn","roe","eps_this_y","debt_eq"];
  const kpiLabels = ["P/E","P/S","P/B","Gross%","Net%","ROE%","EPS Yr%","D/E"];
  const cmpData = kpiKeys.map((k,i) => {
    const sectorVals = sectorStocks.map(s=>s[k]).filter(v=>v!=null);
    const avg = sectorVals.length ? sectorVals.reduce((a,b)=>a+b,0)/sectorVals.length : null;
    return {
      name: kpiLabels[i],
      [stock.ticker]: stock[k],
      [`Avg ${stock.sector}`]: avg != null ? parseFloat(avg.toFixed(2)) : null,
    };
  });

  // Score breakdown
  const scoreData = SCORE_CRITERIA.map(c => ({
    name: c.label,
    met: c.check(stock[c.k]) ? 1 : 0,
  }));

  return (
    <div>
      {/* Header */}
      <Card style={{marginBottom:12,borderColor:`${col}50`,display:"flex",
        justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:26,fontWeight:900,color:col,fontFamily:"monospace"}}>{stock.ticker}</div>
          <div style={{fontSize:12,color:C.sub,marginTop:2}}>{stock.name}</div>
          <div style={{marginTop:6,display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:9,color:col,background:`${col}20`,padding:"2px 8px",borderRadius:4}}>{stock.sector}</span>
            <span style={{fontSize:9,color:C.sub}}>{stock.country}</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:28,fontWeight:900,fontFamily:"monospace",color:C.text}}>
            ${fmt(stock.price)}
          </div>
          {stock.upside!=null && (
            <div style={{fontSize:11,color:stock.upside>0?C.green:C.red,marginTop:2}}>
              Target ${fmt(stock.target)}  ({fmtP(stock.upside)})
            </div>
          )}
          {stock.earnings && (
            <div style={{fontSize:10,color:C.sub,marginTop:2}}>Earnings: {stock.earnings}</div>
          )}
        </div>
      </Card>

      {/* KPI Strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:12}}>
        <KPI label="P/E TTM"  value={stock.pe_ttm!=null?`${fmt(stock.pe_ttm,1)}x`:"—"}
             color={stock.pe_ttm!=null&&stock.pe_ttm<25?C.green:C.yellow}/>
        <KPI label="PEG"      value={stock.peg!=null?fmt(stock.peg,2):"—"}
             color={stock.peg!=null&&stock.peg<1?C.green:C.yellow}/>
        <KPI label="ROE"      value={stock.roe!=null?`${fmt(stock.roe,1)}%`:"—"}
             color={stock.roe!=null&&stock.roe>15?C.green:C.red}/>
        <KPI label="EPS GR"   value={stock.eps_this_y!=null?fmtP(stock.eps_this_y):"—"}
             color={pColor(stock.eps_this_y)}/>
        <KPI label="UPSIDE"   value={stock.upside!=null?fmtP(stock.upside):"—"}
             color={pColor(stock.upside)}/>
        <KPI label="SCORE"    value={`${stock.score||0}/8`} color={C.purple}/>
      </div>

      {/* Charts Row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>

        {/* 1Y Price */}
        <Card>
          <Label>{stock.ticker} — 1 YEAR PRICE</Label>
          {histData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={histData} margin={{top:5,right:10,left:-20,bottom:0}}>
                <XAxis dataKey="date" tick={{fill:C.sub,fontSize:8}} tickLine={false} axisLine={false}
                  tickFormatter={d=>d.slice(5)}
                  interval={Math.floor(histData.length/6)}/>
                <YAxis tick={{fill:C.sub,fontSize:8}} tickLine={false} axisLine={false}
                  tickFormatter={v=>`$${v.toFixed(0)}`}/>
                <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,
                  fontFamily:"monospace",fontSize:11}}
                  formatter={v=>[`$${v}`,""]} labelStyle={{color:C.sub}}/>
                <Line type="monotone" dataKey="price" stroke={col} strokeWidth={2} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{color:C.sub,fontSize:11,padding:"20px 0",textAlign:"center"}}>
              Τρέξε python fetch_data.py για να φορτωθεί το ιστορικό
            </div>
          )}
        </Card>

        {/* Score breakdown */}
        <Card>
          <Label>SCORE CRITERIA (8 MAX)</Label>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
            {SCORE_CRITERIA.map(c => {
              const val = stock[c.k];
              const met = val != null && c.check(val);
              return (
                <div key={c.k} style={{display:"flex",alignItems:"center",gap:8,fontSize:11}}>
                  <span style={{color:met?C.green:C.red,fontFamily:"monospace",minWidth:16}}>
                    {met?"✓":"✗"}
                  </span>
                  <span style={{color:met?C.text:C.sub,flex:1}}>{c.label}</span>
                  <span style={{color:C.sub,fontFamily:"monospace",fontSize:10}}>
                    {val!=null?fmt(val,1):"—"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Sector comparison */}
      {sectorStocks.length > 0 && (
        <Card style={{marginBottom:12}}>
          <Label>{stock.ticker} VS AVG {stock.sector.toUpperCase()}</Label>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={cmpData} margin={{top:10,right:20,left:-10,bottom:40}}>
              <XAxis dataKey="name" tick={{fill:C.sub,fontSize:9}} tickLine={false} axisLine={false}
                angle={-30} textAnchor="end"/>
              <YAxis tick={{fill:C.sub,fontSize:9}} tickLine={false} axisLine={false}/>
              <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,
                fontFamily:"monospace",fontSize:11}}/>
              <Legend wrapperStyle={{color:C.sub,fontSize:10,paddingTop:10}}/>
              <Bar dataKey={stock.ticker} fill={col} radius={[3,3,0,0]}/>
              <Bar dataKey={`Avg ${stock.sector}`} fill={C.border2} radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Metrics Grid */}
      <Card style={{marginBottom:12}}>
        <MetricGroup label="💰 VALUATION">
          <MetricCard label="P/E TTM"  value={stock.pe_ttm}  suffix="x" good={v=>v<25}  bad={v=>v>50}/>
          <MetricCard label="P/E Fwd"  value={stock.pe_fwd}  suffix="x" good={v=>v<20}  bad={v=>v>40}/>
          <MetricCard label="PEG"      value={stock.peg}      suffix="x" good={v=>v<1}   bad={v=>v>2}/>
          <MetricCard label="P/S"      value={stock.ps}       suffix="x" good={v=>v<5}   bad={v=>v>20}/>
          <MetricCard label="P/B"      value={stock.pb}       suffix="x" good={v=>v<3}   bad={v=>v>15}/>
          <MetricCard label="P/FCF"    value={stock.pfcf}     suffix="x" good={v=>v<20}  bad={v=>v>60}/>
        </MetricGroup>
        <MetricGroup label="📈 PROFITABILITY">
          <MetricCard label="Gross Mgn" value={stock.gross_mgn} suffix="%" good={v=>v>50} bad={v=>v<20}/>
          <MetricCard label="Oper Mgn"  value={stock.oper_mgn}  suffix="%" good={v=>v>20} bad={v=>v<5}/>
          <MetricCard label="Net Mgn"   value={stock.net_mgn}   suffix="%" good={v=>v>15} bad={v=>v<0}/>
          <MetricCard label="ROE"       value={stock.roe}        suffix="%" good={v=>v>15} bad={v=>v<5}/>
          <MetricCard label="ROA"       value={stock.roa}        suffix="%" good={v=>v>5}  bad={v=>v<0}/>
          <MetricCard label="ROI"       value={stock.roi}        suffix="%" good={v=>v>10} bad={v=>v<0}/>
        </MetricGroup>
        <MetricGroup label="🚀 GROWTH">
          <MetricCard label="EPS This Y" value={stock.eps_this_y} suffix="%" good={v=>v>20} bad={v=>v<0}/>
          <MetricCard label="EPS Next Y" value={stock.eps_next_y} suffix="%" good={v=>v>15} bad={v=>v<0}/>
          <MetricCard label="EPS Next Q" value={stock.eps_next_q} suffix="%" good={v=>v>10} bad={v=>v<0}/>
          <MetricCard label="EPS 5Y"     value={stock.eps_5y}     suffix="%" good={v=>v>15} bad={v=>v<5}/>
          <MetricCard label="Sales 5Y"   value={stock.sales_5y}   suffix="%" good={v=>v>15} bad={v=>v<5}/>
        </MetricGroup>
        <MetricGroup label="📉 LEVERAGE">
          <MetricCard label="Debt/Eq"   value={stock.debt_eq}   suffix="x" good={v=>v<0.5} bad={v=>v>2}/>
          <MetricCard label="Current R" value={stock.current_r} suffix="x" good={v=>v>2}   bad={v=>v<1}/>
          <MetricCard label="RSI(14)"   value={stock.rsi}       suffix=""  good={v=>v>40&&v<55} bad={v=>v>70||v<30}/>
          <MetricCard label="Div Yield" value={stock.div_yield} suffix="%" good={v=>v>2}   bad={()=>false}/>
        </MetricGroup>
      </Card>

      {/* Bottom */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Card>
          <Label>PER SHARE</Label>
          <SideRow label="EPS TTM"  value={stock.eps_ttm!=null?`$${fmt(stock.eps_ttm)}`:null}/>
          <SideRow label="EPS Fwd"  value={stock.eps_fwd!=null?`$${fmt(stock.eps_fwd)}`:null}/>
          <SideRow label="Book/sh"  value={stock.booksh!=null?`$${fmt(stock.booksh)}`:null}/>
          <SideRow label="52W High" value={stock.high52!=null?`$${fmt(stock.high52)}`:null}/>
          <SideRow label="52W Low"  value={stock.low52!=null?`$${fmt(stock.low52)}`:null}/>
          <SideRow label="Beta"     value={stock.beta}/>
          <SideRow label="Mkt Cap"  value={fmtM(stock.mktcap)}/>
        </Card>
        <Card>
          <Label>OWNERSHIP & PERFORMANCE</Label>
          <SideRow label="Insider Own"  value={stock.insider_own}/>
          <SideRow label="Inst Own"     value={stock.inst_own}/>
          <SideRow label="Short Float"  value={stock.short_float}/>
          <SideRow label="Perf Week"    value={stock.perf_week}/>
          <SideRow label="Perf Month"   value={stock.perf_month}/>
          <SideRow label="Perf YTD"     value={stock.perf_ytd}/>
          <SideRow label="Recom"        value={stock.recom}/>
        </Card>
      </div>
    </div>
  );
};

// ── Sector Averages ───────────────────────────────────────
const SectorView = ({stocks}) => {
  const sectors = [...new Set(stocks.map(s=>s.sector).filter(Boolean))];
  const kpis = [
    {k:"pe_ttm",label:"P/E TTM"},{k:"ps",label:"P/S"},
    {k:"gross_mgn",label:"Gross%"},{k:"net_mgn",label:"Net%"},
    {k:"roe",label:"ROE%"},{k:"eps_this_y",label:"EPS Yr%"},
    {k:"eps_next_y",label:"EPS Nx%"},{k:"debt_eq",label:"D/Eq"},
  ];
  const rows = sectors.map(sec => {
    const ss = stocks.filter(s=>s.sector===sec);
    const row = {sector:sec, count:ss.length};
    kpis.forEach(({k,label}) => {
      const vals = ss.map(s=>s[k]).filter(v=>v!=null);
      row[label] = vals.length ? parseFloat((vals.reduce((a,b)=>a+b)/vals.length).toFixed(1)) : null;
    });
    return row;
  }).sort((a,b)=>(b["ROE%"]||0)-(a["ROE%"]||0));

  const roeData = rows.map(r=>({name:r.sector, value:r["ROE%"]})).filter(r=>r.value!=null);
  const mgnData = rows.map(r=>({name:r.sector, value:r["Gross%"]})).filter(r=>r.value!=null);

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <Card>
          <Label>AVG ROE% BY SECTOR</Label>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={roeData} margin={{top:10,right:10,left:-20,bottom:60}}>
              <XAxis dataKey="name" tick={{fill:C.sub,fontSize:8}} tickLine={false} axisLine={false}
                angle={-35} textAnchor="end"/>
              <YAxis tick={{fill:C.sub,fontSize:8}} tickLine={false} axisLine={false}/>
              <ReferenceLine y={15} stroke={C.green} strokeDasharray="3 3" opacity={0.6}/>
              <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,
                fontFamily:"monospace",fontSize:11}} formatter={v=>[`${v}%`,""]}/>
              <Bar dataKey="value" radius={[3,3,0,0]}
                fill={C.purple}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <Label>AVG GROSS MARGIN% BY SECTOR</Label>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={mgnData} margin={{top:10,right:10,left:-20,bottom:60}}>
              <XAxis dataKey="name" tick={{fill:C.sub,fontSize:8}} tickLine={false} axisLine={false}
                angle={-35} textAnchor="end"/>
              <YAxis tick={{fill:C.sub,fontSize:8}} tickLine={false} axisLine={false}/>
              <ReferenceLine y={40} stroke={C.yellow} strokeDasharray="3 3" opacity={0.6}/>
              <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,
                fontFamily:"monospace",fontSize:11}} formatter={v=>[`${v}%`,""]}/>
              <Bar dataKey="value" radius={[3,3,0,0]} fill={C.cyan}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <Label>ΜΕΣΟΙ ΟΡΟΙ ΑΝΑ ΚΛΑΔΟ</Label>
        <div style={{overflowX:"auto",marginTop:8}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead>
              <tr>
                {["Sector","#",..."P/E TTM,P/S,Gross%,Net%,ROE%,EPS Yr%,EPS Nx%,D/Eq".split(",")].map(h=>(
                  <th key={h} style={{padding:"8px 12px",textAlign:h==="Sector"?"left":"right",
                    fontSize:9,color:C.sub,letterSpacing:"1.5px",fontWeight:400,
                    borderBottom:`1px solid ${C.border}`}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row,i) => (
                <tr key={row.sector} style={{borderBottom:`1px solid ${C.border}`,
                  background:i%2===0?C.bg:"#0f1318"}}>
                  <td style={{padding:"9px 12px",textAlign:"left"}}>
                    <span style={{color:sc(row.sector),fontFamily:"monospace",fontWeight:700}}>
                      {row.sector}
                    </span>
                  </td>
                  <td style={{padding:"9px 12px",textAlign:"right",color:C.sub}}>{row.count}</td>
                  {kpis.map(({label}) => {
                    const v = row[label];
                    const isGood = label==="ROE%"&&v>15||label==="Gross%"&&v>40||
                                   label==="EPS Yr%"&&v>20||label==="EPS Nx%"&&v>15;
                    const isBad  = (label==="ROE%"||label==="Net%")&&v<0||label==="D/Eq"&&v>2;
                    return (
                      <td key={label} style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",
                        color:isGood?C.green:isBad?C.red:C.text}}>
                        {v!=null?v:"—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const [data, setData]       = useState(null);
  const [tab, setTab]         = useState("watch");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetch("/data.json?t="+Date.now())
      .then(r => {
        if (!r.ok) throw new Error("data.json not found");
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { loadData(); }, []);

  const allStocks = data ? [...(data.watch||[]), ...(data.growth||[])]
    .filter((s,i,a)=>a.findIndex(x=>x.ticker===s.ticker)===i) : [];

  const handleSelect = (stock) => {
    setSelected(stock);
    setTab("detail");
  };

  const tabs = [
    {id:"watch",   label:"⭐ WATCHLIST",         color:C.cyan},
    {id:"growth",  label:"🚀 GROWTH CANDIDATES", color:C.green},
    {id:"sectors", label:"📊 SECTOR AVERAGES",   color:C.purple},
    {id:"detail",  label:"📋 ΑΝΑΛΥΣΗ ΜΕΤΟΧΗΣ",  color:C.yellow},
  ];

  return (
    <div style={{backgroundColor:C.bg,minHeight:"100vh",
      fontFamily:"'JetBrains Mono','Courier New',monospace",color:C.text}}>

      {/* Header */}
      <div style={{borderBottom:`1px solid ${C.border}`,padding:"12px 24px",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        position:"sticky",top:0,backgroundColor:C.bg,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:8,height:8,borderRadius:"50%",backgroundColor:C.cyan,
            boxShadow:`0 0 8px ${C.cyan}`,animation:"pulse 2s infinite"}}/>
          <span style={{fontSize:12,color:C.sub,letterSpacing:"3px"}}>STOCK SCREENER</span>
          {data && <span style={{fontSize:9,color:C.dim,marginLeft:8}}>Updated: {data.updated}</span>}
        </div>
        <button onClick={loadData} disabled={loading}
          style={{backgroundColor:C.accent,border:"none",color:"white",borderRadius:6,
            padding:"7px 16px",cursor:"pointer",fontSize:11,fontWeight:700,
            opacity:loading?0.6:1}}>
          {loading ? "⟳ Loading..." : "⟳  REFRESH"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{background:"none",border:"none",
              borderBottom:`2px solid ${tab===t.id?t.color:"transparent"}`,
              color:tab===t.id?t.color:C.sub,padding:"10px 20px",fontSize:10,
              letterSpacing:"1.5px",cursor:"pointer",fontFamily:"inherit",
              backgroundColor:tab===t.id?C.card:"transparent",
              transition:"all .15s"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{padding:"20px 24px"}}>
        {error && (
          <div style={{backgroundColor:"#2e0d0d",border:`1px solid ${C.red}`,
            borderRadius:8,padding:"16px 20px",marginBottom:16,color:C.red}}>
            ⚠️ {error} — Τρέξε <code>python fetch_data.py</code> πρώτα!
          </div>
        )}

        {!data && !loading && !error && (
          <div style={{textAlign:"center",padding:60,color:C.sub}}>
            Τρέξε <code style={{color:C.accent}}>python fetch_data.py</code> και μετά πάτα REFRESH
          </div>
        )}

        {data && tab==="watch" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
              <KPI label="ΜΕΤΟΧΕΣ"   value={String(data.watch?.length||0)} color={C.cyan}/>
              <KPI label="AVG P/E"
                value={data.watch?.length ? fmt(data.watch.reduce((s,x)=>s+(x.pe_ttm||0),0)/data.watch.filter(x=>x.pe_ttm).length,1)+"x" : "—"}
                color={C.yellow}/>
              <KPI label="AVG EPS GR"
                value={data.watch?.length ? fmtP(data.watch.reduce((s,x)=>s+(x.eps_this_y||0),0)/data.watch.filter(x=>x.eps_this_y).length) : "—"}
                color={C.green}/>
              <KPI label="AVG SCORE"
                value={data.watch?.length ? fmt(data.watch.reduce((s,x)=>s+(x.score||0),0)/data.watch.length,1)+"/8" : "—"}
                color={C.purple}/>
              <KPI label="UPSIDE > 0"
                value={String(data.watch?.filter(x=>x.upside>0).length||0)}
                color={C.green} sub={`από ${data.watch?.length||0}`}/>
            </div>
            <Card>
              <div style={{fontSize:9,color:C.sub,letterSpacing:"1.5px",marginBottom:12}}>
                ⭐ WATCHLIST — κλικ σε μετοχή για αναλυτική ανάλυση
              </div>
              <StockTable stocks={data.watch||[]} onSelect={handleSelect}/>
            </Card>
          </div>
        )}

        {data && tab==="growth" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
              <KPI label="ΒΡΕΘΗΚΑΝ"      value={String(data.growth?.length||0)} color={C.green}/>
              <KPI label="SCORE ≥ 6"     value={String(data.growth?.filter(x=>x.score>=6).length||0)} color={C.cyan}/>
              <KPI label="AVG GROSS MGN"
                value={data.growth?.length ? fmt(data.growth.reduce((s,x)=>s+(x.gross_mgn||0),0)/data.growth.filter(x=>x.gross_mgn).length,1)+"%" : "—"}
                color={C.yellow}/>
              <KPI label="AVG EPS NXT Y"
                value={data.growth?.length ? fmtP(data.growth.reduce((s,x)=>s+(x.eps_next_y||0),0)/data.growth.filter(x=>x.eps_next_y).length) : "—"}
                color={C.purple}/>
              <KPI label="AVG UPSIDE"
                value={data.growth?.filter(x=>x.upside!=null).length ?
                  fmtP(data.growth.filter(x=>x.upside!=null).reduce((s,x)=>s+x.upside,0)/data.growth.filter(x=>x.upside!=null).length) : "—"}
                color={C.green}/>
            </div>
            <Card>
              <div style={{fontSize:9,color:C.sub,letterSpacing:"1.5px",marginBottom:12}}>
                🚀 GROWTH CANDIDATES — κλικ για ανάλυση
              </div>
              <StockTable stocks={data.growth||[]} onSelect={handleSelect}/>
            </Card>
          </div>
        )}

        {data && tab==="sectors" && (
          <SectorView stocks={allStocks}/>
        )}

        {data && tab==="detail" && selected && (
          <DetailView stock={selected} allStocks={allStocks} history={data.history||{}}/>
        )}

        {data && tab==="detail" && !selected && (
          <div style={{textAlign:"center",padding:60,color:C.sub}}>
            Κλικ σε μετοχή από Watchlist ή Growth Candidates
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #0d1117; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:#0d1117; }
        ::-webkit-scrollbar-thumb { background:#30363d; border-radius:3px; }
        button:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}
