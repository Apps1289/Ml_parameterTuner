import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { runLogisticRegression } from '../api'
import SliderControl from './SliderControl'
import MetricCard from './MetricCard'
import FitStatusBadge from './FitStatusBadge'

// ─── Constants ───────────────────────────────────────────────────────────────

const DATASETS = [
  { id: 'moons',   label: 'Moons',   icon: '🌙', desc: 'Two interleaved half-circles — classic non-linear problem' },
  { id: 'circles', label: 'Circles', icon: '⭕', desc: 'Concentric circles — impossible for linear boundary' },
  { id: 'blobs',   label: 'Blobs',   icon: '🫧', desc: 'Two Gaussian clusters — linearly separable' },
  { id: 'linear',  label: 'Linear',  icon: '📐', desc: 'Linearly separable with some overlap' },
]

const PENALTIES = [
  { id: 'l2',   label: 'L2 (Ridge)', desc: 'Shrinks all coefficients equally. Keeps all features.' },
  { id: 'l1',   label: 'L1 (Lasso)', desc: 'Can zero out coefficients — sparse solution.' },
  { id: 'none', label: 'None',        desc: 'No regularization. Risk of overfitting on small datasets.' },
]

// Class colors: class 0 = blue, class 1 = orange
const C0 = { fill: '#3b82f6', border: '#1e3a5f', bg: 'rgba(59,130,246,0.18)' }
const C1 = { fill: '#f97316', border: '#7c2d12', bg: 'rgba(249,115,22,0.18)' }

// ─── Decision Boundary Canvas ────────────────────────────────────────────────
// Renders the probability heatmap + scatter using a <canvas> for the heatmap
// and SVG overlaid for the points (crisp, hoverable)

function BoundaryChart({ boundary, scatter, loading }) {
  const canvasRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  const W = 520, H = 340
  const PAD = { top: 14, right: 14, bottom: 34, left: 46 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top  - PAD.bottom

  const { x0_min, x0_max, x1_min, x1_max, x0, x1, probs } = boundary || {}

  // Map data coords → SVG pixel coords
  const toSvgX = useCallback(v => {
    if (!boundary) return 0
    return PAD.left + ((v - x0_min) / (x0_max - x0_min)) * plotW
  }, [boundary, plotW])

  const toSvgY = useCallback(v => {
    if (!boundary) return 0
    return PAD.top + ((x1_max - v) / (x1_max - x1_min)) * plotH
  }, [boundary, plotH])

  // Draw heatmap onto canvas whenever probs change
  useEffect(() => {
    if (!canvasRef.current || !probs) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const res = probs.length
    const cw = canvas.width  = plotW
    const ch = canvas.height = plotH
    const imageData = ctx.createImageData(cw, ch)

    for (let py = 0; py < ch; py++) {
      for (let px = 0; px < cw; px++) {
        // Map pixel → grid index
        const gx = Math.floor((px / cw) * res)
        const gy = Math.floor(((ch - 1 - py) / ch) * res)
        const p  = probs[Math.min(gy, res - 1)][Math.min(gx, res - 1)]

        // Color: class0=blue (low p), class1=orange (high p), boundary=white
        const idx = (py * cw + px) * 4
        const t = Math.abs(p - 0.5) * 2  // 0 at boundary, 1 at extremes
        const alpha = 0.55 + t * 0.25    // more transparent near boundary

        if (p < 0.5) {
          // Blue region (class 0)
          imageData.data[idx]     = 30 + (1 - t) * 80  // R
          imageData.data[idx + 1] = 80 + t * 50         // G
          imageData.data[idx + 2] = 180 + t * 70        // B
          imageData.data[idx + 3] = alpha * 255
        } else {
          // Orange region (class 1)
          imageData.data[idx]     = 200 + t * 50        // R
          imageData.data[idx + 1] = 80 + (1 - t) * 40  // G
          imageData.data[idx + 2] = 20                  // B
          imageData.data[idx + 3] = alpha * 255
        }

        // Highlight decision boundary (p ≈ 0.5)
        if (Math.abs(p - 0.5) < 0.025) {
          imageData.data[idx]     = 255
          imageData.data[idx + 1] = 255
          imageData.data[idx + 2] = 255
          imageData.data[idx + 3] = 200
        }
      }
    }
    ctx.putImageData(imageData, 0, 0)
  }, [probs, plotW, plotH])

  // Axis ticks
  const xTicks = useMemo(() => {
    if (!boundary) return []
    const count = 6
    return Array.from({ length: count }, (_, i) => x0_min + (i / (count - 1)) * (x0_max - x0_min))
  }, [boundary])

  const yTicks = useMemo(() => {
    if (!boundary) return []
    const count = 6
    return Array.from({ length: count }, (_, i) => x1_min + (i / (count - 1)) * (x1_max - x1_min))
  }, [boundary])

  const allDots = useMemo(() => [
    ...(scatter?.train || []).map(d => ({ ...d, split: 'train' })),
    ...(scatter?.test  || []).map(d => ({ ...d, split: 'test'  })),
  ], [scatter])

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Canvas heatmap embedded via foreignObject */}
        <foreignObject x={PAD.left} y={PAD.top} width={plotW} height={plotH}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }}
          />
        </foreignObject>

        {/* Plot border */}
        <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH}
          fill="none" stroke="#1e2d45" strokeWidth={1} />

        {/* Grid lines (light) */}
        {xTicks.map((v, i) => (
          <line key={i}
            x1={toSvgX(v)} y1={PAD.top}
            x2={toSvgX(v)} y2={PAD.top + plotH}
            stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}
        {yTicks.map((v, i) => (
          <line key={i}
            x1={PAD.left} y1={toSvgY(v)}
            x2={PAD.left + plotW} y2={toSvgY(v)}
            stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}

        {/* X axis labels */}
        {xTicks.map((v, i) => (
          <text key={i} x={toSvgX(v)} y={H - PAD.bottom + 16}
            textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="Space Mono, monospace">
            {v.toFixed(1)}
          </text>
        ))}
        {/* Y axis labels */}
        {yTicks.map((v, i) => (
          <text key={i} x={PAD.left - 6} y={toSvgY(v) + 3}
            textAnchor="end" fill="#64748b" fontSize={9} fontFamily="Space Mono, monospace">
            {v.toFixed(1)}
          </text>
        ))}

        {/* Axis labels */}
        <text x={PAD.left + plotW / 2} y={H - 2}
          textAnchor="middle" fill="#475569" fontSize={10} fontFamily="DM Sans, sans-serif">
          Feature 1
        </text>
        <text x={12} y={PAD.top + plotH / 2}
          textAnchor="middle" fill="#475569" fontSize={10} fontFamily="DM Sans, sans-serif"
          transform={`rotate(-90, 12, ${PAD.top + plotH / 2})`}>
          Feature 2
        </text>

        {/* Scatter dots */}
        {allDots.map((d, i) => {
          const col = d.label === 0 ? C0 : C1
          const isTest = d.split === 'test'
          return (
            <circle key={i}
              cx={toSvgX(d.x)} cy={toSvgY(d.y)}
              r={isTest ? 5 : 4.5}
              fill={col.fill}
              fillOpacity={isTest ? 1 : 0.8}
              stroke={isTest ? '#fff' : col.border}
              strokeWidth={isTest ? 1.5 : 1}
              style={{ cursor: 'crosshair' }}
              onMouseEnter={() => setTooltip({ ...d, col })}
            />
          )
        })}

        {/* Tooltip */}
        {tooltip && (() => {
          const tx = Math.min(toSvgX(tooltip.x) + 12, W - 160)
          const ty = Math.max(toSvgY(tooltip.y) - 50, PAD.top)
          return (
            <g>
              <rect x={tx} y={ty} width={148} height={48} rx={6}
                fill="#0f1624" stroke="#253650" strokeWidth={1} />
              <text x={tx + 10} y={ty + 15} fill={tooltip.col.fill} fontSize={10} fontFamily="Space Mono, monospace" fontWeight="bold">
                Class {tooltip.label}  ·  {tooltip.split}
              </text>
              <text x={tx + 10} y={ty + 29} fill="#94a3b8" fontSize={9} fontFamily="Space Mono, monospace">
                x₁={tooltip.x.toFixed(3)}
              </text>
              <text x={tx + 10} y={ty + 41} fill="#94a3b8" fontSize={9} fontFamily="Space Mono, monospace">
                x₂={tooltip.y.toFixed(3)}
              </text>
            </g>
          )
        })()}

        {/* Loading overlay */}
        {loading && (
          <rect x={0} y={0} width={W} height={H} fill="rgba(10,14,23,0.6)" />
        )}
        {loading && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fill="#60a5fa"
            fontSize={13} fontFamily="Space Mono, monospace">
            computing boundary...
          </text>
        )}
      </svg>
    </div>
  )
}

// ─── Confusion Matrix ────────────────────────────────────────────────────────

function ConfusionMatrix({ cm }) {
  if (!cm || cm.length < 2) return null
  const [[tn, fp], [fn, tp]] = cm
  const total = tn + fp + fn + tp
  const cells = [
    { label: 'TN', value: tn, desc: 'True Negative',  color: '#3b82f6' },
    { label: 'FP', value: fp, desc: 'False Positive', color: '#ef4444' },
    { label: 'FN', value: fn, desc: 'False Negative', color: '#f59e0b' },
    { label: 'TP', value: tp, desc: 'True Positive',  color: '#10b981' },
  ]
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
        Confusion Matrix
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {cells.map(c => (
          <div key={c.label} style={{
            background: `${c.color}18`, border: `1px solid ${c.color}40`,
            borderRadius: 8, padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: c.color }}>
              {c.value}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: c.color, opacity: 0.8 }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{c.desc}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>
              {((c.value / total) * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--sans)', lineHeight: 1.6 }}>
        Precision: <span style={{ color: 'var(--accent2)', fontFamily: 'var(--mono)' }}>
          {tp + fp > 0 ? (tp / (tp + fp)).toFixed(3) : 'N/A'}
        </span>
        &nbsp;&nbsp;Recall: <span style={{ color: 'var(--accent2)', fontFamily: 'var(--mono)' }}>
          {tp + fn > 0 ? (tp / (tp + fn)).toFixed(3) : 'N/A'}
        </span>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LogisticRegressionPage() {
  const [dataset,  setDataset]  = useState('moons')
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  // Hyperparams
  const [C,        setC]        = useState(1.0)
  const [penalty,  setPenalty]  = useState('l2')
  const [maxIter,  setMaxIter]  = useState(1000)
  const [nSamples, setNSamples] = useState(200)
  const [noise,    setNoise]    = useState(0.2)
  const [testSize, setTestSize] = useState(0.25)

  const debounceRef = useRef(null)

  const fetchResult = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await runLogisticRegression({
        dataset, n_samples: nSamples, noise, test_size: testSize,
        C, penalty, max_iter: maxIter, resolution: 80, seed: 42,
      })
      setResult(data)
    } catch (e) {
      setError('Backend not reachable. Make sure FastAPI is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }, [dataset, nSamples, noise, testSize, C, penalty, maxIter])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchResult, 350)
    return () => clearTimeout(debounceRef.current)
  }, [fetchResult])

  const m = result?.metrics

  return (
    <div style={{ display:'flex', gap:20, height:'100%', minHeight:0, overflow:'hidden', flexWrap:'wrap' }}>

      {/* ─── LEFT PANEL ─── */}
      <div style={{
        width: 'clamp(250px, 32vw, 310px)', flexShrink: 0,
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 20, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Dataset */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Dataset
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DATASETS.map(d => (
              <button key={d.id} onClick={() => setDataset(d.id)} style={{
                background: dataset === d.id ? 'rgba(59,130,246,0.1)' : 'var(--bg3)',
                border: dataset === d.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                borderRadius: 8, padding: '8px 12px', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, color: dataset === d.id ? 'var(--accent)' : 'var(--text)', marginBottom: 2 }}>
                  {d.icon} {d.label}
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>
                  {d.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: 20 }} />

        {/* Data params */}
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
          Data Parameters
        </div>
        <SliderControl label="Samples" tooltip="Number of points. More samples = cleaner pattern but slower rendering." value={nSamples} min={50} max={500} step={10} onChange={setNSamples} format={v => Math.round(v)} />
        <SliderControl label="Noise" tooltip="Overlap between classes. High noise = harder to classify, messier boundary." value={noise} min={0.01} max={0.5} step={0.01} onChange={setNoise} format={v => v.toFixed(2)} />
        <SliderControl label="Test Split" tooltip="Fraction held out for testing. Watch test accuracy drop if you overfit!" value={testSize} min={0.1} max={0.4} step={0.05} onChange={setTestSize} format={v => `${Math.round(v * 100)}%`} />

        <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 20px' }} />

        {/* Model params */}
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
          Model Parameters
        </div>

        <SliderControl
          label="C (Regularization)"
          tooltip="Inverse of regularization strength. Small C = strong regularization = simpler boundary. Large C = complex boundary = risk of overfitting."
          value={C} min={0.01} max={20} step={0.01} onChange={setC} format={v => v.toFixed(2)}
        />

        {/* C intuition bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--sans)', marginBottom: 16, marginTop: -8 }}>
          <span>← Simpler boundary</span>
          <span>Complex boundary →</span>
        </div>

        {/* Penalty selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>Penalty</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {PENALTIES.map(p => (
              <button key={p.id} onClick={() => setPenalty(p.id)} style={{
                background: penalty === p.id ? 'rgba(59,130,246,0.1)' : 'var(--bg3)',
                border: penalty === p.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                borderRadius: 7, padding: '7px 10px', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600, color: penalty === p.id ? 'var(--accent)' : 'var(--text)', marginBottom: 2 }}>
                  {p.label}
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 10, color: 'var(--text3)', lineHeight: 1.4 }}>
                  {p.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <SliderControl label="Max Iterations" tooltip="Max solver iterations. Increase if you see convergence warnings. Higher C often needs more iterations." value={maxIter} min={100} max={5000} step={100} onChange={setMaxIter} format={v => Math.round(v)} />

        {/* Legend */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Legend
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              { color: C0.fill, label: 'Class 0 — Train', border: 'none', shadow: 'none' },
              { color: C1.fill, label: 'Class 1 — Train', border: 'none', shadow: 'none' },
              { color: C0.fill, label: 'Class 0 — Test',  border: '2px solid #fff', shadow: 'none' },
              { color: C1.fill, label: 'Class 1 — Test',  border: '2px solid #fff', shadow: 'none' },
            ].map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, border: l.border, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)' }}>{l.label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={{ width: 24, height: 2, background: 'white', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)' }}>Decision boundary (P=0.5)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', minWidth: 0 }}>

        {/* Metrics row */}
        {m && (
          <div className="fade-up">
            <FitStatusBadge status={m.fit_status} />
            <div style={{ display: 'flex', gap: 10, marginBottom: 0 }}>
              <MetricCard label="Train Accuracy" value={`${(m.train_acc * 100).toFixed(1)}%`} sub="Accuracy on training data" color="green" />
              <MetricCard label="Test Accuracy"  value={`${(m.test_acc  * 100).toFixed(1)}%`} sub="Accuracy on unseen data"  color={m.test_acc > 0.85 ? 'green' : m.test_acc > 0.7 ? 'yellow' : 'red'} />
              <MetricCard label="Gap (overfit?)" value={`${(m.gap * 100).toFixed(1)}%`} sub="Train − Test accuracy"    color={m.gap > 0.1 ? 'yellow' : 'default'} />
            </div>
          </div>
        )}

        {/* Main chart + confusion matrix side by side */}
        <div style={{ display: 'flex', gap: 14, minHeight: 0, flexWrap: 'wrap' }}>

          {/* Decision boundary chart */}
          <div style={{
            flex: 1, background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '16px 16px 10px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
                  Decision Boundary
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  Color intensity = probability confidence · White line = P(class 1) = 0.5
                </div>
              </div>
              {loading && (
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)',
                  background: 'var(--accent-glow)', borderRadius: 20, padding: '3px 10px',
                  border: '1px solid rgba(59,130,246,0.3)',
                }}>
                  updating...
                </div>
              )}
            </div>

            {error && (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 13 }}>
                ⚠️ {error}
              </div>
            )}

            {!error && (
              <BoundaryChart
                boundary={result?.boundary}
                scatter={result?.scatter}
                loading={loading && !result}
              />
            )}
          </div>

          {/* Right column: confusion matrix + coefficient info */}
          <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result && <ConfusionMatrix cm={m?.confusion_matrix} />}

            {/* Coefficient info */}
            {result?.model_info && (
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Model Info
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>Penalty</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)' }}>{result.model_info.penalty}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>C</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)' }}>{result.model_info.C.toFixed(3)}</span>
                  </div>
                  {result.model_info.coef?.[0] && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>w₁ (feat 1)</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)' }}>{result.model_info.coef[0][0].toFixed(4)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>w₂ (feat 2)</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)' }}>{result.model_info.coef[0][1].toFixed(4)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>bias</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)' }}>{result.model_info.intercept[0].toFixed(4)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Insight tip */}
                <div style={{
                  marginTop: 12, padding: '8px 10px',
                  background: 'rgba(59,130,246,0.06)', borderRadius: 7,
                  border: '1px solid rgba(59,130,246,0.15)',
                  fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', lineHeight: 1.5
                }}>
                  💡 Try lowering <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>C</span> to simplify the boundary, or switch datasets to see how penalty type affects non-linear data.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
