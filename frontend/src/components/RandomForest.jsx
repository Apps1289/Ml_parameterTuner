import React, { useState, useEffect, useCallback, useRef } from 'react'
import { runRandomForest } from '../api'
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
const MAX_FEATURES_OPTIONS = [
  { id:'sqrt', label:'√n (sqrt)',  desc:'Square root of features. Default — good balance.' },
  { id:'log2', label:'log₂n',      desc:'Log2 of features. More aggressive subsampling.' },
  { id:'none', label:'All',        desc:'Use all features per split — loses diversity benefit.' },
]

export default function RandomForestPage() {
  const [dataset,         setDataset]         = useState('moons')
  const [result,          setResult]          = useState(null)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState(null)
  const [nEstimators,     setNEstimators]     = useState(10)
  const [maxDepth,        setMaxDepth]        = useState(5)
  const [maxFeatures,     setMaxFeatures]     = useState('sqrt')
  const [minSamplesSplit, setMinSamplesSplit] = useState(2)
  const [bootstrap,       setBootstrap]       = useState(true)
  const [nSamples,        setNSamples]        = useState(200)
  const [noise,           setNoise]           = useState(0.2)
  const [testSize,        setTestSize]        = useState(0.25)
  const debounceRef = useRef(null)

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await runRandomForest({
        dataset, n_samples:nSamples, noise, test_size:testSize,
        n_estimators:nEstimators, max_depth:maxDepth, max_features:maxFeatures,
        min_samples_split:minSamplesSplit, bootstrap, resolution:80, seed:42,
      })
      setResult(data)
    } catch { setError('Backend not reachable. Make sure FastAPI is running on port 8000.') }
    finally  { setLoading(false) }
  }, [dataset, nSamples, noise, testSize, nEstimators, maxDepth, maxFeatures, minSamplesSplit, bootstrap])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetch, 400)
    return () => clearTimeout(debounceRef.current)
  }, [fetch])

  const m  = result?.metrics
  const mi = result?.model_info
  const importances = mi?.feature_importances || []

  return (
    <div style={{ display:'flex', gap:20, height:'100%', minHeight:0, overflow:'hidden', flexWrap:'wrap' }}>
      {/* LEFT */}
      <div style={{ width:'clamp(250px, 32vw, 310px)', flexShrink:0, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:20, overflowY:'auto' }}>
        <PanelSection label="Dataset">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {DATASETS.map(d => <DsBtn key={d.id} d={d} active={dataset===d.id} onClick={() => setDataset(d.id)} />)}
          </div>
        </PanelSection>
        <Divider />
        <PanelSection label="Data Parameters">
          <SliderControl label="Samples"    value={nSamples} min={50}  max={400} step={10}   onChange={setNSamples}  format={v=>Math.round(v)} tooltip="Number of data points." />
          <SliderControl label="Noise"      value={noise}    min={0.01} max={0.5} step={0.01} onChange={setNoise}     format={v=>v.toFixed(2)}  tooltip="Class overlap." />
          <SliderControl label="Test Split" value={testSize} min={0.1}  max={0.4} step={0.05} onChange={setTestSize}  format={v=>`${Math.round(v*100)}%`} tooltip="Fraction held out for testing." />
        </PanelSection>
        <Divider />
        <PanelSection label="Model Parameters">
          <SliderControl
            label="Trees (n_estimators)"
            tooltip="Number of trees in the forest. More trees = more stable, smoother boundary, slower. Watch the boundary go from jagged (1 tree) to smooth as you add more!"
            value={nEstimators} min={1} max={100} step={1} onChange={setNEstimators} format={v=>Math.round(v)}
          />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text3)', marginBottom:14, marginTop:-8 }}>
            <span>← Unstable (1 tree)</span><span>Stable →</span>
          </div>
          <SliderControl
            label="Max Depth"
            tooltip="Max depth of each individual tree. Shallow trees = high bias but low variance. Deep trees + many of them = powerful ensemble."
            value={maxDepth} min={1} max={15} step={1} onChange={setMaxDepth} format={v=>Math.round(v)}
          />
          <SliderControl
            label="Min Samples Split"
            tooltip="Min samples to split a node in each tree."
            value={minSamplesSplit} min={2} max={20} step={1} onChange={setMinSamplesSplit} format={v=>Math.round(v)}
          />
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8, marginTop:4 }}>Max Features per Split</div>
          <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
            {MAX_FEATURES_OPTIONS.map(f => (
              <button key={f.id} onClick={() => setMaxFeatures(f.id)} style={{
                background: maxFeatures===f.id ? 'rgba(16,185,129,0.1)' : 'var(--bg3)',
                border: maxFeatures===f.id ? '1.5px solid #10b981' : '1.5px solid var(--border)',
                borderRadius:7, padding:'7px 10px', cursor:'pointer', textAlign:'left', transition:'all 0.15s',
              }}>
                <div style={{ fontFamily:'var(--sans)', fontSize:12, fontWeight:600, color:maxFeatures===f.id?'#10b981':'var(--text)', marginBottom:2 }}>{f.label}</div>
                <div style={{ fontFamily:'var(--sans)', fontSize:10, color:'var(--text3)', lineHeight:1.4 }}>{f.desc}</div>
              </button>
            ))}
          </div>
          {/* Bootstrap toggle */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={() => setBootstrap(!bootstrap)} style={{ width:36, height:20, borderRadius:10, background:bootstrap?'#10b981':'var(--border2)', border:'none', cursor:'pointer', position:'relative', transition:'background 0.2s' }}>
              <span style={{ position:'absolute', top:2, left:bootstrap?18:2, width:16, height:16, borderRadius:'50%', background:'white', transition:'left 0.2s' }} />
            </button>
            <div>
              <div style={{ fontSize:12, color:'var(--text2)', fontFamily:'var(--sans)', fontWeight:500 }}>Bootstrap Sampling</div>
              <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--sans)' }}>Each tree trains on a random subset with replacement</div>
            </div>
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
              <MetricCard label="Trees"          value={nEstimators}                         color="default" sub="In the forest" />
              <MetricCard label="Gap"            value={`${(m.gap*100).toFixed(1)}%`}         color={m.gap>0.1?'yellow':'default'} sub="Train − Test" />
            </div>
          </div>
        )}
        <div style={{ display:'flex', gap:14, minHeight:0, flexWrap:'wrap' }}>
          <div style={{ flex:1, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:'16px 16px 10px' }}>
            <ChartHeader title="Decision Boundary — Random Forest" loading={loading && !!result}
              subtitle={`${nEstimators} trees · max_depth=${maxDepth} · max_features=${maxFeatures}`} />
            {error  && <ErrorMsg msg={error} />}
            {!error && <BoundaryChart boundary={result?.boundary} scatter={result?.scatter} loading={loading && !result} />}
          </div>
          <div style={{ width:240, flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
            {result && <ConfusionMatrix cm={m?.confusion_matrix} />}

            {/* Feature importance bar */}
            {importances.length > 0 && (
              <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
                <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Feature Importance</div>
                {importances.map((imp, i) => (
                  <div key={i} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)' }}>Feature {i+1}</span>
                      <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'#10b981' }}>{(imp*100).toFixed(1)}%</span>
                    </div>
                    <div style={{ height:6, background:'var(--border2)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${imp*100}%`, background:'linear-gradient(90deg,#10b981,#059669)', borderRadius:3, transition:'width 0.4s ease' }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:10, padding:'8px 10px', background:'rgba(16,185,129,0.06)', borderRadius:7, border:'1px solid rgba(16,185,129,0.2)', fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)', lineHeight:1.5 }}>
                  💡 Set n_estimators=1 — it's just a Decision Tree. Add more trees and watch the boundary smooth out. That's bagging reducing variance!
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PanelSection({ label, children }) { return <div style={{ marginBottom:20 }}><div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>{label}</div>{children}</div> }
function Divider() { return <div style={{ borderTop:'1px solid var(--border)', marginBottom:20 }} /> }
function DsBtn({ d, active, onClick }) { return <button onClick={onClick} style={{ background:active?'rgba(59,130,246,0.1)':'var(--bg3)', border:active?'1.5px solid var(--accent)':'1.5px solid var(--border)', borderRadius:8, padding:'8px 10px', cursor:'pointer', textAlign:'center', color:active?'var(--accent)':'var(--text2)', fontFamily:'var(--sans)', fontSize:12, fontWeight:500, transition:'all 0.15s' }}><div style={{ fontSize:18, marginBottom:2 }}>{d.icon}</div>{d.label}</button> }
function Legend() { return <PanelSection label="Legend">{[{color:'#3b82f6',label:'Class 0 — Train'},{color:'#f97316',label:'Class 1 — Train'},{color:'#3b82f6',label:'Class 0 — Test',border:'2px solid #fff'},{color:'#f97316',label:'Class 1 — Test',border:'2px solid #fff'}].map((l,i)=><div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}><span style={{ width:10, height:10, borderRadius:'50%', background:l.color, border:l.border||'none', display:'inline-block', flexShrink:0 }} /><span style={{ fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)' }}>{l.label}</span></div>)}<div style={{ display:'flex', alignItems:'center', gap:8, marginTop:2 }}><span style={{ width:24, height:2, background:'white', display:'inline-block', flexShrink:0 }} /><span style={{ fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)' }}>Decision boundary</span></div></PanelSection> }
function ChartHeader({ title, subtitle, loading }) { return <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}><div><div style={{ fontFamily:'var(--sans)', fontWeight:600, fontSize:15, color:'var(--text)' }}>{title}</div>{subtitle&&<div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)', marginTop:2 }}>{subtitle}</div>}</div>{loading&&<div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent)', background:'var(--accent-glow)', borderRadius:20, padding:'3px 10px', border:'1px solid rgba(59,130,246,0.3)' }}>updating...</div>}</div> }
function ErrorMsg({ msg }) { return <div style={{ textAlign:'center', padding:60, color:'var(--red)', fontFamily:'var(--mono)', fontSize:13 }}>⚠️ {msg}</div> }
