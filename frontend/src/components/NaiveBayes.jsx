import React, { useState, useEffect, useCallback, useRef } from 'react'
import { runNaiveBayes } from '../api'
import SliderControl from './SliderControl'
import MetricCard from './MetricCard'
import FitStatusBadge from './FitStatusBadge'
import { BoundaryChart, ConfusionMatrix } from './ClassifierShared'

const DATASETS = [
  { id:'blobs',   label:'Blobs',   icon:'🫧' },
  { id:'moons',   label:'Moons',   icon:'🌙' },
  { id:'linear',  label:'Linear',  icon:'📐' },
  { id:'circles', label:'Circles', icon:'⭕' },
]

export default function NaiveBayesPage() {
  const [dataset,          setDataset]          = useState('blobs')
  const [result,           setResult]           = useState(null)
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState(null)
  const [varSmoothingExp,  setVarSmoothingExp]  = useState(-9)
  const [nSamples,         setNSamples]         = useState(200)
  const [noise,            setNoise]            = useState(0.2)
  const [testSize,         setTestSize]         = useState(0.25)
  const debounceRef = useRef(null)

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await runNaiveBayes({
        dataset, n_samples:nSamples, noise, test_size:testSize,
        var_smoothing_exp:varSmoothingExp, resolution:80, seed:42,
      })
      setResult(data)
    } catch { setError('Backend not reachable. Make sure FastAPI is running on port 8000.') }
    finally  { setLoading(false) }
  }, [dataset, nSamples, noise, testSize, varSmoothingExp])

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
            label="Var Smoothing (log₁₀)"
            tooltip="Adds a small value to variances to prevent division by zero. 10^(-9) is the default. Increase (toward 0) for more smoothing — useful when features have very small variance."
            value={varSmoothingExp} min={-12} max={-1} step={0.5} onChange={setVarSmoothingExp}
            format={v=>`10^${v.toFixed(1)}`}
          />
          {mi && (
            <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', marginTop:8 }}>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>var_smoothing value</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--accent2)' }}>
                {mi.var_smoothing.toExponential(2)}
              </div>
            </div>
          )}
        </Sec>
        <Hr />

        {/* Naive Bayes explanation */}
        <Sec label="How It Works">
          <div style={{ fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)', lineHeight:1.7, background:'var(--bg3)', borderRadius:8, padding:'12px 14px', border:'1px solid var(--border)' }}>
            <div style={{ fontWeight:600, color:'var(--text)', marginBottom:6 }}>Bayes Theorem</div>
            Naive Bayes assumes all features are <span style={{ color:'var(--accent)' }}>conditionally independent</span> given the class label — the "naive" assumption.
            <br /><br />
            <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent2)', background:'var(--bg2)', padding:'6px 8px', borderRadius:5, marginBottom:8 }}>
              P(class|x) ∝ P(x|class) · P(class)
            </div>
            Gaussian NB models each feature as a <span style={{ color:'#10b981' }}>Gaussian distribution</span>. The boundary is where the two Gaussians are equally likely.
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
              <MetricCard label="Var Smoothing"  value={`10^${varSmoothingExp}`} color="default" sub="Smoothing exponent" />
              <MetricCard label="Classes"        value={mi?.class_stats?.length ?? 2} color="default" sub="Distinct labels" />
            </div>
          </div>
        )}
        <div style={{ display:'flex', gap:14, minHeight:0, flexWrap:'wrap' }}>
          <div style={{ flex:1, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:'16px 16px 10px' }}>
            <ChartHeader title="Decision Boundary — Gaussian Naive Bayes" loading={loading && !!result}
              subtitle={`Gaussian NB · var_smoothing=10^${varSmoothingExp}`} />
            {error  && <ErrMsg msg={error} />}
            {!error && <BoundaryChart boundary={result?.boundary} scatter={result?.scatter} loading={loading && !result} />}
          </div>
          <div style={{ width:240, flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
            {result && <ConfusionMatrix cm={m?.confusion_matrix} />}
            {mi?.class_stats && (
              <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
                <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Class Statistics</div>
                {mi.class_stats.map((cs, i) => (
                  <div key={i} style={{ marginBottom:12, padding:'8px 10px', background:'var(--bg2)', borderRadius:7, border:`1px solid ${i===0?'#3b82f640':'#f9731640'}` }}>
                    <div style={{ fontFamily:'var(--sans)', fontSize:12, fontWeight:700, color:i===0?'#3b82f6':'#f97316', marginBottom:4 }}>Class {cs.class}</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontSize:10, color:'var(--text3)' }}>Prior P(class)</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent2)' }}>{cs.prior}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontSize:10, color:'var(--text3)' }}>Mean (f1, f2)</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent2)' }}>{cs.mean.map(v=>v.toFixed(2)).join(', ')}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontSize:10, color:'var(--text3)' }}>Variance</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent2)' }}>{cs.var.map(v=>v.toFixed(2)).join(', ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ padding:'8px 10px', background:'rgba(59,130,246,0.06)', borderRadius:7, border:'1px solid rgba(59,130,246,0.15)', fontSize:11, color:'var(--text2)', lineHeight:1.5 }}>
                  💡 Naive Bayes is extremely fast and works well on Blobs (Gaussian data). Try Circles — it completely fails because the independence assumption is violated!
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
