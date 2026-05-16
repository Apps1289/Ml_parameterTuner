import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react'

const C0 = { fill: '#3b82f6', border: '#1e3a5f' }
const C1 = { fill: '#f97316', border: '#7c2d12' }

// ─── Decision Boundary Canvas + SVG overlay ──────────────────────────────────
export function BoundaryChart({ boundary, scatter, loading, markers }) {
  const canvasRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  const W = 560, H = 320
  const PAD = { top: 14, right: 14, bottom: 34, left: 46 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top  - PAD.bottom

  const { x0_min, x0_max, x1_min, x1_max, probs } = boundary || {}

  const toSvgX = useCallback(v => {
    if (!boundary) return 0
    return PAD.left + ((v - x0_min) / (x0_max - x0_min)) * plotW
  }, [boundary, plotW])

  const toSvgY = useCallback(v => {
    if (!boundary) return 0
    return PAD.top + ((x1_max - v) / (x1_max - x1_min)) * plotH
  }, [boundary, plotH])

  // Draw heatmap on canvas
  useEffect(() => {
    if (!canvasRef.current || !probs) return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const res    = probs.length
    canvas.width  = plotW
    canvas.height = plotH
    const img = ctx.createImageData(plotW, plotH)

    for (let py = 0; py < plotH; py++) {
      for (let px = 0; px < plotW; px++) {
        const gx = Math.floor((px / plotW) * res)
        const gy = Math.floor(((plotH - 1 - py) / plotH) * res)
        const p  = probs[Math.min(gy, res-1)][Math.min(gx, res-1)]
        const t  = Math.abs(p - 0.5) * 2
        const a  = 0.52 + t * 0.28
        const i  = (py * plotW + px) * 4

        if (Math.abs(p - 0.5) < 0.022) {
          img.data[i]=255; img.data[i+1]=255; img.data[i+2]=255; img.data[i+3]=210
        } else if (p < 0.5) {
          img.data[i]=28+(1-t)*70; img.data[i+1]=80+t*50; img.data[i+2]=180+t*65; img.data[i+3]=a*255
        } else {
          img.data[i]=200+t*50; img.data[i+1]=75+(1-t)*40; img.data[i+2]=18; img.data[i+3]=a*255
        }
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [probs, plotW, plotH])

  const xTicks = useMemo(() => {
    if (!boundary) return []
    return Array.from({length:6}, (_,i) => x0_min + (i/5)*(x0_max-x0_min))
  }, [boundary])
  const yTicks = useMemo(() => {
    if (!boundary) return []
    return Array.from({length:6}, (_,i) => x1_min + (i/5)*(x1_max-x1_min))
  }, [boundary])

  const allDots = useMemo(() => [
    ...(scatter?.train||[]).map(d=>({...d,split:'train'})),
    ...(scatter?.test ||[]).map(d=>({...d,split:'test' })),
  ], [scatter])

  return (
    <div style={{ position:'relative', width:'100%', maxWidth:900, margin:'0 auto', padding:'0 4px' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', display:'block', overflow:'hidden' }}
        onMouseLeave={() => setTooltip(null)}>

        <foreignObject x={PAD.left} y={PAD.top} width={plotW} height={plotH}>
          <canvas ref={canvasRef}
            style={{ width:'100%', height:'100%', display:'block', imageRendering:'pixelated' }} />
        </foreignObject>

        <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH}
          fill="none" stroke="#1e2d45" strokeWidth={1} />

        {xTicks.map((v,i) => (
          <line key={i} x1={toSvgX(v)} y1={PAD.top} x2={toSvgX(v)} y2={PAD.top+plotH}
            stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        ))}
        {yTicks.map((v,i) => (
          <line key={i} x1={PAD.left} y1={toSvgY(v)} x2={PAD.left+plotW} y2={toSvgY(v)}
            stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        ))}

        {xTicks.map((v,i) => (
          <text key={i} x={toSvgX(v)} y={H-PAD.bottom+15}
            textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="Space Mono,monospace">
            {v.toFixed(1)}
          </text>
        ))}
        {yTicks.map((v,i) => (
          <text key={i} x={PAD.left-6} y={toSvgY(v)+3}
            textAnchor="end" fill="#64748b" fontSize={9} fontFamily="Space Mono,monospace">
            {v.toFixed(1)}
          </text>
        ))}

        <text x={PAD.left+plotW/2} y={H-3} textAnchor="middle"
          fill="#475569" fontSize={10} fontFamily="DM Sans,sans-serif">Feature 1</text>
        <text x={12} y={PAD.top+plotH/2} textAnchor="middle"
          fill="#475569" fontSize={10} fontFamily="DM Sans,sans-serif"
          transform={`rotate(-90,12,${PAD.top+plotH/2})`}>Feature 2</text>

        {/* Extra SVG markers (e.g. support vectors) */}
        {markers}

        {/* Scatter dots */}
        {allDots.map((d,i) => {
          const col   = d.label===0 ? C0 : C1
          const isTest = d.split==='test'
          return (
            <circle key={i} cx={toSvgX(d.x)} cy={toSvgY(d.y)}
              r={isTest ? 5 : 4.5}
              fill={col.fill} fillOpacity={isTest ? 1 : 0.8}
              stroke={isTest ? '#fff' : col.border} strokeWidth={isTest ? 1.5 : 1}
              style={{ cursor:'crosshair' }}
              onMouseEnter={() => setTooltip({...d, col})} />
          )
        })}

        {tooltip && (() => {
          const tx = Math.min(toSvgX(tooltip.x)+12, W-155)
          const ty = Math.max(toSvgY(tooltip.y)-52, PAD.top)
          return (
            <g>
              <rect x={tx} y={ty} width={145} height={48} rx={6}
                fill="#0f1624" stroke="#253650" strokeWidth={1} />
              <text x={tx+10} y={ty+15} fill={tooltip.col.fill}
                fontSize={10} fontFamily="Space Mono,monospace" fontWeight="bold">
                Class {tooltip.label} · {tooltip.split}
              </text>
              <text x={tx+10} y={ty+29} fill="#94a3b8" fontSize={9} fontFamily="Space Mono,monospace">
                x₁={tooltip.x.toFixed(3)}
              </text>
              <text x={tx+10} y={ty+41} fill="#94a3b8" fontSize={9} fontFamily="Space Mono,monospace">
                x₂={tooltip.y.toFixed(3)}
              </text>
            </g>
          )
        })()}

        {loading && (
          <>
            <rect x={0} y={0} width={W} height={H} fill="rgba(10,14,23,0.65)" />
            <text x={W/2} y={H/2} textAnchor="middle" fill="#60a5fa"
              fontSize={13} fontFamily="Space Mono,monospace">computing boundary...</text>
          </>
        )}
      </svg>
    </div>
  )
}

// ─── Confusion Matrix ─────────────────────────────────────────────────────────
export function ConfusionMatrix({ cm }) {
  if (!cm || cm.length < 2) return null
  const [[tn,fp],[fn,tp]] = cm
  const total = tn+fp+fn+tp
  const cells = [
    { label:'TN', value:tn, desc:'True Negative',  color:'#3b82f6' },
    { label:'FP', value:fp, desc:'False Positive',  color:'#ef4444' },
    { label:'FN', value:fn, desc:'False Negative',  color:'#f59e0b' },
    { label:'TP', value:tp, desc:'True Positive',   color:'#10b981' },
  ]
  const precision = tp+fp > 0 ? (tp/(tp+fp)).toFixed(3) : 'N/A'
  const recall    = tp+fn > 0 ? (tp/(tp+fn)).toFixed(3) : 'N/A'
  const f1        = precision !== 'N/A' && recall !== 'N/A'
    ? (2 * precision * recall / (parseFloat(precision) + parseFloat(recall))).toFixed(3) : 'N/A'

  return (
    <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
      <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
        Confusion Matrix
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
        {cells.map(c => (
          <div key={c.label} style={{
            background:`${c.color}18`, border:`1px solid ${c.color}40`,
            borderRadius:7, padding:'8px 10px', textAlign:'center',
          }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:700, color:c.color }}>{c.value}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:10, color:c.color, opacity:0.85 }}>{c.label}</div>
            <div style={{ fontFamily:'var(--sans)', fontSize:9, color:'var(--text3)', marginTop:1 }}>{c.desc}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)' }}>
              {((c.value/total)*100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:10, gap:6 }}>
        {[['Precision', precision],['Recall', recall],['F1', f1]].map(([l,v]) => (
          <div key={l} style={{ flex:1, textAlign:'center', background:'var(--bg2)', borderRadius:6, padding:'5px 0' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--accent2)', fontWeight:600 }}>{v}</div>
            <div style={{ fontFamily:'var(--sans)', fontSize:9, color:'var(--text3)' }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
