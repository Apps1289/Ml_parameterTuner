import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { runBiasVariance } from '../api'
import SliderControl from './SliderControl'

const DATASETS = [
  { id:'moons',   label:'Moons',   icon:'🌙' },
  { id:'circles', label:'Circles', icon:'⭕' },
  { id:'blobs',   label:'Blobs',   icon:'🫧' },
  { id:'linear',  label:'Linear',  icon:'📐' },
]
const MODELS = [
  { id:'decision_tree', label:'Decision Tree', color:'#8b5cf6', xLabel:'max_depth',    desc:'Watch train acc reach 100% while test drops — classic overfitting.' },
  { id:'knn',           label:'KNN',           color:'#f59e0b', xLabel:'K neighbours', desc:'Small K = complex (overfit). Large K = simple (underfit). Sweet spot in middle.' },
  { id:'svm_rbf',       label:'SVM (RBF)',     color:'#10b981', xLabel:'gamma (γ)',    desc:'High gamma = wiggly overfit. Low gamma = smooth underfit.' },
]

// ── SVG curve chart ─────────────────────────────────────────────────────────
function CurveChart({ points, paramLabel, modelColor }) {
  const [hover, setHover] = useState(null)
  const W = 700, H = 360
  const PAD = { top:18, right:28, bottom:44, left:52 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top  - PAD.bottom

  const xs     = points.map(p => p.param)
  const xMin   = xs[0], xMax = xs[xs.length-1]
  const toSvgX = v => PAD.left + ((v - xMin) / (xMax - xMin || 1)) * plotW
  const toSvgY = v => PAD.top  + (1 - v) * plotH   // accuracy 0→1

  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0]

  const trainPath = points.map((p,i) => `${i===0?'M':'L'} ${toSvgX(p.param).toFixed(1)} ${toSvgY(p.train).toFixed(1)}`).join(' ')
  const testPath  = points.map((p,i) => `${i===0?'M':'L'} ${toSvgX(p.param).toFixed(1)} ${toSvgY(p.test ).toFixed(1)}`).join(' ')

  // Shaded gap between curves
  const gapArea = [
    ...points.map((p,i)        => `${i===0?'M':'L'} ${toSvgX(p.param).toFixed(1)} ${toSvgY(p.train).toFixed(1)}`),
    ...points.slice().reverse().map((p,i) => `${i===0?'L':'L'} ${toSvgX(p.param).toFixed(1)} ${toSvgY(p.test ).toFixed(1)}`),
    'Z'
  ].join(' ')

  // Best test accuracy point
  const bestIdx  = points.reduce((bi,p,i) => p.test > points[bi].test ? i : bi, 0)
  const bestPt   = points[bestIdx]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', display:'block', overflow:'hidden' }}
      onMouseLeave={() => setHover(null)}>

      {/* Grid */}
      {yTicks.map(v => (
        <line key={v} x1={PAD.left} y1={toSvgY(v)} x2={PAD.left+plotW} y2={toSvgY(v)}
          stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      ))}
      {points.map((p,i) => (
        <line key={i} x1={toSvgX(p.param)} y1={PAD.top} x2={toSvgX(p.param)} y2={PAD.top+plotH}
          stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
      ))}

      {/* Gap shading (variance zone) */}
      <path d={gapArea} fill="rgba(239,68,68,0.08)" />

      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top+plotH} x2={PAD.left+plotW} y2={PAD.top+plotH} stroke="#1e2d45" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top}       x2={PAD.left}       y2={PAD.top+plotH} stroke="#1e2d45" strokeWidth={1} />

      {/* Y ticks */}
      {yTicks.map(v => (
        <g key={v}>
          <text x={PAD.left-8} y={toSvgY(v)+4} textAnchor="end" fill="#64748b" fontSize={10} fontFamily="Space Mono,monospace">
            {Math.round(v*100)}%
          </text>
        </g>
      ))}

      {/* X ticks */}
      {points.filter((_,i)=> i % Math.ceil(points.length/8) === 0).map((p,i) => (
        <text key={i} x={toSvgX(p.param)} y={H-PAD.bottom+16} textAnchor="middle"
          fill="#64748b" fontSize={10} fontFamily="Space Mono,monospace">{p.param}</text>
      ))}

      {/* Axis labels */}
      <text x={PAD.left+plotW/2} y={H-4} textAnchor="middle" fill="#475569" fontSize={11} fontFamily="DM Sans,sans-serif">{paramLabel}</text>
      <text x={14} y={PAD.top+plotH/2} textAnchor="middle" fill="#475569" fontSize={11} fontFamily="DM Sans,sans-serif" transform={`rotate(-90,14,${PAD.top+plotH/2})`}>Accuracy</text>

      {/* Train curve */}
      <path d={trainPath} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinejoin="round" />
      {/* Test curve */}
      <path d={testPath}  fill="none" stroke={modelColor} strokeWidth={2.5} strokeLinejoin="round" strokeDasharray="0" />

      {/* Best test point */}
      {bestPt && (
        <g>
          <circle cx={toSvgX(bestPt.param)} cy={toSvgY(bestPt.test)} r={7}
            fill={modelColor} fillOpacity={0.2} stroke={modelColor} strokeWidth={2} />
          <circle cx={toSvgX(bestPt.param)} cy={toSvgY(bestPt.test)} r={3} fill={modelColor} />
          <line x1={toSvgX(bestPt.param)} y1={PAD.top} x2={toSvgX(bestPt.param)} y2={PAD.top+plotH}
            stroke={modelColor} strokeWidth={1} strokeDasharray="4,3" strokeOpacity={0.5} />
          <rect x={toSvgX(bestPt.param)-22} y={PAD.top-18} width={44} height={16} rx={4}
            fill={modelColor} fillOpacity={0.15} stroke={modelColor} strokeWidth={1} strokeOpacity={0.5} />
          <text x={toSvgX(bestPt.param)} y={PAD.top-6} textAnchor="middle"
            fill={modelColor} fontSize={9} fontFamily="Space Mono,monospace">best</text>
        </g>
      )}

      {/* Hover dots */}
      {points.map((p,i) => (
        <circle key={i} cx={toSvgX(p.param)} cy={toSvgY(p.test)} r={hover===i?6:4}
          fill={modelColor} fillOpacity={hover===i?1:0} stroke="none" style={{ cursor:'crosshair' }}
          onMouseEnter={() => setHover(i)} />
      ))}

      {/* Tooltip */}
      {hover !== null && (() => {
        const p  = points[hover]
        const tx = Math.min(toSvgX(p.param)+12, W-140)
        const ty = Math.max(toSvgY(p.test)-60, PAD.top)
        return (
          <g>
            <rect x={tx} y={ty} width={128} height={56} rx={6} fill="#0f1624" stroke="#253650" strokeWidth={1} />
            <text x={tx+10} y={ty+14} fill="#94a3b8" fontSize={9} fontFamily="Space Mono,monospace">{paramLabel} = {p.param}</text>
            <text x={tx+10} y={ty+28} fill="#10b981"    fontSize={10} fontFamily="Space Mono,monospace" fontWeight="bold">Train: {(p.train*100).toFixed(1)}%</text>
            <text x={tx+10} y={ty+42} fill={modelColor} fontSize={10} fontFamily="Space Mono,monospace" fontWeight="bold">Test:  {(p.test *100).toFixed(1)}%</text>
          </g>
        )
      })()}

      {/* Region labels */}
      {points.length > 4 && (
        <>
          <text x={PAD.left+20} y={PAD.top+plotH-12} fill="#ef4444" fontSize={10} fontFamily="DM Sans,sans-serif" opacity={0.7}>← Underfitting</text>
          <text x={PAD.left+plotW-90} y={PAD.top+plotH-12} fill="#f59e0b" fontSize={10} fontFamily="DM Sans,sans-serif" opacity={0.7}>Overfitting →</text>
        </>
      )}
    </svg>
  )
}

export default function BiasVariancePage() {
  const [dataset,   setDataset]   = useState('moons')
  const [modelType, setModelType] = useState('decision_tree')
  const [points,    setPoints]    = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [nSamples,  setNSamples]  = useState(200)
  const [noise,     setNoise]     = useState(0.2)
  const debounceRef = useRef(null)

  const activeModel = MODELS.find(m => m.id === modelType)

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await runBiasVariance({ dataset, n_samples:nSamples, noise, model_type:modelType, seed:42, test_size:0.25 })
      setPoints(data.points)
    } catch { setError('Backend not reachable. Make sure FastAPI is running on port 8000.') }
    finally  { setLoading(false) }
  }, [dataset, nSamples, noise, modelType])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetch, 400)
    return () => clearTimeout(debounceRef.current)
  }, [fetch])

  const bestIdx = points.reduce((bi,p,i) => p.test > points[bi]?.test ? i : bi, 0)
  const bestPt  = points[bestIdx]

  return (
    <div style={{ display:'flex', gap:20, height:'100%', minHeight:0, overflow:'hidden', flexWrap:'wrap' }}>
      {/* LEFT */}
      <div style={{ width:'clamp(250px, 28vw, 290px)', flexShrink:0, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:20, overflowY:'auto' }}>
        <PanelSection label="Model">
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {MODELS.map(m => (
              <button key={m.id} onClick={() => setModelType(m.id)} style={{
                background: modelType===m.id ? `${m.color}18` : 'var(--bg3)',
                border: modelType===m.id ? `1.5px solid ${m.color}` : '1.5px solid var(--border)',
                borderRadius:8, padding:'9px 12px', cursor:'pointer', textAlign:'left', transition:'all 0.15s',
              }}>
                <div style={{ fontFamily:'var(--sans)', fontSize:13, fontWeight:600, color:modelType===m.id?m.color:'var(--text)', marginBottom:3 }}>{m.label}</div>
                <div style={{ fontFamily:'var(--sans)', fontSize:10, color:'var(--text3)', lineHeight:1.5 }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </PanelSection>
        <Divider />
        <PanelSection label="Dataset">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {DATASETS.map(d => <DsBtn key={d.id} d={d} active={dataset===d.id} onClick={() => setDataset(d.id)} />)}
          </div>
        </PanelSection>
        <Divider />
        <PanelSection label="Data Parameters">
          <SliderControl label="Samples" value={nSamples} min={80} max={400} step={10} onChange={setNSamples} format={v=>Math.round(v)} tooltip="More samples = smoother, more reliable curves." />
          <SliderControl label="Noise"   value={noise}    min={0.01} max={0.5} step={0.01} onChange={setNoise}    format={v=>v.toFixed(2)} tooltip="Higher noise shifts the sweet spot leftward (simpler model needed)." />
        </PanelSection>
        <Divider />
        {/* Legend */}
        <PanelSection label="Legend">
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:24, height:3, background:'#10b981', display:'inline-block', borderRadius:2 }} />
              <span style={{ fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)' }}>Train accuracy</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:24, height:3, background:activeModel?.color, display:'inline-block', borderRadius:2 }} />
              <span style={{ fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)' }}>Test accuracy</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:24, height:8, background:'rgba(239,68,68,0.15)', display:'inline-block', borderRadius:2, border:'1px solid rgba(239,68,68,0.3)' }} />
              <span style={{ fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)' }}>Variance gap (overfit zone)</span>
            </div>
          </div>
        </PanelSection>
      </div>

      {/* RIGHT */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12, overflowY:'auto', minWidth:0 }}>
        {/* Header */}
        <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:'var(--sans)', fontWeight:700, fontSize:16, color:'var(--text)' }}>
              Bias-Variance Tradeoff
            </div>
            <div style={{ fontFamily:'var(--sans)', fontSize:12, color:'var(--text3)', marginTop:3 }}>
              {activeModel?.label} · {activeModel?.xLabel} → Train & Test accuracy
            </div>
          </div>
          {loading && <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent)', background:'var(--accent-glow)', borderRadius:20, padding:'3px 10px', border:'1px solid rgba(59,130,246,0.3)' }}>computing...</div>}
        </div>

        {/* Curve */}
        <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:'14px 12px 8px', flex:1, minHeight:0, display:'flex', flexDirection:'column' }}>
          {error  && <div style={{ textAlign:'center', padding:80, color:'var(--red)', fontFamily:'var(--mono)', fontSize:13 }}>⚠️ {error}</div>}
          {!error && points.length > 0 && (
            <div style={{ flex:1, minHeight:0, display:'flex', alignItems:'stretch' }}>
              <CurveChart points={points} paramLabel={activeModel?.xLabel} modelColor={activeModel?.color} />
            </div>
          )}
          {!error && points.length === 0 && loading && (
            <div style={{ textAlign:'center', padding:80, color:'var(--text3)', fontFamily:'var(--mono)', fontSize:13 }}>computing curves...</div>
          )}
        </div>

        {/* Insight cards */}
        {bestPt && (
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {[
              { label:'Best Test Acc',  value:`${(bestPt.test *100).toFixed(1)}%`, color:'var(--accent2)', sub:`at ${activeModel?.xLabel} = ${bestPt.param}` },
              { label:'Train Acc there', value:`${(bestPt.train*100).toFixed(1)}%`, color:'#10b981',        sub:'on training data at sweet spot' },
              { label:'Gap at sweet spot', value:`${((bestPt.train-bestPt.test)*100).toFixed(1)}%`, color: (bestPt.train-bestPt.test)>0.1?'var(--yellow)':'#10b981', sub:'smaller = better generalisation' },
              { label:'Points computed', value:points.length, color:'var(--text2)', sub:`across ${activeModel?.xLabel} range` },
            ].map((c,i) => (
              <div key={i} style={{ flex:'1 1 180px', minWidth:180, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>{c.label}</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:700, color:c.color }}>{c.value}</div>
                <div style={{ fontSize:10, color:'var(--text3)', marginTop:3 }}>{c.sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PanelSection({ label, children }) { return <div style={{ marginBottom:20 }}><div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>{label}</div>{children}</div> }
function Divider() { return <div style={{ borderTop:'1px solid var(--border)', marginBottom:20 }} /> }
function DsBtn({ d, active, onClick }) { return <button onClick={onClick} style={{ background:active?'rgba(59,130,246,0.1)':'var(--bg3)', border:active?'1.5px solid var(--accent)':'1.5px solid var(--border)', borderRadius:8, padding:'8px 10px', cursor:'pointer', textAlign:'center', color:active?'var(--accent)':'var(--text2)', fontFamily:'var(--sans)', fontSize:12, fontWeight:500, transition:'all 0.15s' }}><div style={{ fontSize:18, marginBottom:2 }}>{d.icon}</div>{d.label}</button> }
