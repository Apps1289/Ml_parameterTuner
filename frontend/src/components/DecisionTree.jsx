import React, { useState, useEffect, useCallback, useRef } from 'react'
import { runDecisionTree } from '../api'
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
const CRITERIA = [
  { id:'gini',    label:'Gini',    desc:'Measures impurity. Default — fast and effective.' },
  { id:'entropy', label:'Entropy', desc:'Information gain. Slightly slower, sometimes cleaner splits.' },
]

export default function DecisionTreePage() {
  const [dataset,          setDataset]          = useState('moons')
  const [result,           setResult]           = useState(null)
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState(null)
  const [maxDepth,         setMaxDepth]         = useState(3)
  const [minSamplesSplit,  setMinSamplesSplit]  = useState(2)
  const [minSamplesLeaf,   setMinSamplesLeaf]   = useState(1)
  const [criterion,        setCriterion]        = useState('gini')
  const [nSamples,         setNSamples]         = useState(200)
  const [noise,            setNoise]            = useState(0.2)
  const [testSize,         setTestSize]         = useState(0.25)
  const debounceRef = useRef(null)

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await runDecisionTree({
        dataset, n_samples:nSamples, noise, test_size:testSize,
        max_depth:maxDepth, min_samples_split:minSamplesSplit,
        min_samples_leaf:minSamplesLeaf, criterion, resolution:80, seed:42,
      })
      setResult(data)
    } catch { setError('Backend not reachable. Make sure FastAPI is running on port 8000.') }
    finally  { setLoading(false) }
  }, [dataset, nSamples, noise, testSize, maxDepth, minSamplesSplit, minSamplesLeaf, criterion])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetch, 350)
    return () => clearTimeout(debounceRef.current)
  }, [fetch])

  const m  = result?.metrics
  const mi = result?.model_info

  return (
    <div style={{ display:'flex', gap:20, height:'100%', minHeight:0, overflow:'hidden', flexWrap:'wrap' }}>
      {/* LEFT */}
      <div style={{ width:'clamp(250px, 32vw, 310px)', flexShrink:0, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:20, overflowY:'auto' }}>
        <PanelSection label="Dataset">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {DATASETS.map(d => (
              <DsBtn key={d.id} d={d} active={dataset===d.id} onClick={() => setDataset(d.id)} />
            ))}
          </div>
        </PanelSection>
        <Divider />
        <PanelSection label="Data Parameters">
          <SliderControl label="Samples"    value={nSamples} min={50}  max={400} step={10}   onChange={setNSamples}        format={v=>Math.round(v)} tooltip="Number of data points." />
          <SliderControl label="Noise"      value={noise}    min={0.01} max={0.5} step={0.01} onChange={setNoise}           format={v=>v.toFixed(2)}  tooltip="Class overlap." />
          <SliderControl label="Test Split" value={testSize} min={0.1}  max={0.4} step={0.05} onChange={setTestSize}        format={v=>`${Math.round(v*100)}%`} tooltip="Fraction held out for testing." />
        </PanelSection>
        <Divider />
        <PanelSection label="Model Parameters">
          <SliderControl
            label="Max Depth"
            tooltip="How deep the tree can grow. depth=1 = one split (underfitting). High depth = many splits = overfitting. Watch the boundary go from simple rectangles to a complex maze!"
            value={maxDepth} min={1} max={20} step={1} onChange={setMaxDepth} format={v=>Math.round(v)}
          />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text3)', marginBottom:14, marginTop:-8 }}>
            <span>← Underfit</span><span>Overfit →</span>
          </div>
          <SliderControl
            label="Min Samples Split"
            tooltip="Minimum samples required to split a node. Higher = simpler tree (fewer splits allowed)."
            value={minSamplesSplit} min={2} max={20} step={1} onChange={setMinSamplesSplit} format={v=>Math.round(v)}
          />
          <SliderControl
            label="Min Samples Leaf"
            tooltip="Minimum samples required at a leaf node. Acts as smoothing — prevents tiny leaf regions."
            value={minSamplesLeaf} min={1} max={20} step={1} onChange={setMinSamplesLeaf} format={v=>Math.round(v)}
          />
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8, marginTop:4 }}>Split Criterion</div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {CRITERIA.map(c => (
              <button key={c.id} onClick={() => setCriterion(c.id)} style={{
                background: criterion===c.id ? 'rgba(59,130,246,0.1)' : 'var(--bg3)',
                border: criterion===c.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                borderRadius:7, padding:'7px 10px', cursor:'pointer', textAlign:'left', transition:'all 0.15s',
              }}>
                <div style={{ fontFamily:'var(--sans)', fontSize:12, fontWeight:600, color:criterion===c.id?'var(--accent)':'var(--text)', marginBottom:2 }}>{c.label}</div>
                <div style={{ fontFamily:'var(--sans)', fontSize:10, color:'var(--text3)', lineHeight:1.4 }}>{c.desc}</div>
              </button>
            ))}
          </div>
        </PanelSection>
        <Divider />
        <Legend />
      </div>

      {/* RIGHT */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:14, overflowY:'auto', minWidth:0 }}>
        {m && (
          <div className="fade-up">
            <FitStatusBadge status={m.fit_status} />
            <div style={{ display:'flex', gap:10 }}>
              <MetricCard label="Train Accuracy" value={`${(m.train_acc*100).toFixed(1)}%`} color="green"   sub="On training data" />
              <MetricCard label="Test Accuracy"  value={`${(m.test_acc *100).toFixed(1)}%`} color={m.test_acc>0.85?'green':m.test_acc>0.7?'yellow':'red'} sub="On unseen data" />
              <MetricCard label="Tree Depth"     value={mi?.depth_used ?? '—'}              color="default" sub={`of max ${maxDepth} allowed`} />
              <MetricCard label="Leaf Nodes"     value={mi?.n_leaves   ?? '—'}              color="default" sub="Terminal nodes" />
            </div>
          </div>
        )}
        <div style={{ display:'flex', gap:14, minHeight:0, flexWrap:'wrap' }}>
          <div style={{ flex:1, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:'16px 16px 10px' }}>
            <ChartHeader title="Decision Boundary — Decision Tree" loading={loading && !!result}
              subtitle={`max_depth=${maxDepth} · criterion=${criterion} · leaves=${mi?.n_leaves??'—'}`} />
            {error  && <ErrorMsg msg={error} />}
            {!error && <BoundaryChart boundary={result?.boundary} scatter={result?.scatter} loading={loading && !result} />}
          </div>
          <div style={{ width:240, flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
            {result && <ConfusionMatrix cm={m?.confusion_matrix} />}
            {mi && (
              <InfoBox items={[
                ['Max Depth',          maxDepth],
                ['Depth Used',         mi.depth_used],
                ['Leaf Nodes',         mi.n_leaves],
                ['Criterion',          mi.criterion],
                ['Min Samples Split',  mi.min_samples_split],
              ]} tip="💡 Set max_depth=1 — you get a single split: one straight line. Increase slowly and watch the boundary grow rectangular 'rooms'. At depth=15+ it perfectly memorises every point — pure overfitting!" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────
function PanelSection({ label, children }) {
  return <div style={{ marginBottom:20 }}><div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>{label}</div>{children}</div>
}
function Divider() { return <div style={{ borderTop:'1px solid var(--border)', marginBottom:20 }} /> }
function DsBtn({ d, active, onClick }) {
  return (
    <button onClick={onClick} style={{ background:active?'rgba(59,130,246,0.1)':'var(--bg3)', border:active?'1.5px solid var(--accent)':'1.5px solid var(--border)', borderRadius:8, padding:'8px 10px', cursor:'pointer', textAlign:'center', color:active?'var(--accent)':'var(--text2)', fontFamily:'var(--sans)', fontSize:12, fontWeight:500, transition:'all 0.15s' }}>
      <div style={{ fontSize:18, marginBottom:2 }}>{d.icon}</div>{d.label}
    </button>
  )
}
function Legend() {
  return (
    <PanelSection label="Legend">
      {[{color:'#3b82f6',label:'Class 0 — Train'},{color:'#f97316',label:'Class 1 — Train'},{color:'#3b82f6',label:'Class 0 — Test',border:'2px solid #fff'},{color:'#f97316',label:'Class 1 — Test',border:'2px solid #fff'}].map((l,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:l.color, border:l.border||'none', display:'inline-block', flexShrink:0 }} />
          <span style={{ fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)' }}>{l.label}</span>
        </div>
      ))}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:2 }}>
        <span style={{ width:24, height:2, background:'white', display:'inline-block', flexShrink:0 }} />
        <span style={{ fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)' }}>Decision boundary</span>
      </div>
    </PanelSection>
  )
}
function ChartHeader({ title, subtitle, loading }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
      <div>
        <div style={{ fontFamily:'var(--sans)', fontWeight:600, fontSize:15, color:'var(--text)' }}>{title}</div>
        {subtitle && <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)', marginTop:2 }}>{subtitle}</div>}
      </div>
      {loading && <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent)', background:'var(--accent-glow)', borderRadius:20, padding:'3px 10px', border:'1px solid rgba(59,130,246,0.3)' }}>updating...</div>}
    </div>
  )
}
function ErrorMsg({ msg }) { return <div style={{ textAlign:'center', padding:60, color:'var(--red)', fontFamily:'var(--mono)', fontSize:13 }}>⚠️ {msg}</div> }
function InfoBox({ items, tip }) {
  return (
    <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
      <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Model Info</div>
      <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:12 }}>
        {items.map(([k,v])=>(<div key={k} style={{ display:'flex', justifyContent:'space-between' }}><span style={{ fontSize:11, color:'var(--text3)' }}>{k}</span><span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent2)' }}>{v}</span></div>))}
      </div>
      {tip && <div style={{ padding:'8px 10px', background:'rgba(59,130,246,0.06)', borderRadius:7, border:'1px solid rgba(59,130,246,0.15)', fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)', lineHeight:1.5 }}>{tip}</div>}
    </div>
  )
}
