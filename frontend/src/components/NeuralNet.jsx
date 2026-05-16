import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { runNeuralNet } from '../api'
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
const ACTIVATIONS = [
  { id:'relu',    label:'ReLU',    color:'#f59e0b', desc:'max(0,x) — most common. Fast, avoids vanishing gradient.' },
  { id:'tanh',    label:'Tanh',    color:'#10b981', desc:'Squashes to (-1,1). Smooth, centered at 0.' },
  { id:'logistic',label:'Sigmoid', color:'#8b5cf6', desc:'Squashes to (0,1). Classic but can vanish.' },
]

// ── Network Architecture Diagram ─────────────────────────────
function NetworkDiagram({ architecture, activation }) {
  const W = 340, H = 200
  const PAD = { x:30, y:20 }
  const layers = architecture || [2, 8, 1]
  const nLayers = layers.length
  const maxN = Math.max(...layers, 8)
  const col = ACTIVATIONS.find(a=>a.id===activation)?.color || '#3b82f6'

  const nodePos = layers.map((n, li) => {
    const x = PAD.x + (li / (nLayers-1)) * (W - PAD.x*2)
    const displayN = Math.min(n, 8)
    return Array.from({ length: displayN }, (_, ni) => {
      const y = PAD.y + (ni / (Math.max(displayN-1,1))) * (H - PAD.y*2)
      return { x, y, real: ni < n }
    })
  })

  const LAYER_LABELS = ['Input', ...Array.from({length:layers.length-2},(_,i)=>`Hidden ${i+1}`), 'Output']

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', display:'block' }}>
      {/* Connections */}
      {nodePos.slice(0,-1).map((layer, li) =>
        layer.slice(0, 4).map((src, si) =>
          nodePos[li+1].slice(0, 4).map((dst, di) => (
            <line key={`${li}-${si}-${di}`}
              x1={src.x} y1={src.y} x2={dst.x} y2={dst.y}
              stroke={col} strokeOpacity={0.12} strokeWidth={0.8} />
          ))
        )
      )}
      {/* Nodes */}
      {nodePos.map((layer, li) =>
        layer.map((node, ni) => (
          <circle key={`${li}-${ni}`}
            cx={node.x} cy={node.y} r={li===0||li===nLayers-1?7:6}
            fill={li===0?'#1e3a5f':li===nLayers-1?'#1a3320':`${col}22`}
            stroke={li===0?'#3b82f6':li===nLayers-1?'#10b981':col}
            strokeWidth={1.5} />
        ))
      )}
      {/* +more indicator */}
      {nodePos.map((layer, li) =>
        layers[li] > 8 ? (
          <text key={`more-${li}`} x={layer[layer.length-1].x} y={layer[layer.length-1].y+14}
            textAnchor="middle" fill="#64748b" fontSize={8} fontFamily="Space Mono,monospace">
            +{layers[li]-8}
          </text>
        ) : null
      )}
      {/* Layer labels */}
      {nodePos.map((layer, li) => (
        <text key={`lbl-${li}`} x={layer[0].x} y={H-4}
          textAnchor="middle" fill="#475569" fontSize={8} fontFamily="DM Sans,sans-serif">
          {LAYER_LABELS[li]}
          {li > 0 && li < nLayers-1 ? ` (${layers[li]})` : ` (${layers[li]})`}
        </text>
      ))}
    </svg>
  )
}

// ── Loss Curve ────────────────────────────────────────────────
function LossCurve({ curve }) {
  if (!curve || curve.length < 2) return null
  const W = 220, H = 80
  const PAD = { t:8, r:8, b:20, l:36 }
  const pw = W-PAD.l-PAD.r, ph = H-PAD.t-PAD.b
  const yMin = Math.min(...curve)*0.98, yMax = Math.max(...curve)*1.02
  const toX = (i) => PAD.l + (i/(curve.length-1))*pw
  const toY = (v) => PAD.t + (1-(v-yMin)/(yMax-yMin))*ph
  const path = curve.map((v,i)=>`${i===0?'M':'L'}${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', display:'block' }}>
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t+ph} stroke="#1e2d45" strokeWidth={1}/>
      <line x1={PAD.l} y1={PAD.t+ph} x2={PAD.l+pw} y2={PAD.t+ph} stroke="#1e2d45" strokeWidth={1}/>
      {[yMin, (yMin+yMax)/2, yMax].map((v,i)=>(
        <text key={i} x={PAD.l-4} y={toY(v)+3} textAnchor="end" fill="#64748b" fontSize={7} fontFamily="Space Mono,monospace">{v.toFixed(2)}</text>
      ))}
      <path d={path} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeLinejoin="round"/>
      <text x={PAD.l+pw/2} y={H-2} textAnchor="middle" fill="#475569" fontSize={8} fontFamily="DM Sans,sans-serif">Iteration</text>
    </svg>
  )
}

export default function NeuralNetPage() {
  const [dataset,        setDataset]        = useState('moons')
  const [result,         setResult]         = useState(null)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState(null)
  const [hiddenLayers,   setHiddenLayers]   = useState(1)
  const [neuronsPerLayer,setNeuronsPerLayer] = useState(8)
  const [activation,     setActivation]     = useState('relu')
  const [learningRate,   setLearningRate]   = useState(0.001)
  const [maxIter,        setMaxIter]        = useState(500)
  const [alpha,          setAlpha]          = useState(0.0001)
  const [nSamples,       setNSamples]       = useState(200)
  const [noise,          setNoise]          = useState(0.2)
  const [testSize,       setTestSize]       = useState(0.25)
  const debounceRef = useRef(null)

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await runNeuralNet({
        dataset, n_samples:nSamples, noise, test_size:testSize,
        hidden_layers:hiddenLayers, neurons_per_layer:neuronsPerLayer,
        activation, learning_rate_init:learningRate,
        max_iter:maxIter, alpha, resolution:80, seed:42,
      })
      setResult(data)
    } catch { setError('Backend not reachable. Make sure FastAPI is running on port 8000.') }
    finally  { setLoading(false) }
  }, [dataset, nSamples, noise, testSize, hiddenLayers, neuronsPerLayer, activation, learningRate, maxIter, alpha])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetch, 500)
    return () => clearTimeout(debounceRef.current)
  }, [fetch])

  const m  = result?.metrics
  const mi = result?.model_info
  const architecture = mi?.architecture || [2, neuronsPerLayer, 1]

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
          <SliderControl label="Test Split" value={testSize} min={0.1}  max={0.4} step={0.05} onChange={setTestSize}  format={v=>`${Math.round(v*100)}%`} tooltip="Fraction for testing." />
        </Sec>
        <Hr />
        <Sec label="Architecture">
          <SliderControl
            label="Hidden Layers"
            tooltip="Number of hidden layers. 1 layer = simple. 3 layers = deep network. More layers = more expressive but harder to train."
            value={hiddenLayers} min={1} max={3} step={1} onChange={setHiddenLayers} format={v=>Math.round(v)}
          />
          <SliderControl
            label="Neurons per Layer"
            tooltip="Width of each hidden layer. More neurons = more capacity to learn complex patterns. Too many = overfitting."
            value={neuronsPerLayer} min={2} max={64} step={2} onChange={setNeuronsPerLayer} format={v=>Math.round(v)}
          />
          {/* Activation */}
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8, marginTop:4 }}>Activation Function</div>
          <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
            {ACTIVATIONS.map(a => (
              <button key={a.id} onClick={()=>setActivation(a.id)} style={{
                background: activation===a.id?`${a.color}18`:'var(--bg3)',
                border: activation===a.id?`1.5px solid ${a.color}`:'1.5px solid var(--border)',
                borderRadius:7, padding:'7px 10px', cursor:'pointer', textAlign:'left', transition:'all 0.15s',
              }}>
                <div style={{ fontFamily:'var(--sans)', fontSize:12, fontWeight:600, color:activation===a.id?a.color:'var(--text)', marginBottom:2 }}>{a.label}</div>
                <div style={{ fontFamily:'var(--sans)', fontSize:10, color:'var(--text3)', lineHeight:1.4 }}>{a.desc}</div>
              </button>
            ))}
          </div>
        </Sec>
        <Hr />
        <Sec label="Training Parameters">
          <SliderControl
            label="Learning Rate"
            tooltip="Step size for gradient descent. Too high = training diverges. Too low = very slow convergence."
            value={learningRate} min={0.0001} max={0.1} step={0.0001} onChange={setLearningRate} format={v=>v.toFixed(4)}
          />
          <SliderControl
            label="Max Iterations"
            tooltip="Training epochs. More = better convergence but slower. Watch the loss curve stabilise."
            value={maxIter} min={50} max={1000} step={50} onChange={setMaxIter} format={v=>Math.round(v)}
          />
          <SliderControl
            label="Alpha (L2 Reg)"
            tooltip="L2 regularization strength. Prevents overfitting by penalising large weights."
            value={alpha} min={0.00001} max={0.1} step={0.0001} onChange={setAlpha} format={v=>v.toFixed(4)}
          />
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
              <MetricCard label="Iterations"     value={m.n_iter ?? '—'} color="default" sub="Training epochs used" />
              <MetricCard label="Architecture"   value={`${hiddenLayers}×${neuronsPerLayer}`} color="default" sub="Layers × Neurons" />
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:14, minHeight:0, flexWrap:'wrap' }}>
          {/* Main boundary chart */}
          <div style={{ flex:1, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:'16px 16px 10px' }}>
            <ChartHeader title="Decision Boundary — Neural Network (MLP)" loading={loading && !!result}
              subtitle={`[2→${Array(hiddenLayers).fill(neuronsPerLayer).join('→')}→1] · ${activation} · lr=${learningRate}`} />
            {error  && <ErrMsg msg={error} />}
            {!error && <BoundaryChart boundary={result?.boundary} scatter={result?.scatter} loading={loading && !result} />}
          </div>

          {/* Right column */}
          <div style={{ width:240, flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
            {/* Network diagram */}
            <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Network Architecture</div>
              <NetworkDiagram architecture={architecture} activation={activation} />
              <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)', textAlign:'center', marginTop:6 }}>
                {architecture.join(' → ')} neurons
              </div>
            </div>

            {/* Loss curve */}
            {mi?.loss_curve?.length > 1 && (
              <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
                <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Training Loss Curve</div>
                <LossCurve curve={mi.loss_curve} />
                <div style={{ fontSize:10, color:'var(--text3)', marginTop:6, fontFamily:'var(--sans)' }}>
                  First {mi.loss_curve.length} iterations shown
                </div>
              </div>
            )}

            {result && <ConfusionMatrix cm={m?.confusion_matrix} />}

            {/* Tip */}
            <div style={{ padding:'10px 12px', background:'rgba(139,92,246,0.06)', borderRadius:8, border:'1px solid rgba(139,92,246,0.2)', fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>
              💡 Try Circles with 1 hidden layer + 4 neurons — it barely fits. Add a second layer and watch it suddenly solve the problem. That's the power of depth!
            </div>
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
