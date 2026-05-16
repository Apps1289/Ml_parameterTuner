import React, { useState, useEffect, useCallback, useRef } from 'react'
import { runCompare } from '../api'
import SliderControl from './SliderControl'
import { BoundaryChart } from './ClassifierShared'

const DATASETS = [
  { id:'moons',   label:'Moons',   icon:'🌙' },
  { id:'circles', label:'Circles', icon:'⭕' },
  { id:'blobs',   label:'Blobs',   icon:'🫧' },
  { id:'linear',  label:'Linear',  icon:'📐' },
]

const ALL_MODELS = [
  { id:'logistic',      label:'Logistic',      color:'#3b82f6', emoji:'🔵' },
  { id:'knn',           label:'KNN',           color:'#f59e0b', emoji:'📍' },
  { id:'svm',           label:'SVM',           color:'#8b5cf6', emoji:'📐' },
  { id:'decision_tree', label:'Decision Tree', color:'#10b981', emoji:'🌲' },
  { id:'random_forest', label:'Random Forest', color:'#ef4444', emoji:'🌳' },
]

function ModelParamPanel({ prefix, modelId, params, setParams }) {
  const set = (k, v) => setParams(p => ({ ...p, [`${prefix}_${k}`]: v }))
  const get = k => params[`${prefix}_${k}`]
  return (
    <div>
      {(modelId === 'logistic' || modelId === 'svm') && (
        <SliderControl label="C" tooltip="Higher C = more complex boundary." value={get('C')} min={0.01} max={10} step={0.01} onChange={v=>set('C',v)} format={v=>v.toFixed(2)} />
      )}
      {modelId === 'svm' && (
        <SliderControl label="Gamma γ" tooltip="Higher gamma = tighter boundary." value={get('gamma')} min={0.01} max={10} step={0.01} onChange={v=>set('gamma',v)} format={v=>v.toFixed(2)} />
      )}
      {modelId === 'knn' && (
        <SliderControl label="K neighbours" tooltip="Lower K = complex. Higher K = smooth." value={get('k')} min={1} max={25} step={1} onChange={v=>set('k',v)} format={v=>Math.round(v)} />
      )}
      {(modelId === 'decision_tree' || modelId === 'random_forest') && (
        <SliderControl label="Max Depth" tooltip="Higher depth = more complex boundary." value={get('max_depth')} min={1} max={12} step={1} onChange={v=>set('max_depth',v)} format={v=>Math.round(v)} />
      )}
      {modelId === 'random_forest' && (
        <SliderControl label="Trees" tooltip="More trees = smoother boundary." value={get('n_estimators')} min={1} max={50} step={1} onChange={v=>set('n_estimators',v)} format={v=>Math.round(v)} />
      )}
    </div>
  )
}

export default function ModelComparisonPage() {
  const [dataset,  setDataset]  = useState('moons')
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [modelA,   setModelA]   = useState('logistic')
  const [modelB,   setModelB]   = useState('svm')
  const [nSamples, setNSamples] = useState(200)
  const [noise,    setNoise]    = useState(0.2)
  const [params,   setParams]   = useState({
    a_C:1.0, a_penalty:'l2', a_k:5, a_kernel:'rbf', a_gamma:1.0, a_max_depth:4, a_n_estimators:20,
    b_C:1.0, b_penalty:'l2', b_k:5, b_kernel:'rbf', b_gamma:1.0, b_max_depth:4, b_n_estimators:20,
  })
  const debounceRef = useRef(null)

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await runCompare({
        dataset, n_samples:nSamples, noise, test_size:0.25, resolution:80, seed:42,
        model_a:modelA, model_b:modelB, ...params,
      })
      setResult(data)
    } catch { setError('Backend not reachable. Make sure FastAPI is running on port 8000.') }
    finally  { setLoading(false) }
  }, [dataset, nSamples, noise, modelA, modelB, params])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetch, 400)
    return () => clearTimeout(debounceRef.current)
  }, [fetch])

  const colA = ALL_MODELS.find(m=>m.id===modelA)?.color || '#3b82f6'
  const colB = ALL_MODELS.find(m=>m.id===modelB)?.color || '#8b5cf6'
  const winner = result
    ? result.a.metrics.test_acc > result.b.metrics.test_acc ? 'a'
    : result.b.metrics.test_acc > result.a.metrics.test_acc ? 'b' : 'tie'
    : null

  return (
    <div style={{ display:'flex', gap:16, height:'100%', minHeight:0, overflow:'hidden', flexWrap:'wrap' }}>

      {/* ─── LEFT PANEL ─── */}
      <div style={{ width:'clamp(220px, 26vw, 260px)', flexShrink:0, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:16, overflowY:'auto' }}>

        <Sec label="Dataset">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
            {DATASETS.map(d => (
              <button key={d.id} onClick={()=>setDataset(d.id)} style={{ background:dataset===d.id?'rgba(59,130,246,0.1)':'var(--bg3)', border:dataset===d.id?'1.5px solid var(--accent)':'1.5px solid var(--border)', borderRadius:7, padding:'6px 8px', cursor:'pointer', textAlign:'center', color:dataset===d.id?'var(--accent)':'var(--text2)', fontFamily:'var(--sans)', fontSize:11, fontWeight:500, transition:'all 0.15s' }}>
                <div style={{ fontSize:16, marginBottom:1 }}>{d.icon}</div>{d.label}
              </button>
            ))}
          </div>
        </Sec>
        <Hr />

        <Sec label="Data">
          <SliderControl label="Samples" value={nSamples} min={80} max={400} step={10} onChange={setNSamples} format={v=>Math.round(v)} tooltip="Data points." />
          <SliderControl label="Noise"   value={noise}    min={0.01} max={0.5} step={0.01} onChange={setNoise} format={v=>v.toFixed(2)} tooltip="Class overlap." />
        </Sec>
        <Hr />

        {[{side:'a',modelId:modelA,setModelId:setModelA,color:colA,label:'Model A'},{side:'b',modelId:modelB,setModelId:setModelB,color:colB,label:'Model B'}].map(({side,modelId,setModelId,color,label})=>(
          <React.Fragment key={side}>
            <Sec label={label}>
              <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:8 }}>
                {ALL_MODELS.map(m=>(
                  <button key={m.id} onClick={()=>setModelId(m.id)} style={{ background:modelId===m.id?`${m.color}20`:'var(--bg3)', border:modelId===m.id?`1.5px solid ${m.color}`:'1.5px solid var(--border)', borderRadius:6, padding:'5px 10px', cursor:'pointer', textAlign:'left', color:modelId===m.id?m.color:'var(--text2)', fontFamily:'var(--sans)', fontSize:11, fontWeight:modelId===m.id?600:400, transition:'all 0.15s', display:'flex', alignItems:'center', gap:6 }}>
                    <span>{m.emoji}</span>{m.label}
                  </button>
                ))}
              </div>
              <ModelParamPanel prefix={side} modelId={modelId} params={params} setParams={setParams} />
            </Sec>
            <Hr />
          </React.Fragment>
        ))}

        <Sec label="Legend">
          {[{color:'#3b82f6',label:'Class 0 — Train'},{color:'#f97316',label:'Class 1 — Train'},{color:'#3b82f6',label:'Class 0 — Test',border:'2px solid #fff'},{color:'#f97316',label:'Class 1 — Test',border:'2px solid #fff'}].map((l,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
              <span style={{ width:9, height:9, borderRadius:'50%', background:l.color, border:l.border||'none', display:'inline-block', flexShrink:0 }} />
              <span style={{ fontSize:10, color:'var(--text2)', fontFamily:'var(--sans)' }}>{l.label}</span>
            </div>
          ))}
          <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:2 }}>
            <span style={{ width:18, height:2, background:'white', display:'inline-block', flexShrink:0 }} />
            <span style={{ fontSize:10, color:'var(--text2)', fontFamily:'var(--sans)' }}>Decision boundary</span>
          </div>
        </Sec>
      </div>

      {/* ─── RIGHT — full charts ─── */}
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:10, minWidth:0 }}>

        {/* Winner bar */}
        {result && (
          <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:'10px 16px', display:'flex', alignItems:'center', gap:16, flexShrink:0 }}>
            {[
              { side:'a', modelId:modelA, color:colA, metrics:result.a.metrics },
              { side:'b', modelId:modelB, color:colB, metrics:result.b.metrics },
            ].map(({side,modelId,color,metrics})=>{
              const model = ALL_MODELS.find(m=>m.id===modelId)
              return (
                <div key={side} style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
                  <div style={{ width:3, height:36, borderRadius:2, background:color, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'var(--sans)', fontSize:12, fontWeight:700, color, marginBottom:3 }}>{model?.emoji} {model?.label}</div>
                    <div style={{ display:'flex', gap:12 }}>
                      <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'#10b981' }}>Train {(metrics.train_acc*100).toFixed(1)}%</span>
                      <span style={{ fontFamily:'var(--mono)', fontSize:12, color, fontWeight:700 }}>Test {(metrics.test_acc*100).toFixed(1)}%</span>
                      <span style={{ fontFamily:'var(--sans)', fontSize:11, color:metrics.fit_status==='good'?'#10b981':metrics.fit_status==='overfitting'?'#f59e0b':'#ef4444' }}>
                        {metrics.fit_status==='good'?'✅':metrics.fit_status==='overfitting'?'⚠️':'📉'} {metrics.fit_status}
                      </span>
                    </div>
                  </div>
                  {winner===side && <span style={{ fontSize:22 }}>🏆</span>}
                </div>
              )
            })}
            <div style={{ width:1, height:36, background:'var(--border)' }} />
            <div style={{ fontFamily:'var(--sans)', fontSize:12, color:'var(--text3)' }}>
              {winner==='tie' ? '🤝 Tie' : `Diff: ${Math.abs((result.a.metrics.test_acc - result.b.metrics.test_acc)*100).toFixed(1)}% test acc`}
            </div>
            {loading && <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent)', background:'var(--accent-glow)', borderRadius:20, padding:'3px 10px', border:'1px solid rgba(59,130,246,0.3)', flexShrink:0 }}>updating...</div>}
          </div>
        )}

        {error && <div style={{ textAlign:'center', padding:40, color:'var(--red)', fontFamily:'var(--mono)', fontSize:13 }}>⚠️ {error}</div>}

        {/* Two complete charts — equal width, fill all remaining height */}
        <div style={{ display:'flex', gap:12, flex:1, minHeight:0, flexWrap:'wrap', alignItems:'flex-start' }}>
          {[
            { side:'a', modelId:modelA, color:colA, res:result?.a },
            { side:'b', modelId:modelB, color:colB, res:result?.b },
          ].map(({ side, modelId, color, res }) => {
            const model = ALL_MODELS.find(m=>m.id===modelId)
            return (
              <div key={side} style={{ flex:'1 1 420px', minWidth:0, alignSelf:'flex-start', display:'flex', flexDirection:'column', gap:0, background:'var(--panel)', border:`1.5px solid ${color}45`, borderRadius:16, overflow:'hidden' }}>

                {/* Chart title strip */}
                <div style={{ padding:'8px 12px', borderBottom:`1px solid ${color}25`, flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontFamily:'var(--sans)', fontWeight:700, fontSize:14, color }}>
                    {model?.emoji} {model?.label}
                  </div>
                  {winner===side && <span style={{ fontSize:16 }}>🏆</span>}
                </div>

                {/* BoundaryChart fills the rest completely */}
                <div style={{ padding:'6px 6px 4px' }}>
                  <BoundaryChart
                    boundary={res?.boundary}
                    scatter={res?.scatter}
                    loading={loading && !res}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Sec({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:9, fontFamily:'var(--sans)' }}>{label}</div>
      {children}
    </div>
  )
}
function Hr() { return <div style={{ borderTop:'1px solid var(--border)', marginBottom:14 }} /> }
