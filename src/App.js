import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  BarChart, Bar, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

// ── Mobile detection hook ────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return isMobile;
};

const SCORE_CRITERIA = [
  {k:"gross_mgn", label:"Gross Margin > 40%", check: v => v > 40},
  {k:"roe",       label:"ROE > 15%",          check: v => v > 15},
  {k:"eps_this_y",label:"EPS This Y > 20%",   check: v => v > 20},
  {k:"eps_next_y",label:"EPS Next Y > 15%",   check: v => v > 15},
  {k:"debt_eq",   label:"Debt/Eq < 1",        check: v => v >= 0 && v < 1},
  {k:"current_r", label:"Current R > 1.5",    check: v => v > 1.5},
  {k:"peg",       label:"PEG < 2",            check: v => v > 0 && v < 2},
  {k:"rsi",       label:"RSI 30–65",          check: v => v > 30 && v < 65},
];

const SECTOR_GRADIENT = {
  Semiconductors: ["#7c3aed","#a78bfa"],
  Software:       ["#065f46","#34d399"],
  Technology:     ["#1e40af","#60a5fa"],
  Cybersecurity:  ["#701a75","#e879f9"],
  Fintech:        ["#9d174d","#f472b6"],
  Energy:         ["#14532d","#4ade80"],
  Healthcare:     ["#0c4a6e","#38bdf8"],
  Consumer:       ["#7c2d12","#fb923c"],
  Communication:  ["#78350f","#fbbf24"],
  Industrials:    ["#134e4a","#6ee7b7"],
};
const sc  = s => (SECTOR_GRADIENT[s] || ["#374151","#9ca3af"])[1];
const sc0 = s => (SECTOR_GRADIENT[s] || ["#374151","#9ca3af"])[0];

const fmt   = (v, d=2) => v != null ? Number(v).toFixed(d) : "—";
const fmtP  = v => v != null ? `${v>0?"+":""}${Number(v).toFixed(1)}%` : "—";
const fmtM  = v => {
  if (!v) return "—";
  if (v>=1000000) return `$${(v/1000000).toFixed(2)}T`;
  if (v>=1000)    return `$${(v/1000).toFixed(1)}B`;
  return `$${v.toFixed(0)}M`;
};
const pColor = v => v == null ? "rgba(255,255,255,0.7)" : v > 0 ? "#6ee7b7" : v < 0 ? "#fca5a5" : "rgba(255,255,255,0.7)";

const G = {
  bg:      "linear-gradient(135deg, #0f0c29 0%, #1a1a3e 50%, #0d1b4b 100%)",
  glass:   "rgba(255,255,255,0.06)",
  glassMd: "rgba(255,255,255,0.1)",
  border:  "rgba(255,255,255,0.12)",
  borderHi:"rgba(255,255,255,0.25)",
  text:    "rgba(255,255,255,0.92)",
  sub:     "rgba(255,255,255,0.5)",
  dim:     "rgba(255,255,255,0.3)",
  green:   "#6ee7b7",
  red:     "#fca5a5",
  yellow:  "#fcd34d",
  blue:    "#93c5fd",
  purple:  "#c4b5fd",
};

const glassCard = (extra={}) => ({
  background: G.glass,
  border: `1px solid ${G.border}`,
  borderRadius: 16,
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  padding: 16,
  ...extra,
});

const GlassCard = ({children, style={}}) => (
  <div style={{...glassCard(), ...style}}>{children}</div>
);

const KPI = ({label, value, color=G.text, sub}) => (
  <div style={{...glassCard(), textAlign:"center", padding:"12px 8px"}}>
    <div style={{fontSize:8,color:G.sub,letterSpacing:"1.5px",marginBottom:4,textTransform:"uppercase"}}>{label}</div>
    <div style={{fontSize:18,fontWeight:700,color,fontFamily:"monospace"}}>{value}</div>
    {sub && <div style={{fontSize:8,color:G.dim,marginTop:2}}>{sub}</div>}
  </div>
);

const MetricCard = ({label, value, suffix="", good, bad}) => {
  const n = value != null ? parseFloat(value) : null;
  const isGood = n != null && good && good(n);
  const isBad  = n != null && bad  && bad(n);
  const color  = isGood ? G.green : isBad ? G.red : G.text;
  const disp   = n != null ? `${fmt(n, n>100?0:n>10?1:2)}${suffix}` : "—";
  return (
    <div style={{
      background: isGood ? "rgba(110,231,183,0.08)" : isBad ? "rgba(252,165,165,0.08)" : "rgba(255,255,255,0.04)",
      border: `1px solid ${isGood ? "rgba(110,231,183,0.25)" : isBad ? "rgba(252,165,165,0.25)" : G.border}`,
      borderRadius: 10, padding: "9px 8px",
    }}>
      <div style={{fontSize:7,color:G.sub,letterSpacing:"0.5px",marginBottom:3,textTransform:"uppercase"}}>{label}</div>
      <div style={{fontSize:12,fontWeight:700,color,fontFamily:"monospace"}}>{disp}</div>
      {isGood && <div style={{fontSize:7,color:G.green,marginTop:1}}>▲</div>}
      {isBad  && <div style={{fontSize:7,color:G.red,  marginTop:1}}>▼</div>}
    </div>
  );
};

const MetricGroup = ({label, children, cols=6}) => (
  <div style={{marginBottom:14}}>
    <div style={{fontSize:9,color:G.sub,letterSpacing:"1.5px",marginBottom:8,textTransform:"uppercase",
      borderBottom:`1px solid ${G.border}`,paddingBottom:6}}>{label}</div>
    <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:5}}>{children}</div>
  </div>
);

const SideRow = ({label, value}) => {
  const v = String(value || "");
  const c = v.startsWith("+") ? G.green : v.startsWith("-") ? G.red : G.text;
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
      padding:"5px 0",borderBottom:`1px solid ${G.border}`,fontSize:11}}>
      <span style={{color:G.sub,fontSize:10}}>{label}</span>
      <span style={{color:c,fontFamily:"monospace",fontWeight:600,fontSize:11}}>{value||"—"}</span>
    </div>
  );
};

const ScoreBar = ({score, compact=false}) => {
  const color = score>=6 ? G.green : score>=4 ? G.yellow : G.red;
  return (
    <div style={{display:"flex",alignItems:"center",gap:compact?2:3}}>
      {Array.from({length:8}).map((_,i) => (
        <div key={i} style={{
          width:compact?4:5, height:compact?10:13, borderRadius:3,
          background:i<score?color:"rgba(255,255,255,0.1)",
          boxShadow:i<score?`0 0 6px ${color}40`:undefined,
        }} />
      ))}
      <span style={{fontSize:compact?9:10,color,fontFamily:"monospace",marginLeft:compact?2:3}}>{score}/8</span>
    </div>
  );
};

const SectorPill = ({sector, small=false}) => (
  <span style={{
    fontSize:small?8:9, padding:small?"1px 6px":"2px 8px", borderRadius:20,
    background:`${sc0(sector)}50`,
    border:`1px solid ${sc(sector)}50`,
    color:sc(sector), whiteSpace:"nowrap",
  }}>{sector||"—"}</span>
);

// ── Mobile Stock Card ─────────────────────────────────────
const MobileStockCard = ({stock, onSelect}) => {
  const col = sc(stock.sector);
  const score = stock.score || 0;
  return (
    <div onClick={() => onSelect(stock)} style={{
      ...glassCard({padding:"14px"}),
      marginBottom:10, cursor:"pointer",
      borderLeft:`3px solid ${col}`,
      transition:"all .2s",
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div>
          <div style={{fontWeight:800,color:"#93c5fd",fontFamily:"monospace",fontSize:16}}>{stock.ticker}</div>
          <div style={{fontSize:10,color:G.sub,marginTop:1}}>{stock.name}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:16,fontWeight:700,fontFamily:"monospace",color:G.text}}>${fmt(stock.price)}</div>
          {stock.upside!=null && (
            <div style={{fontSize:11,color:pColor(stock.upside),fontFamily:"monospace"}}>{fmtP(stock.upside)}</div>
          )}
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <SectorPill sector={stock.sector} small/>
        <div style={{display:"flex",gap:12,fontSize:10,fontFamily:"monospace"}}>
          <span style={{color:G.sub}}>P/E <span style={{color:stock.pe_ttm<25?G.green:G.text}}>{stock.pe_ttm!=null?`${fmt(stock.pe_ttm,1)}x`:"—"}</span></span>
          <span style={{color:G.sub}}>ROE <span style={{color:stock.roe>15?G.green:G.text}}>{stock.roe!=null?`${fmt(stock.roe,1)}%`:"—"}</span></span>
          <span style={{color:G.sub}}>EPS <span style={{color:pColor(stock.eps_this_y)}}>{stock.eps_this_y!=null?fmtP(stock.eps_this_y):"—"}</span></span>
        </div>
      </div>
      <div style={{marginTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <ScoreBar score={score} compact/>
        <span style={{fontSize:9,color:"#93c5fd",background:"rgba(147,197,253,0.1)",
          border:"1px solid rgba(147,197,253,0.2)",padding:"2px 8px",borderRadius:20}}>
          Ανάλυση →
        </span>
      </div>
    </div>
  );
};

// ── Desktop Stock Table ───────────────────────────────────
const DesktopTable = ({stocks, onSelect}) => {
  const [sortK, setSortK] = useState("mktcap");
  const [sortD, setSortD] = useState(-1);
  const [search, setSearch] = useState("");
  const [hovered, setHovered] = useState(null);

  const filtered = stocks
    .filter(s =>
      s.ticker.includes(search.toUpperCase()) ||
      (s.name||"").toLowerCase().includes(search.toLowerCase()) ||
      (s.sector||"").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a,b) => ((a[sortK]??-Infinity)>(b[sortK]??-Infinity)?sortD:-sortD));

  const SH = ({label,k,align="right"}) => (
    <th onClick={()=>{ sortK===k?setSortD(d=>-d):(setSortK(k),setSortD(-1)); }}
      style={{padding:"9px 12px",textAlign:align,fontSize:9,letterSpacing:"1.5px",
        color:sortK===k?"#93c5fd":G.sub,cursor:"pointer",userSelect:"none",
        background:sortK===k?"rgba(147,197,253,0.05)":"transparent",
        whiteSpace:"nowrap",fontWeight:400,borderBottom:`1px solid ${G.border}`}}>
      {label}{sortK===k?(sortD>0?" ↑":" ↓"):""}
    </th>
  );

  return (
    <div>
      <input value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="Search ticker, name, sector..."
        style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${G.border}`,
          borderRadius:30,color:G.text,padding:"7px 16px",fontSize:11,
          width:220,outline:"none",fontFamily:"monospace",marginBottom:14,
          backdropFilter:"blur(10px)"}}
      />
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead>
            <tr>
              <th style={{width:30,borderBottom:`1px solid ${G.border}`}}/>
              <SH label="TICKER"     k="ticker"     align="left"/>
              <SH label="SECTOR"     k="sector"     align="left"/>
              <SH label="PRICE"      k="price"/>
              <SH label="P/E TTM"    k="pe_ttm"/>
              <SH label="PEG"        k="peg"/>
              <SH label="GROSS MGN"  k="gross_mgn"/>
              <SH label="ROE%"       k="roe"/>
              <SH label="EPS THIS Y" k="eps_this_y"/>
              <SH label="UPSIDE"     k="upside"/>
              <SH label="SCORE"      k="score"/>
              <th style={{width:40,borderBottom:`1px solid ${G.border}`}}/>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s,i) => {
              const col=sc(s.sector);
              const isHov=hovered===s.ticker;
              return (
                <tr key={s.ticker} onClick={()=>onSelect(s)}
                  onMouseEnter={()=>setHovered(s.ticker)}
                  onMouseLeave={()=>setHovered(null)}
                  style={{borderBottom:`1px solid ${G.border}`,cursor:"pointer",
                    background:isHov?"rgba(255,255,255,0.06)":"transparent",
                    transition:"background .15s"}}>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:col,boxShadow:`0 0 8px ${col}`}}/>
                  </td>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{fontWeight:800,color:"#93c5fd",fontFamily:"monospace"}}>{s.ticker}</div>
                    <div style={{fontSize:9,color:G.sub,marginTop:1,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                  </td>
                  <td style={{padding:"10px 12px"}}><SectorPill sector={s.sector}/></td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,color:G.text}}>${fmt(s.price)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",color:s.pe_ttm!=null&&s.pe_ttm<25?G.green:s.pe_ttm>50?G.red:G.text}}>{s.pe_ttm!=null?`${fmt(s.pe_ttm,1)}x`:"—"}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",color:s.peg!=null&&s.peg<1?G.green:s.peg>2?G.red:G.text}}>{s.peg!=null?fmt(s.peg,2):"—"}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",color:s.gross_mgn!=null&&s.gross_mgn>50?G.green:G.text}}>{s.gross_mgn!=null?`${fmt(s.gross_mgn,1)}%`:"—"}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",color:s.roe!=null&&s.roe>15?G.green:s.roe<5?G.red:G.text}}>{s.roe!=null?`${fmt(s.roe,1)}%`:"—"}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",color:pColor(s.eps_this_y)}}>{s.eps_this_y!=null?fmtP(s.eps_this_y):"—"}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",color:pColor(s.upside)}}>{s.upside!=null?fmtP(s.upside):"—"}</td>
                  <td style={{padding:"10px 12px",textAlign:"right"}}><ScoreBar score={s.score||0}/></td>
                  <td style={{padding:"10px 12px",textAlign:"center"}}>
                    <span style={{fontSize:12,color:"#93c5fd",background:"rgba(147,197,253,0.1)",border:"1px solid rgba(147,197,253,0.2)",padding:"3px 8px",borderRadius:20}}>→</span>
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

// ── Stock List (auto mobile/desktop) ─────────────────────
const StockList = ({stocks, onSelect, isMobile}) => {
  const [search, setSearch] = useState("");
  const filtered = stocks.filter(s =>
    s.ticker.includes(search.toUpperCase()) ||
    (s.name||"").toLowerCase().includes(search.toLowerCase()) ||
    (s.sector||"").toLowerCase().includes(search.toLowerCase())
  );

  if (isMobile) return (
    <div>
      <input value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="Search..."
        style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${G.border}`,
          borderRadius:30,color:G.text,padding:"8px 16px",fontSize:12,
          width:"100%",outline:"none",fontFamily:"monospace",marginBottom:14,
          backdropFilter:"blur(10px)"}}
      />
      {filtered.map(s => <MobileStockCard key={s.ticker} stock={s} onSelect={onSelect}/>)}
    </div>
  );

  return <DesktopTable stocks={stocks} onSelect={onSelect}/>;
};

// ── Detail View ───────────────────────────────────────────
const DetailView = ({stock, allStocks, history, isMobile}) => {
  const col  = sc(stock.sector);
  const col0 = sc0(stock.sector);
  const hist = history[stock.ticker];
  const histData = hist
    ? hist.dates.map((d,i)=>({date:d,price:hist.close[i]})).filter((_,i)=>i%3===0)
    : [];

  const sectorStocks = allStocks.filter(s=>s.sector===stock.sector&&s.ticker!==stock.ticker);
  const kpiKeys   = ["pe_ttm","ps","pb","gross_mgn","net_mgn","roe","eps_this_y","debt_eq"];
  const kpiLabels = ["P/E","P/S","P/B","Gross%","Net%","ROE%","EPS%","D/E"];
  const cmpData = kpiKeys.map((k,i)=>{
    const sVals=sectorStocks.map(s=>s[k]).filter(v=>v!=null);
    const avg=sVals.length?sVals.reduce((a,b)=>a+b)/sVals.length:null;
    return {name:kpiLabels[i],[stock.ticker]:stock[k],[`Avg`]:avg!=null?parseFloat(avg.toFixed(2)):null};
  });

  const up = stock.upside;
  const ttStyle = {background:"rgba(15,12,41,0.95)",border:`1px solid ${G.border}`,
    borderRadius:10,fontFamily:"monospace",fontSize:11,backdropFilter:"blur(20px)"};
  const metricCols = isMobile ? 3 : 6;

  return (
    <div>
      {/* Header */}
      <GlassCard style={{marginBottom:12,borderColor:`${col}40`,
        background:`linear-gradient(135deg, ${col0}20, rgba(255,255,255,0.04))`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:isMobile?22:28,fontWeight:900,color:col,fontFamily:"monospace",
              textShadow:`0 0 30px ${col}60`}}>{stock.ticker}</div>
            <div style={{fontSize:isMobile?10:12,color:G.sub,marginTop:2}}>{stock.name}</div>
            <div style={{marginTop:6,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <SectorPill sector={stock.sector} small={isMobile}/>
              <span style={{fontSize:9,color:G.dim}}>{stock.country}</span>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:isMobile?22:28,fontWeight:900,fontFamily:"monospace",color:G.text}}>
              ${fmt(stock.price)}
            </div>
            {up!=null&&(
              <div style={{fontSize:10,color:up>0?G.green:G.red,marginTop:2}}>
                {isMobile?`${fmtP(up)}`:`Target $${fmt(stock.target)}  (${fmtP(up)})`}
              </div>
            )}
            {stock.earnings&&!isMobile&&(
              <div style={{fontSize:10,color:G.dim,marginTop:2}}>Earnings: {stock.earnings}</div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* KPI Strip */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(3,1fr)":"repeat(6,1fr)",
        gap:8,marginBottom:12}}>
        <KPI label="P/E TTM"  value={stock.pe_ttm!=null?`${fmt(stock.pe_ttm,1)}x`:"—"}
             color={stock.pe_ttm!=null&&stock.pe_ttm<25?G.green:G.yellow}/>
        <KPI label="PEG"      value={stock.peg!=null?fmt(stock.peg,2):"—"}
             color={stock.peg!=null&&stock.peg<1?G.green:G.yellow}/>
        <KPI label="ROE"      value={stock.roe!=null?`${fmt(stock.roe,1)}%`:"—"}
             color={stock.roe!=null&&stock.roe>15?G.green:G.red}/>
        <KPI label="EPS GR"   value={stock.eps_this_y!=null?fmtP(stock.eps_this_y):"—"}
             color={pColor(stock.eps_this_y)}/>
        <KPI label="UPSIDE"   value={up!=null?fmtP(up):"—"} color={pColor(up)}/>
        <KPI label="SCORE"    value={`${stock.score||0}/8`} color={G.purple}/>
      </div>

      {/* Charts */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",
        gap:12,marginBottom:12}}>
        <GlassCard>
          <div style={{fontSize:9,color:G.sub,letterSpacing:"2px",marginBottom:10,textTransform:"uppercase"}}>
            {stock.ticker} — 1 Year
          </div>
          {histData.length>0?(
            <ResponsiveContainer width="100%" height={isMobile?160:180}>
              <LineChart data={histData} margin={{top:5,right:10,left:-25,bottom:0}}>
                <XAxis dataKey="date" tick={{fill:G.sub,fontSize:8}} tickLine={false} axisLine={false}
                  tickFormatter={d=>d.slice(5)} interval={Math.floor(histData.length/5)}/>
                <YAxis tick={{fill:G.sub,fontSize:8}} tickLine={false} axisLine={false}
                  tickFormatter={v=>`$${v.toFixed(0)}`}/>
                <Tooltip contentStyle={ttStyle}/>
                <Line type="monotone" dataKey="price" stroke={col} strokeWidth={2}
                  dot={false} activeDot={{r:4,fill:col}}/>
              </LineChart>
            </ResponsiveContainer>
          ):(
            <div style={{color:G.sub,fontSize:11,padding:"20px 0",textAlign:"center"}}>
              Τρέξε python fetch_data.py
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div style={{fontSize:9,color:G.sub,letterSpacing:"2px",marginBottom:10,textTransform:"uppercase"}}>
            Score Criteria
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:isMobile?5:7}}>
            {SCORE_CRITERIA.map(c=>{
              const val=stock[c.k];
              const met=val!=null&&c.check(val);
              return (
                <div key={c.k} style={{display:"flex",alignItems:"center",gap:8,fontSize:isMobile?10:11}}>
                  <span style={{color:met?G.green:G.red,minWidth:16,fontFamily:"monospace",
                    textShadow:met?`0 0 8px ${G.green}`:undefined}}>{met?"✓":"✗"}</span>
                  <span style={{color:met?G.text:G.sub,flex:1,fontSize:isMobile?9:11}}>{c.label}</span>
                  <span style={{color:G.dim,fontFamily:"monospace",fontSize:9}}>
                    {val!=null?fmt(val,1):"—"}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Sector comparison */}
      {sectorStocks.length>0&&(
        <GlassCard style={{marginBottom:12}}>
          <div style={{fontSize:9,color:G.sub,letterSpacing:"2px",marginBottom:10,textTransform:"uppercase"}}>
            {stock.ticker} vs Avg {stock.sector}
          </div>
          <ResponsiveContainer width="100%" height={isMobile?180:220}>
            <BarChart data={cmpData} margin={{top:5,right:10,left:-15,bottom:isMobile?50:40}}>
              <XAxis dataKey="name" tick={{fill:G.sub,fontSize:isMobile?7:9}} tickLine={false} axisLine={false}
                angle={isMobile?-40:0} textAnchor={isMobile?"end":"middle"}/>
              <YAxis tick={{fill:G.sub,fontSize:8}} tickLine={false} axisLine={false}/>
              <Tooltip contentStyle={ttStyle}/>
              <Legend wrapperStyle={{color:G.sub,fontSize:9}}/>
              <Bar dataKey={stock.ticker} fill={col} radius={[4,4,0,0]} opacity={0.85}/>
              <Bar dataKey="Avg" fill="rgba(255,255,255,0.2)" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {/* Metrics */}
      <GlassCard style={{marginBottom:12}}>
        <MetricGroup label="Valuation" cols={metricCols}>
          <MetricCard label="P/E TTM"  value={stock.pe_ttm}  suffix="x" good={v=>v<25}  bad={v=>v>50}/>
          <MetricCard label="P/E Fwd"  value={stock.pe_fwd}  suffix="x" good={v=>v<20}  bad={v=>v>40}/>
          <MetricCard label="PEG"      value={stock.peg}      suffix="x" good={v=>v<1}   bad={v=>v>2}/>
          <MetricCard label="P/S"      value={stock.ps}       suffix="x" good={v=>v<5}   bad={v=>v>20}/>
          <MetricCard label="P/B"      value={stock.pb}       suffix="x" good={v=>v<3}   bad={v=>v>15}/>
          <MetricCard label="P/FCF"    value={stock.pfcf}     suffix="x" good={v=>v<20}  bad={v=>v>60}/>
        </MetricGroup>
        <MetricGroup label="Profitability" cols={metricCols}>
          <MetricCard label="Gross Mgn" value={stock.gross_mgn} suffix="%" good={v=>v>50} bad={v=>v<20}/>
          <MetricCard label="Oper Mgn"  value={stock.oper_mgn}  suffix="%" good={v=>v>20} bad={v=>v<5}/>
          <MetricCard label="Net Mgn"   value={stock.net_mgn}   suffix="%" good={v=>v>15} bad={v=>v<0}/>
          <MetricCard label="ROE"       value={stock.roe}        suffix="%" good={v=>v>15} bad={v=>v<5}/>
          <MetricCard label="ROA"       value={stock.roa}        suffix="%" good={v=>v>5}  bad={v=>v<0}/>
          <MetricCard label="ROI"       value={stock.roi}        suffix="%" good={v=>v>10} bad={v=>v<0}/>
        </MetricGroup>
        <MetricGroup label="Growth" cols={metricCols}>
          <MetricCard label="EPS This Y" value={stock.eps_this_y} suffix="%" good={v=>v>20} bad={v=>v<0}/>
          <MetricCard label="EPS Next Y" value={stock.eps_next_y} suffix="%" good={v=>v>15} bad={v=>v<0}/>
          <MetricCard label="EPS Next Q" value={stock.eps_next_q} suffix="%" good={v=>v>10} bad={v=>v<0}/>
          <MetricCard label="EPS 5Y"     value={stock.eps_5y}     suffix="%" good={v=>v>15} bad={v=>v<5}/>
          <MetricCard label="Sales 5Y"   value={stock.sales_5y}   suffix="%" good={v=>v>15} bad={v=>v<5}/>
        </MetricGroup>
        <MetricGroup label="Leverage" cols={metricCols}>
          <MetricCard label="Debt/Eq"   value={stock.debt_eq}   suffix="x" good={v=>v<0.5} bad={v=>v>2}/>
          <MetricCard label="Current R" value={stock.current_r} suffix="x" good={v=>v>2}   bad={v=>v<1}/>
          <MetricCard label="RSI(14)"   value={stock.rsi}       suffix=""  good={v=>v>40&&v<55} bad={v=>v>70||v<30}/>
          <MetricCard label="Div Yield" value={stock.div_yield} suffix="%" good={v=>v>2}   bad={()=>false}/>
        </MetricGroup>
      </GlassCard>

      {/* Bottom */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
        <GlassCard>
          <div style={{fontSize:9,color:G.sub,letterSpacing:"2px",marginBottom:10,textTransform:"uppercase"}}>Per Share</div>
          <SideRow label="EPS TTM"  value={stock.eps_ttm!=null?`$${fmt(stock.eps_ttm)}`:null}/>
          <SideRow label="EPS Fwd"  value={stock.eps_fwd!=null?`$${fmt(stock.eps_fwd)}`:null}/>
          <SideRow label="Book/sh"  value={stock.booksh!=null?`$${fmt(stock.booksh)}`:null}/>
          <SideRow label="52W High" value={stock.high52!=null?`$${fmt(stock.high52)}`:null}/>
          <SideRow label="52W Low"  value={stock.low52!=null?`$${fmt(stock.low52)}`:null}/>
          <SideRow label="Beta"     value={stock.beta}/>
          <SideRow label="Mkt Cap"  value={fmtM(stock.mktcap)}/>
        </GlassCard>
        <GlassCard style={{marginTop:isMobile?12:0}}>
          <div style={{fontSize:9,color:G.sub,letterSpacing:"2px",marginBottom:10,textTransform:"uppercase"}}>Ownership & Perf</div>
          <SideRow label="Insider Own"  value={stock.insider_own}/>
          <SideRow label="Inst Own"     value={stock.inst_own}/>
          <SideRow label="Short Float"  value={stock.short_float}/>
          <SideRow label="Perf Week"    value={stock.perf_week}/>
          <SideRow label="Perf Month"   value={stock.perf_month}/>
          <SideRow label="Perf YTD"     value={stock.perf_ytd}/>
          <SideRow label="Recom"        value={stock.recom}/>
        </GlassCard>
      </div>
    </div>
  );
};

// ── Sector View ───────────────────────────────────────────
const SectorView = ({stocks, isMobile}) => {
  const sectors=[...new Set(stocks.map(s=>s.sector).filter(Boolean))];
  const kpis=[
    {k:"pe_ttm",l:"P/E"},{k:"ps",l:"P/S"},
    {k:"gross_mgn",l:"Gross%"},{k:"net_mgn",l:"Net%"},
    {k:"roe",l:"ROE%"},{k:"eps_this_y",l:"EPS%"},
    {k:"eps_next_y",l:"EPS Nx%"},{k:"debt_eq",l:"D/Eq"},
  ];
  const rows=sectors.map(sec=>{
    const ss=stocks.filter(s=>s.sector===sec);
    const row={sector:sec,count:ss.length};
    kpis.forEach(({k,l})=>{
      const vals=ss.map(s=>s[k]).filter(v=>v!=null);
      row[l]=vals.length?parseFloat((vals.reduce((a,b)=>a+b)/vals.length).toFixed(1)):null;
    });
    return row;
  }).sort((a,b)=>(b["ROE%"]||0)-(a["ROE%"]||0));

  const roeData=rows.map(r=>({name:r.sector,value:r["ROE%"]})).filter(r=>r.value!=null);
  const mgnData=rows.map(r=>({name:r.sector,value:r["Gross%"]})).filter(r=>r.value!=null);
  const ttStyle={background:"rgba(15,12,41,0.95)",border:`1px solid ${G.border}`,
    borderRadius:10,fontFamily:"monospace",fontSize:11};

  const chartH = isMobile ? 200 : 220;
  const tickAngle = isMobile ? -45 : -35;

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:16}}>
        <GlassCard>
          <div style={{fontSize:9,color:G.sub,letterSpacing:"2px",marginBottom:10,textTransform:"uppercase"}}>Avg ROE% by Sector</div>
          <ResponsiveContainer width="100%" height={chartH}>
            <BarChart data={roeData} margin={{top:10,right:10,left:-20,bottom:isMobile?70:55}}>
              <XAxis dataKey="name" tick={{fill:G.sub,fontSize:7}} tickLine={false} axisLine={false}
                angle={tickAngle} textAnchor="end"/>
              <YAxis tick={{fill:G.sub,fontSize:8}} tickLine={false} axisLine={false}/>
              <ReferenceLine y={15} stroke={G.green} strokeDasharray="3 3" opacity={0.5}/>
              <Tooltip contentStyle={ttStyle} formatter={v=>[`${v}%`,""]}/>
              <Bar dataKey="value" radius={[4,4,0,0]} fill="url(#roeG)"/>
              <defs>
                <linearGradient id="roeG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c4b5fd" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
        <GlassCard style={{marginTop:isMobile?12:0}}>
          <div style={{fontSize:9,color:G.sub,letterSpacing:"2px",marginBottom:10,textTransform:"uppercase"}}>Avg Gross Margin%</div>
          <ResponsiveContainer width="100%" height={chartH}>
            <BarChart data={mgnData} margin={{top:10,right:10,left:-20,bottom:isMobile?70:55}}>
              <XAxis dataKey="name" tick={{fill:G.sub,fontSize:7}} tickLine={false} axisLine={false}
                angle={tickAngle} textAnchor="end"/>
              <YAxis tick={{fill:G.sub,fontSize:8}} tickLine={false} axisLine={false}/>
              <ReferenceLine y={40} stroke={G.yellow} strokeDasharray="3 3" opacity={0.5}/>
              <Tooltip contentStyle={ttStyle} formatter={v=>[`${v}%`,""]}/>
              <Bar dataKey="value" radius={[4,4,0,0]} fill="url(#mgnG)"/>
              <defs>
                <linearGradient id="mgnG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#065f46" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <GlassCard>
        <div style={{fontSize:9,color:G.sub,letterSpacing:"2px",marginBottom:12,textTransform:"uppercase"}}>Μέσοι Όροι ανά Κλάδο</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:isMobile?10:11}}>
            <thead>
              <tr>
                {["Sector","#",...kpis.map(k=>k.l)].map(h=>(
                  <th key={h} style={{padding:isMobile?"6px 8px":"8px 12px",
                    textAlign:h==="Sector"?"left":"right",fontSize:8,color:G.sub,
                    letterSpacing:"1px",fontWeight:400,
                    borderBottom:`1px solid ${G.border}`,textTransform:"uppercase",
                    whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row,i)=>(
                <tr key={row.sector} style={{borderBottom:`1px solid ${G.border}`,
                  background:i%2===0?"transparent":"rgba(255,255,255,0.02)"}}>
                  <td style={{padding:isMobile?"6px 8px":"9px 12px",textAlign:"left"}}>
                    <span style={{color:sc(row.sector),fontFamily:"monospace",fontWeight:700,
                      fontSize:isMobile?9:11}}>{row.sector}</span>
                  </td>
                  <td style={{padding:isMobile?"6px 8px":"9px 12px",textAlign:"right",color:G.sub}}>{row.count}</td>
                  {kpis.map(({l})=>{
                    const v=row[l];
                    const isG=(l==="ROE%"&&v>15)||(l==="Gross%"&&v>40)||(l==="EPS%"&&v>20);
                    const isB=((l==="ROE%"||l==="Net%")&&v<0)||(l==="D/Eq"&&v>2);
                    return (
                      <td key={l} style={{padding:isMobile?"6px 8px":"9px 12px",
                        textAlign:"right",fontFamily:"monospace",
                        color:isG?G.green:isB?G.red:G.text,
                        fontSize:isMobile?9:11}}>{v!=null?v:"—"}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();
  const [data,setData]         = useState(null);
  const [tab,setTab]           = useState("watch");
  const [selected,setSelected] = useState(null);
  const [loading,setLoading]   = useState(false);
  const [error,setError]       = useState(null);
  const [now,setNow]           = useState(new Date());

  useEffect(()=>{
    const t=setInterval(()=>setNow(new Date()),60000);
    return ()=>clearInterval(t);
  },[]);

  const loadData=()=>{
    setLoading(true); setError(null);
    fetch("/data.json?t="+Date.now())
      .then(r=>{ if(!r.ok) throw new Error("data.json not found"); return r.json(); })
      .then(d=>{ setData(d); setLoading(false); })
      .catch(e=>{ setError(e.message); setLoading(false); });
  };

  useEffect(()=>{ loadData(); },[]);

  const allStocks = data
    ? [...(data.watch||[]),...(data.growth||[])].filter((s,i,a)=>a.findIndex(x=>x.ticker===s.ticker)===i)
    : [];

  const handleSelect = s => { setSelected(s); setTab("detail"); window.scrollTo(0,0); };

  const tabs = [
    {id:"watch",   label:isMobile?"⭐":"⭐  Watchlist",          color:"#93c5fd"},
    {id:"growth",  label:isMobile?"🚀":"🚀  Growth",             color:"#6ee7b7"},
    {id:"sectors", label:isMobile?"📊":"📊  Sectors",            color:"#c4b5fd"},
    {id:"detail",  label:isMobile?"📋":"📋  Ανάλυση",            color:"#fcd34d"},
  ];

  const nowStr = now.toLocaleTimeString("el-GR",{hour:"2-digit",minute:"2-digit"});

  return (
    <div style={{minHeight:"100vh",background:G.bg,
      fontFamily:"-apple-system,'Segoe UI',sans-serif",color:G.text}}>

      {/* Decorative orbs */}
      <div style={{position:"fixed",top:-100,left:-100,width:400,height:400,borderRadius:"50%",
        background:"rgba(99,102,241,0.12)",filter:"blur(80px)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",top:200,right:-100,width:350,height:350,borderRadius:"50%",
        background:"rgba(16,185,129,0.08)",filter:"blur(80px)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:-50,left:"40%",width:300,height:300,borderRadius:"50%",
        background:"rgba(139,92,246,0.1)",filter:"blur(80px)",pointerEvents:"none",zIndex:0}}/>

      <div style={{position:"relative",zIndex:1}}>
        {/* Header */}
        <div style={{background:"rgba(255,255,255,0.04)",borderBottom:`1px solid ${G.border}`,
          backdropFilter:"blur(20px)",padding:isMobile?"10px 16px":"12px 24px",
          display:"flex",alignItems:"center",justifyContent:"space-between",
          position:"sticky",top:0,zIndex:100}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#6ee7b7",
              boxShadow:"0 0 12px #6ee7b7, 0 0 24px #6ee7b760",animation:"pulse 2s infinite"}}/>
            <span style={{fontSize:isMobile?11:13,color:G.text,letterSpacing:"2px",fontWeight:600}}>
              {isMobile?"SCREENER":"STOCK SCREENER"}
            </span>
            {data&&!isMobile&&(
              <span style={{fontSize:10,color:G.dim,marginLeft:4}}>Data: {data.updated}</span>
            )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {!isMobile&&<span style={{fontSize:10,color:G.sub}}>{nowStr}</span>}
            <button onClick={loadData} disabled={loading} style={{
              background:"rgba(147,197,253,0.1)",border:"1px solid rgba(147,197,253,0.25)",
              color:"#93c5fd",borderRadius:30,padding:isMobile?"6px 12px":"7px 18px",
              cursor:"pointer",fontSize:isMobile?10:11,fontWeight:600,
              backdropFilter:"blur(10px)",opacity:loading?0.6:1}}>
              {loading?"⟳":"⟳  Refresh"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",background:"rgba(255,255,255,0.03)",
          borderBottom:`1px solid ${G.border}`,backdropFilter:"blur(10px)",
          padding:isMobile?"0 8px":"0 24px",overflowX:"auto"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              background:"none",border:"none",
              borderBottom:`2px solid ${tab===t.id?t.color:"transparent"}`,
              color:tab===t.id?t.color:G.sub,
              padding:isMobile?"10px 12px":"11px 20px",
              fontSize:isMobile?11:10,letterSpacing:isMobile?"0":"1.5px",
              cursor:"pointer",fontFamily:"inherit",transition:"all .2s",
              fontWeight:tab===t.id?600:400,whiteSpace:"nowrap"}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{padding:isMobile?"12px 12px":"20px 24px"}}>
          {error&&(
            <div style={{...glassCard({marginBottom:16}),borderColor:"rgba(252,165,165,0.3)",
              background:"rgba(252,165,165,0.05)",color:G.red,fontSize:12}}>
              ⚠️ {error}
            </div>
          )}

          {/* WATCHLIST */}
          {data&&tab==="watch"&&(()=>{
            const w=data.watch||[];
            const avgPE=w.filter(x=>x.pe_ttm).length?w.reduce((s,x)=>s+(x.pe_ttm||0),0)/w.filter(x=>x.pe_ttm).length:0;
            const avgGr=w.filter(x=>x.eps_this_y).length?w.reduce((s,x)=>s+(x.eps_this_y||0),0)/w.filter(x=>x.eps_this_y).length:0;
            const avgSc=w.length?w.reduce((s,x)=>s+(x.score||0),0)/w.length:0;
            const upCnt=w.filter(x=>x.upside>0).length;
            return (
              <div>
                <div style={{display:"grid",
                  gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(5,1fr)",
                  gap:8,marginBottom:16}}>
                  <KPI label="Μετοχές"    value={String(w.length)}     color={G.blue}/>
                  <KPI label="Avg P/E"    value={`${fmt(avgPE,1)}x`}   color={G.yellow}/>
                  <KPI label="Avg EPS Gr" value={fmtP(avgGr)}          color={pColor(avgGr)}/>
                  <KPI label="Avg Score"  value={`${fmt(avgSc,1)}/8`}  color={G.purple}/>
                  <KPI label="Upside>0"   value={String(upCnt)}        color={G.green} sub={`από ${w.length}`}/>
                </div>
                <GlassCard>
                  <div style={{fontSize:9,color:G.sub,letterSpacing:"1.5px",marginBottom:12,textTransform:"uppercase"}}>
                    ⭐ Watchlist {isMobile?"— πάτα για ανάλυση":"— κλικ σε μετοχή για αναλυτική ανάλυση"}
                  </div>
                  <StockList stocks={w} onSelect={handleSelect} isMobile={isMobile}/>
                </GlassCard>
              </div>
            );
          })()}

          {/* GROWTH */}
          {data&&tab==="growth"&&(()=>{
            const g=data.growth||[];
            const hi=g.filter(x=>x.score>=6).length;
            const agm=g.filter(x=>x.gross_mgn).length?g.reduce((s,x)=>s+(x.gross_mgn||0),0)/g.filter(x=>x.gross_mgn).length:0;
            const any_=g.filter(x=>x.eps_next_y).length?g.reduce((s,x)=>s+(x.eps_next_y||0),0)/g.filter(x=>x.eps_next_y).length:0;
            return (
              <div>
                <div style={{display:"grid",
                  gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",
                  gap:8,marginBottom:16}}>
                  <KPI label="Βρέθηκαν"      value={String(g.length)} color={G.green}/>
                  <KPI label="Score ≥ 6"     value={String(hi)}       color={G.blue}/>
                  <KPI label="Avg Gross Mgn" value={`${fmt(agm,1)}%`} color={G.yellow}/>
                  <KPI label="Avg EPS Nx Y"  value={fmtP(any_)}       color={G.purple}/>
                </div>
                <GlassCard>
                  <div style={{fontSize:9,color:G.sub,letterSpacing:"1.5px",marginBottom:10,textTransform:"uppercase"}}>
                    🚀 Growth Candidates
                  </div>
                  <StockList stocks={g} onSelect={handleSelect} isMobile={isMobile}/>
                </GlassCard>
              </div>
            );
          })()}

          {/* SECTORS */}
          {data&&tab==="sectors"&&<SectorView stocks={allStocks} isMobile={isMobile}/>}

          {/* DETAIL */}
          {data&&tab==="detail"&&selected&&(
            <DetailView stock={selected} allStocks={allStocks} history={data.history||{}} isMobile={isMobile}/>
          )}
          {data&&tab==="detail"&&!selected&&(
            <div style={{textAlign:"center",padding:60,color:G.sub,fontSize:13}}>
              {isMobile?"Πάτα σε μετοχή από Watchlist ή Growth":"Κλικ σε μετοχή από Watchlist ή Growth Candidates"}
            </div>
          )}

          {!data&&!loading&&!error&&(
            <div style={{textAlign:"center",padding:60,color:G.sub}}>
              Πάτα <span style={{color:"#93c5fd"}}>Refresh</span> για να φορτωθούν τα δεδομένα
            </div>
          )}
        </div>

        {/* Mobile bottom padding */}
        {isMobile&&<div style={{height:20}}/>}
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.9)}}
        *{box-sizing:border-box;}
        body{margin:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:3px;}
        input::placeholder{color:rgba(255,255,255,0.25);}
        input:focus{border-color:rgba(147,197,253,0.4)!important;outline:none;}
        button:hover{opacity:0.85;}
      `}</style>
    </div>
  );
}