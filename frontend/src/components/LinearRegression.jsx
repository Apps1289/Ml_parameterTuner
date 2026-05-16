import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { runLinearRegression } from '../api'
import SliderControl from './SliderControl'
import MetricCard from './MetricCard'
import FitStatusBadge from './FitStatusBadge'

const MODELS = [
  { id: 'linear',     label: 'Linear',      color: '#3b82f6', desc: 'Basic OLS regression — fits a straight line through data.' },
  { id: 'polynomial', label: 'Polynomial',   color: '#8b5cf6', desc: 'Extends linear regression with polynomial terms — fits curves.' },
  { id: 'ridge',      label: 'Ridge (L2)',   color: '#10b981', desc: 'Adds L2 penalty to shrink coefficients — prevents overfitting.' },
  { id: 'lasso',      label: 'Lasso (L1)',   color: '#f59e0b', desc: 'Adds L1 penalty — can zero out features entirely (feature selection).' },
  { id: 'elasticnet', label: 'ElasticNet',   color: '#ef4444', desc: 'Combines L1 and L2 regularization — best of both worlds.' },
]

const DATASETS = [
  { id: 'linear',     label: 'Linear',     icon: '📈' },
  { id: 'polynomial', label: 'Polynomial', icon: '〰️' },
  { id: 'noisy',      label: 'High Noise', icon: '🌩️' },
  { id: 'sine',       label: 'Sine Wave',  icon: '🌊' },
]

// ─── Pure SVG Chart ─────────────────────────────────────────────────────────
function SVGChart({ trainDots, testDots, line, lineColor }) {
  const W = 700, H = 290
  const PAD = { top: 14, right: 22, bottom: 32, left: 50 }
  const [tooltip, setTooltip] = useState(null)

  const allY = [
    ...trainDots.map(d => d.y),
    ...testDots.map(d => d.y),
    ...line.map(d => d.y),
  ]
  const xMin = -3.5, xMax = 3.5
  const yMin = Math.min(...allY) - 0.5
  const yMax = Math.max(...allY) + 0.5

  const toSvgX = x => PAD.left + ((x - xMin) / (xMax - xMin)) * (W - PAD.left - PAD.right)
  const toSvgY = y => PAD.top  + ((yMax - y) / (yMax - yMin)) * (H - PAD.top  - PAD.bottom)

  // Grid lines
  const xTicks = [-3, -2, -1, 0, 1, 2, 3]
  const yTicks = useMemo(() => {
    const range = yMax - yMin
    const step  = range > 20 ? 5 : range > 10 ? 2 : range > 4 ? 1 : 0.5
    const ticks = []
    const start = Math.ceil(yMin / step) * step
    for (let v = start; v <= yMax + 0.001; v += step) ticks.push(parseFloat(v.toFixed(4)))
    return ticks
  }, [yMin, yMax])

  // Regression line as SVG path
  const linePath = line.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(1)} ${toSvgY(p.y).toFixed(1)}`
  ).join(' ')

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 900, margin: '0 auto', padding: '0 4px' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'hidden' }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid */}
        {xTicks.map(v => (
          <line key={v} x1={toSvgX(v)} y1={PAD.top} x2={toSvgX(v)} y2={H - PAD.bottom}
            stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}
        {yTicks.map(v => (
          <line key={v} x1={PAD.left} y1={toSvgY(v)} x2={W - PAD.right} y2={toSvgY(v)}
            stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}

        {/* Axes */}
        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#2a3a52" strokeWidth={1} />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#2a3a52" strokeWidth={1} />

        {/* X tick labels */}
        {xTicks.map(v => (
          <text key={v} x={toSvgX(v)} y={H - PAD.bottom + 16}
            textAnchor="middle" fill="#64748b" fontSize={10} fontFamily="Space Mono, monospace">
            {v}
          </text>
        ))}
        {/* Y tick labels */}
        {yTicks.map(v => (
          <text key={v} x={PAD.left - 8} y={toSvgY(v) + 4}
            textAnchor="end" fill="#64748b" fontSize={10} fontFamily="Space Mono, monospace">
            {v % 1 === 0 ? v : v.toFixed(1)}
          </text>
        ))}

        {/* Regression line */}
        <path d={linePath} fill="none" stroke={lineColor || '#3b82f6'} strokeWidth={2.5}
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Train dots */}
        {trainDots.map((d, i) => (
          <circle key={`tr-${i}`}
            cx={toSvgX(d.x)} cy={toSvgY(d.y)} r={5}
            fill="#3b82f6" fillOpacity={0.75} stroke="#1e3a5f" strokeWidth={1}
            style={{ cursor: 'crosshair' }}
            onMouseEnter={e => setTooltip({ x: d.x, y: d.y, type: 'Train', svgX: toSvgX(d.x), svgY: toSvgY(d.y) })}
          />
        ))}

        {/* Test dots */}
        {testDots.map((d, i) => (
          <circle key={`te-${i}`}
            cx={toSvgX(d.x)} cy={toSvgY(d.y)} r={5}
            fill="#f59e0b" fillOpacity={0.85} stroke="#78350f" strokeWidth={1}
            style={{ cursor: 'crosshair' }}
            onMouseEnter={e => setTooltip({ x: d.x, y: d.y, type: 'Test', svgX: toSvgX(d.x), svgY: toSvgY(d.y) })}
          />
        ))}

        {/* Tooltip */}
        {tooltip && (() => {
          const tx = tooltip.svgX + 12
          const ty = tooltip.svgY - 36
          return (
            <g>
              <rect x={tx} y={ty} width={130} height={40} rx={6}
                fill="#1e293b" stroke="#253650" strokeWidth={1} />
              <text x={tx + 10} y={ty + 14} fill="#94a3b8" fontSize={10} fontFamily="Space Mono, monospace">
                {tooltip.type}
              </text>
              <text x={tx + 10} y={ty + 28} fill="#60a5fa" fontSize={10} fontFamily="Space Mono, monospace">
                x={tooltip.x.toFixed(3)}  y={tooltip.y.toFixed(3)}
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

export default function LinearRegressionPage() {
  const [modelType, setModelType]   = useState('linear')
  const [dataset, setDataset]       = useState('linear')
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  // Params
  const [nSamples, setNSamples]     = useState(80)
  const [noise, setNoise]           = useState(0.3)
  const [testSize, setTestSize]     = useState(0.2)
  const [fitIntercept, setFitIntercept] = useState(true)
  const [degree, setDegree]         = useState(2)
  const [ridgeAlpha, setRidgeAlpha] = useState(1.0)
  const [lassoAlpha, setLassoAlpha] = useState(0.1)
  const [lassoMaxIter, setLassoMaxIter] = useState(1000)
  const [elasticAlpha, setElasticAlpha] = useState(0.1)
  const [elasticL1, setElasticL1]   = useState(0.5)
  const [isNarrow, setIsNarrow]     = useState(() => window.innerWidth < 760)

  const debounceRef = useRef(null)

  const fetchResult = useCallback(async (overrides = {}) => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        model_type: modelType, dataset, n_samples: nSamples,
        noise, test_size: testSize, fit_intercept: fitIntercept,
        degree, ridge_alpha: ridgeAlpha, lasso_alpha: lassoAlpha,
        lasso_max_iter: lassoMaxIter, elastic_alpha: elasticAlpha,
        elastic_l1_ratio: elasticL1, seed: 42,
        ...overrides
      }
      const data = await runLinearRegression(params)
      setResult(data)
    } catch (e) {
      setError('Backend not reachable. Make sure FastAPI is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }, [modelType, dataset, nSamples, noise, testSize, fitIntercept,
      degree, ridgeAlpha, lassoAlpha, lassoMaxIter, elasticAlpha, elasticL1])

  // Debounced auto-fetch on any param change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchResult(), 300)
    return () => clearTimeout(debounceRef.current)
  }, [fetchResult])

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 760)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const activeModel = MODELS.find(m => m.id === modelType)

  const trainDots = result?.scatter.train || []
  const testDots  = result?.scatter.test  || []

  const m = result?.metrics
  const coefStr = result?.model_info?.coef
    ?.map((c, i) => `${c >= 0 && i > 0 ? '+' : ''}${c.toFixed(3)}x${i > 1 ? `^${i}` : i === 1 ? '' : ''}`)
    .join(' ') || ''

  return (
    <div style={{
      display: 'flex',
      flexDirection: isNarrow ? 'column' : 'row',
      gap: isNarrow ? 12 : 20,
      height: '100%',
      minHeight: 0,
      overflow: 'hidden',
    }}>

      {/* ─── LEFT PANEL ─────────────────────────────── */}
      <div style={{
        width: isNarrow ? '100%' : 'clamp(250px, 32vw, 310px)',
        maxHeight: isNarrow ? '42vh' : 'none',
        flexShrink: 0,
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 16, padding: 20,
        overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0
      }}>

        {/* Model selector */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Model Type
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {MODELS.map(m => (
              <button key={m.id} onClick={() => setModelType(m.id)} style={{
                background: modelType === m.id ? `rgba(${hexToRgb(m.color)},0.12)` : 'var(--bg3)',
                border: modelType === m.id ? `1.5px solid ${m.color}` : '1.5px solid var(--border)',
                borderRadius: 8, padding: '8px 12px',
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, color: modelType === m.id ? m.color : 'var(--text)', marginBottom: 2 }}>
                  {m.label}
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>
                  {m.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: 20 }} />

        {/* Dataset selector */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Dataset
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {DATASETS.map(d => (
              <button key={d.id} onClick={() => setDataset(d.id)} style={{
                background: dataset === d.id ? 'var(--accent-glow)' : 'var(--bg3)',
                border: dataset === d.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                borderRadius: 8, padding: '8px 10px',
                cursor: 'pointer', textAlign: 'center',
                color: dataset === d.id ? 'var(--accent)' : 'var(--text2)',
                fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500,
                transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{d.icon}</div>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: 20 }} />

        {/* Common params */}
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
          Data Parameters
        </div>
        <SliderControl label="Samples" tooltip="Number of data points to generate. More samples = more stable results but slower." value={nSamples} min={20} max={300} step={5} onChange={setNSamples} format={v => Math.round(v)} />
        <SliderControl label="Noise Level" tooltip="How much random noise is added to the data. High noise makes patterns harder to find." value={noise} min={0.01} max={1.0} step={0.01} onChange={setNoise} format={v => v.toFixed(2)} />
        <SliderControl label="Test Split" tooltip="Fraction of data held out for testing. The model never sees this data during training." value={testSize} min={0.1} max={0.5} step={0.05} onChange={setTestSize} format={v => `${Math.round(v*100)}%`} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setFitIntercept(!fitIntercept)} style={{
            width: 36, height: 20, borderRadius: 10,
            background: fitIntercept ? 'var(--accent)' : 'var(--border2)',
            border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
          }}>
            <span style={{
              position: 'absolute', top: 2,
              left: fitIntercept ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%',
              background: 'white', transition: 'left 0.2s',
            }} />
          </button>
          <span style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--sans)' }}>Fit Intercept</span>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: 20 }} />

        {/* Model-specific params */}
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
          Model Parameters
        </div>

        {modelType === 'polynomial' && (
          <SliderControl label="Degree" tooltip="Polynomial degree. degree=1 is linear; degree=2 fits a parabola; high degrees can overfit badly." value={degree} min={1} max={10} step={1} onChange={setDegree} format={v => Math.round(v)} />
        )}
        {modelType === 'ridge' && (
          <SliderControl label="Alpha (λ)" tooltip="Regularization strength. Higher alpha = stronger penalty = simpler model. α=0 is plain linear regression." value={ridgeAlpha} min={0.001} max={10} step={0.01} onChange={setRidgeAlpha} format={v => v.toFixed(3)} />
        )}
        {modelType === 'lasso' && (
          <>
            <SliderControl label="Alpha (λ)" tooltip="Regularization strength. Lasso can zero out coefficients entirely — watch them disappear at high alpha!" value={lassoAlpha} min={0.001} max={2} step={0.001} onChange={setLassoAlpha} format={v => v.toFixed(3)} />
            <SliderControl label="Max Iterations" tooltip="Maximum solver iterations. Increase if model warns about convergence." value={lassoMaxIter} min={100} max={5000} step={100} onChange={setLassoMaxIter} format={v => Math.round(v)} />
          </>
        )}
        {modelType === 'elasticnet' && (
          <>
            <SliderControl label="Alpha (λ)" tooltip="Overall regularization strength. Controls how much to penalize large coefficients." value={elasticAlpha} min={0.001} max={2} step={0.001} onChange={setElasticAlpha} format={v => v.toFixed(3)} />
            <SliderControl label="L1 Ratio" tooltip="Mix of L1 vs L2 penalty. 0 = pure Ridge, 1 = pure Lasso, 0.5 = equal mix. Slide to see the difference!" value={elasticL1} min={0.0} max={1.0} step={0.01} onChange={setElasticL1} format={v => v.toFixed(2)} />
          </>
        )}
        {modelType === 'linear' && (
          <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--sans)', lineHeight: 1.6, background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
            Plain linear regression has no tunable hyperparameters beyond fit_intercept above. Try switching to Ridge, Lasso, or ElasticNet to explore regularization!
          </div>
        )}

      </div>

      {/* ─── RIGHT PANEL ────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', minWidth: 0, paddingBottom: 8 }}>

        {/* Status / metrics row */}
        {m && (
          <div className="fade-up" style={{ maxWidth: 920, width: '100%', margin: '0 auto' }}>
            <FitStatusBadge status={m.fit_status} />
            <div style={{
              display: 'grid',
              gap: 10,
              gridTemplateColumns: isNarrow ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
            }}>
              <MetricCard label="Train R²" value={m.train_r2.toFixed(3)} sub="Higher = better fit on training data" color="green" />
              <MetricCard label="Test R²"  value={m.test_r2.toFixed(3)}  sub="Higher = better generalization"       color={m.test_r2 > 0.7 ? 'green' : m.test_r2 > 0.4 ? 'yellow' : 'red'} />
              <MetricCard label="Train MSE" value={m.train_mse.toFixed(3)} sub="Mean squared error on train set"    color="default" />
              <MetricCard label="Test MSE"  value={m.test_mse.toFixed(3)}  sub="Mean squared error on test set"     color="default" />
            </div>
          </div>
        )}

        {/* Main scatter + line chart */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '14px 14px 10px',
          width: '100%', maxWidth: 920, margin: '0 auto',
          flex: '0 1 auto', minHeight: 0,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isNarrow ? 'flex-start' : 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 12,
            paddingLeft: 6,
          }}>
            <div>
              <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
                Regression Fit
              </div>
              {result?.model_info?.coef && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  y = {result.model_info.intercept?.toFixed(3) || '0'}{coefStr ? ` ${coefStr}` : ''}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 14, rowGap: 6, flexWrap: 'wrap', fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', marginRight: 5 }} />Train</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', marginRight: 5 }} />Test</span>
              <span><span style={{ display: 'inline-block', width: 20, height: 2, background: activeModel?.color, marginRight: 5, verticalAlign: 'middle' }} />Fit Line</span>
            </div>
          </div>

          {error && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          {loading && !result && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 13 }}>
              loading model...
            </div>
          )}

          {result && (
            <SVGChart
              trainDots={trainDots}
              testDots={testDots}
              line={result.line}
              lineColor={activeModel?.color}
            />
          )}
        </div>

        {/* Equation / coefficient bar */}
        {result?.model_info && modelType !== 'linear' && (
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
            width: '100%', maxWidth: 920, margin: '0 auto',
          }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>Coefficients</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {result.model_info.coef.map((c, i) => (
                <span key={i} style={{
                  fontFamily: 'var(--mono)', fontSize: 12,
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '3px 10px',
                  color: Math.abs(c) < 0.001 ? 'var(--text3)' : 'var(--accent2)'
                }}>
                  {i === 0 ? 'β₀' : `β${i}`} = {c.toFixed(4)}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// Helper
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
