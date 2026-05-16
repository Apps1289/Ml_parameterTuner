import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { runSVM } from '../api'
import SliderControl from './SliderControl'
import MetricCard from './MetricCard'
import FitStatusBadge from './FitStatusBadge'
import { BoundaryChart, ConfusionMatrix } from './ClassifierShared'

const DATASETS = [
  { id:'moons',   label:'Moons',   icon:'🌙' },
  { id:'circles', label:'Circles', icon:'⭕' },
  { id:'blobs',   label:'Blobs',   icon:'🫧' },
  { id:'linear',  label:'Linear',  icon:'📐' },
]

const KERNELS = [
  { id:'rbf',     label:'RBF',     color:'#8b5cf6', desc:'Gaussian kernel — fits any shape. Most powerful, controlled by gamma.' },
  { id:'linear',  label:'Linear',  color:'#3b82f6', desc:'Only a straight line. Fast, good baseline for linearly separable data.' },
  { id:'poly',    label:'Poly',    color:'#10b981', desc:'Polynomial kernel — fits curved boundaries. Controlled by degree.' },
  { id:'sigmoid', label:'Sigmoid', color:'#f59e0b', desc:'Neural network-like kernel. Often less effective but interesting.' },
]

export default function SVMPage() {
  const [dataset,  setDataset]  = useState('moons')
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const [kernel,   setKernel]   = useState('rbf')
  const [C,        setC]        = useState(1.0)
  const [gamma,    setGamma]    = useState(1.0)
  const [degree,   setDegree]   = useState(3)
  const [coef0,    setCoef0]    = useState(0.0)
  const [nSamples, setNSamples] = useState(200)
  const [noise,    setNoise]    = useState(0.2)
  const [testSize, setTestSize] = useState(0.25)

  const debounceRef = useRef(null)

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await runSVM({
        dataset, n_samples:nSamples, noise, test_size:testSize,
        C, kernel, gamma, degree, coef0, resolution:80, seed:42,
      })
      setResult(data)
    } catch {
      setError('Backend not reachable. Make sure FastAPI is running on port 8000.')
    } finally { setLoading(false) }
  }, [dataset, nSamples, noise, testSize, C, kernel, gamma, degree, coef0])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetch, 350)
    return () => clearTimeout(debounceRef.current)
  }, [fetch])

  const m = result?.metrics
  const activeKernel = KERNELS.find(k => k.id === kernel)

  // Support vectors as SVG markers — overlaid on the chart
  // (We don't get their coordinates from the API, so we highlight them
  //  with a count badge instead, keeping payload small)
  const nSV = result?.model_info?.n_support_vectors

  return (
    <div style={{ display:'flex', gap:20, height:'100%', minHeight:0, overflow:'hidden', flexWrap:'wrap' }}>

      {/* ─── LEFT PANEL ─── */}
      <div style={{
        width:'clamp(250px, 32vw, 310px)', flexShrink:0, background:'var(--panel)',
        border:'1px solid var(--border)', borderRadius:16,
        padding:20, overflowY:'auto',
      }}>

        {/* Dataset */}
        <Section label="Dataset">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {DATASETS.map(d => (
              <button key={d.id} onClick={() => setDataset(d.id)} style={{
                background: dataset===d.id ? 'rgba(59,130,246,0.1)' : 'var(--bg3)',
                border: dataset===d.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                borderRadius:8, padding:'8px 10px', cursor:'pointer', textAlign:'center',
                color: dataset===d.id ? 'var(--accent)' : 'var(--text2)',
                fontFamily:'var(--sans)', fontSize:12, fontWeight:500, transition:'all 0.15s',
              }}>
                <div style={{ fontSize:18, marginBottom:2 }}>{d.icon}</div>
                {d.label}
              </button>
            ))}
          </div>
        </Section>

        <Divider />

        <Section label="Data Parameters">
          <SliderControl label="Samples"    tooltip="Number of data points." value={nSamples} min={50} max={400} step={10} onChange={setNSamples} format={v=>Math.round(v)} />
          <SliderControl label="Noise"      tooltip="Class overlap." value={noise} min={0.01} max={0.5} step={0.01} onChange={setNoise} format={v=>v.toFixed(2)} />
          <SliderControl label="Test Split" tooltip="Fraction held out for testing." value={testSize} min={0.1} max={0.4} step={0.05} onChange={setTestSize} format={v=>`${Math.round(v*100)}%`} />
        </Section>

        <Divider />

        <Section label="Kernel">
          <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
            {KERNELS.map(k => (
              <button key={k.id} onClick={() => setKernel(k.id)} style={{
                background: kernel===k.id ? `${k.color}18` : 'var(--bg3)',
                border: kernel===k.id ? `1.5px solid ${k.color}` : '1.5px solid var(--border)',
                borderRadius:7, padding:'8px 10px', cursor:'pointer', textAlign:'left', transition:'all 0.15s',
              }}>
                <div style={{ fontFamily:'var(--sans)', fontSize:13, fontWeight:600, color:kernel===k.id?k.color:'var(--text)', marginBottom:2 }}>{k.label}</div>
                <div style={{ fontFamily:'var(--sans)', fontSize:10, color:'var(--text3)', lineHeight:1.4 }}>{k.desc}</div>
              </button>
            ))}
          </div>
        </Section>

        <Divider />

        <Section label="Model Parameters">
          {/* C — works for all kernels */}
          <SliderControl
            label="C (margin hardness)"
            tooltip="How much misclassification is tolerated. Small C = wide soft margin (some errors OK). Large C = narrow hard margin (tries to classify everything correctly, risk of overfitting)."
            value={C} min={0.01} max={20} step={0.01} onChange={setC} format={v=>v.toFixed(2)}
          />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text3)', marginBottom:14, marginTop:-8 }}>
            <span>← Wide margin</span><span>Hard margin →</span>
          </div>

          {/* Gamma — RBF, poly, sigmoid */}
          {['rbf','poly','sigmoid'].includes(kernel) && (
            <>
              <SliderControl
                label="Gamma (γ)"
                tooltip="Controls how far the influence of a single training point reaches. Low gamma = large neighbourhood = smooth boundary. High gamma = tight neighbourhood = wiggly, overfit boundary."
                value={gamma} min={0.01} max={10} step={0.01} onChange={setGamma} format={v=>v.toFixed(2)}
              />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text3)', marginBottom:14, marginTop:-8 }}>
                <span>← Smooth</span><span>Wiggly / overfit →</span>
              </div>
            </>
          )}

          {/* Degree — poly only */}
          {kernel === 'poly' && (
            <SliderControl
              label="Degree"
              tooltip="Polynomial degree. degree=2 fits parabolic boundaries, degree=3 cubic, etc. Higher degree = more flexible but can overfit."
              value={degree} min={2} max={8} step={1} onChange={setDegree} format={v=>Math.round(v)}
            />
          )}

          {/* coef0 — poly + sigmoid */}
          {['poly','sigmoid'].includes(kernel) && (
            <SliderControl
              label="coef0"
              tooltip="Independent term in poly/sigmoid kernels. Shifts the kernel function."
              value={coef0} min={-2} max={2} step={0.1} onChange={setCoef0} format={v=>v.toFixed(1)}
            />
          )}
        </Section>

        <Divider />
        <Legend />
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:14, overflowY:'auto', minWidth:0 }}>

        {m && (
          <div className="fade-up">
            <FitStatusBadge status={m.fit_status} />
            <div style={{ display:'flex', gap:10 }}>
              <MetricCard label="Train Accuracy" value={`${(m.train_acc*100).toFixed(1)}%`} sub="On training data" color="green" />
              <MetricCard label="Test Accuracy"  value={`${(m.test_acc *100).toFixed(1)}%`} sub="On unseen data"   color={m.test_acc>0.85?'green':m.test_acc>0.7?'yellow':'red'} />
              <MetricCard label="Support Vectors" value={nSV ?? '—'} sub="Points on the margin" color="default" />
              <MetricCard label="Kernel"          value={kernel.toUpperCase()} sub="Active kernel type" color="default" />
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:14, minHeight:0, flexWrap:'wrap' }}>
          <div style={{ flex:1, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:'16px 16px 10px' }}>
            <ChartHeader
              title="Decision Boundary — SVM"
              loading={loading && !!result}
              subtitle={`kernel=${kernel} · C=${C.toFixed(2)}${['rbf','poly','sigmoid'].includes(kernel) ? ` · γ=${gamma.toFixed(2)}` : ''}${kernel==='poly'?` · deg=${degree}`:''}`}
              accentColor={activeKernel?.color}
            />
            {error && <ErrorMsg msg={error} />}
            {!error && (
              <BoundaryChart boundary={result?.boundary} scatter={result?.scatter} loading={loading && !result} />
            )}
          </div>

          <div style={{ width:240, flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
            {result && <ConfusionMatrix cm={m?.confusion_matrix} />}
            {result?.model_info && (
              <InfoBox items={[
                ['Kernel',  result.model_info.kernel],
                ['C',       result.model_info.C.toFixed(3)],
                ['γ (gamma)', result.model_info.gamma.toFixed(3)],
                ['Support vectors', result.model_info.n_support_vectors],
              ]}
              tip={
                kernel==='rbf'
                  ? '💡 Try Circles dataset + RBF kernel — only SVM can separate them cleanly! Then compare with Logistic Regression on the same data.'
                  : kernel==='linear'
                  ? '💡 Linear SVM on non-linear data shows its limits. Switch to RBF to see the power of the kernel trick.'
                  : '💡 Increase gamma slowly and watch the boundary wrap tighter around training points — until it overfits.'
              } />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>{label}</div>
      {children}
    </div>
  )
}
function Divider() { return <div style={{ borderTop:'1px solid var(--border)', marginBottom:20 }} /> }
function Legend() {
  return (
    <Section label="Legend">
      {[
        { color:'#3b82f6', label:'Class 0 — Train' },
        { color:'#f97316', label:'Class 1 — Train' },
        { color:'#3b82f6', label:'Class 0 — Test', border:'2px solid #fff' },
        { color:'#f97316', label:'Class 1 — Test', border:'2px solid #fff' },
      ].map((l,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:l.color, border:l.border||'none', display:'inline-block', flexShrink:0 }} />
          <span style={{ fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)' }}>{l.label}</span>
        </div>
      ))}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:2 }}>
        <span style={{ width:24, height:2, background:'white', display:'inline-block', flexShrink:0 }} />
        <span style={{ fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)' }}>Decision boundary (P=0.5)</span>
      </div>
    </Section>
  )
}
function ChartHeader({ title, subtitle, loading, accentColor }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
      <div>
        <div style={{ fontFamily:'var(--sans)', fontWeight:600, fontSize:15, color:'var(--text)' }}>{title}</div>
        {subtitle && <div style={{ fontFamily:'var(--mono)', fontSize:11, color:accentColor||'var(--text3)', marginTop:2 }}>{subtitle}</div>}
      </div>
      {loading && (
        <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent)', background:'var(--accent-glow)', borderRadius:20, padding:'3px 10px', border:'1px solid rgba(59,130,246,0.3)' }}>
          updating...
        </div>
      )}
    </div>
  )
}
function ErrorMsg({ msg }) {
  return <div style={{ textAlign:'center', padding:60, color:'var(--red)', fontFamily:'var(--mono)', fontSize:13 }}>⚠️ {msg}</div>
}
function InfoBox({ items, tip }) {
  return (
    <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
      <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Model Info</div>
      <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:12 }}>
        {items.map(([k,v]) => (
          <div key={k} style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:11, color:'var(--text3)' }}>{k}</span>
            <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent2)' }}>{v}</span>
          </div>
        ))}
      </div>
      {tip && (
        <div style={{ padding:'8px 10px', background:'rgba(59,130,246,0.06)', borderRadius:7, border:'1px solid rgba(59,130,246,0.15)', fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)', lineHeight:1.5 }}>
          {tip}
        </div>
      )}
    </div>
  )
}
