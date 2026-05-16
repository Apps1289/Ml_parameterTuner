import React, { useState, useEffect, useCallback, useRef } from 'react'
import { runGradientBoosting } from '../api'
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

export default function GradientBoostingPage() {
  const [dataset,      setDataset]      = useState('moons')
  const [result,       setResult]       = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [nEstimators,  setNEstimators]  = useState(100)
  const [learningRate, setLearningRate] = useState(0.1)
  const [maxDepth,     setMaxDepth]     = useState(3)
  const [subsample,    setSubsample]    = useState(1.0)
  const [nSamples,     setNSamples]     = useState(200)
  const [noise,        setNoise]        = useState(0.2)
  const [testSize,     setTestSize]     = useState(0.25)
  const debounceRef = useRef(null)

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await runGradientBoosting({
        dataset, n_samples:nSamples, noise, test_size:testSize,
        n_estimators:nEstimators, learning_rate:learningRate,
        max_depth:maxDepth, subsample, resolution:80, seed:42,
      })
      setResult(data)
    } catch { setError('Backend not reachable. Make sure FastAPI is running on port 8000.') }
    finally  { setLoading(false) }
  }, [dataset, nSamples, noise, testSize, nEstimators, learningRate, maxDepth, subsample])

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
        <Sec label="Dataset">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {DATASETS.map(d => <DsBtn key={d.id} d={d} active={dataset===d.id} onClick={()=>setDataset(d.id)} />)}
          </div>
        </Sec>
        <Hr />
        <Sec label="Data Parameters">
          <SliderControl label="Samples"    value={nSamples} min={50}  max={400} step={10}   onChange={setNSamples}  format={v=>Math.round(v)} tooltip="Number of data points." />
          <SliderControl label="Noise"      value={noise}    min={0.01} max={0.5} step={0.01} onChange={setNoise}     format={v=>v.toFixed(2)}  tooltip="Class overlap." />
          <SliderControl label="Test Split" value={testSize} min={0.1}  max={0.4} step={0.05} onChange={setTestSize}  format={v=>`${Math.round(v*100)}%`} tooltip="Fraction held out for testing." />
        </Sec>
        <Hr />
        <Sec label="Model Parameters">
          <SliderControl
            label="Trees (n_estimators)"
            tooltip="Number of boosting stages. More trees = better fit but slower and risk of overfitting. Unlike Random Forest, adding too many trees CAN overfit."
            value={nEstimators} min={10} max={300} step={10} onChange={setNEstimators} format={v=>Math.round(v)}
          />
          <SliderControl
            label="Learning Rate"
            tooltip="How much each tree contributes. Small rate = need more trees but more robust. Large rate = fewer trees but unstable. Learning rate and n_estimators trade off!"
            value={learningRate} min={0.01} max={1.0} step={0.01} onChange={setLearningRate} format={v=>v.toFixed(2)}
          />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text3)', marginBottom:14, marginTop:-8 }}>
            <span>← Careful steps</span><span>Big jumps →</span>
          </div>
          <SliderControl
            label="Max Depth"
            tooltip="Depth of each weak learner tree. Gradient Boosting works best with shallow trees (depth 1-5). Deep trees = each stage overfits."
            value={maxDepth} min={1} max={8} step={1} onChange={setMaxDepth} format={v=>Math.round(v)}
          />
          <SliderControl
            label="Subsample"
            tooltip="Fraction of samples used per tree. < 1.0 = Stochastic Gradient Boosting — adds randomness, reduces overfitting, speeds training."
            value={subsample} min={0.1} max={1.0} step={0.05} onChange={setSubsample} format={v=>v.toFixed(2)}
          />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text3)', marginBottom:14, marginTop:-8 }}>
            <span>← Stochastic</span><span>Full data →</span>
          </div>
        </Sec>
        <Hr />
        <Legend />
      </div>

      {/* RIGHT */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:14, overflowY:'auto', minWidth:0 }}>
        {m && (
          <div className="fade-up">
            <FitStatusBadge status={m.fit_status} />
            <div style={{ display:'flex', gap:10 }}>
              <MetricCard label="Train Accuracy" value={`${(m.train_acc*100).toFixed(1)}%`} color="green" sub="On training data" />
              <MetricCard label="Test Accuracy"  value={`${(m.test_acc *100).toFixed(1)}%`} color={m.test_acc>0.85?'green':m.test_acc>0.7?'yellow':'red'} sub="On unseen data" />
              <MetricCard label="Trees"          value={nEstimators} color="default" sub="Boosting stages" />
              <MetricCard label="Learning Rate"  value={learningRate.toFixed(2)} color="default" sub="Step size" />
            </div>
          </div>
        )}
        <div style={{ display:'flex', gap:14, minHeight:0, flexWrap:'wrap' }}>
          <div style={{ flex:1, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:'16px 16px 10px' }}>
            <ChartHeader title="Decision Boundary — Gradient Boosting" loading={loading && !!result}
              subtitle={`${nEstimators} stages · lr=${learningRate.toFixed(2)} · depth=${maxDepth} · subsample=${subsample.toFixed(2)}`} />
            {error  && <ErrMsg msg={error} />}
            {!error && <BoundaryChart boundary={result?.boundary} scatter={result?.scatter} loading={loading && !result} />}
          </div>
          <div style={{ width:240, flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
            {result && <ConfusionMatrix cm={m?.confusion_matrix} />}
            {importances.length > 0 && (
              <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
                <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Feature Importance</div>
                {importances.map((imp, i) => (
                  <div key={i} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:11, color:'var(--text2)' }}>Feature {i+1}</span>
                      <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'#f59e0b' }}>{(imp*100).toFixed(1)}%</span>
                    </div>
                    <div style={{ height:6, background:'var(--border2)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${imp*100}%`, background:'linear-gradient(90deg,#f59e0b,#d97706)', borderRadius:3, transition:'width 0.4s' }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:10, padding:'8px 10px', background:'rgba(245,158,11,0.06)', borderRadius:7, border:'1px solid rgba(245,158,11,0.2)', fontSize:11, color:'var(--text2)', lineHeight:1.5 }}>
                  💡 Try learning_rate=0.01 with n_estimators=300 vs learning_rate=0.3 with n_estimators=50 — same performance, very different paths!
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Sec({ label, children }) { return <div style={{ marginBottom:20 }}><div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>{label}</div>{children}</div> }
function Hr() { return <div style={{ borderTop:'1px solid var(--border)', marginBottom:20 }} /> }
function DsBtn({ d, active, onClick }) { return <button onClick={onClick} style={{ background:active?'rgba(59,130,246,0.1)':'var(--bg3)', border:active?'1.5px solid var(--accent)':'1.5px solid var(--border)', borderRadius:8, padding:'8px 10px', cursor:'pointer', textAlign:'center', color:active?'var(--accent)':'var(--text2)', fontFamily:'var(--sans)', fontSize:12, fontWeight:500, transition:'all 0.15s' }}><div style={{ fontSize:18, marginBottom:2 }}>{d.icon}</div>{d.label}</button> }
function Legend() { return <Sec label="Legend">{[{color:'#3b82f6',label:'Class 0 — Train'},{color:'#f97316',label:'Class 1 — Train'},{color:'#3b82f6',label:'Class 0 — Test',border:'2px solid #fff'},{color:'#f97316',label:'Class 1 — Test',border:'2px solid #fff'}].map((l,i)=><div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}><span style={{ width:10, height:10, borderRadius:'50%', background:l.color, border:l.border||'none', display:'inline-block', flexShrink:0 }} /><span style={{ fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)' }}>{l.label}</span></div>)}<div style={{ display:'flex', alignItems:'center', gap:8, marginTop:2 }}><span style={{ width:24, height:2, background:'white', display:'inline-block', flexShrink:0 }} /><span style={{ fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)' }}>Decision boundary</span></div></Sec> }
function ChartHeader({ title, subtitle, loading }) { return <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}><div><div style={{ fontFamily:'var(--sans)', fontWeight:600, fontSize:15, color:'var(--text)' }}>{title}</div>{subtitle&&<div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)', marginTop:2 }}>{subtitle}</div>}</div>{loading&&<div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent)', background:'var(--accent-glow)', borderRadius:20, padding:'3px 10px', border:'1px solid rgba(59,130,246,0.3)' }}>updating...</div>}</div> }
function ErrMsg({ msg }) { return <div style={{ textAlign:'center', padding:60, color:'var(--red)', fontFamily:'var(--mono)', fontSize:13 }}>⚠️ {msg}</div> }
