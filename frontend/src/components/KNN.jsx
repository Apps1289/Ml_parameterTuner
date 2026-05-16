import React, { useState, useEffect, useCallback, useRef } from 'react'
import { runKNN } from '../api'
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

const METRICS = [
	{ id:'euclidean', label:'Euclidean', desc:'Standard straight-line distance.' },
	{ id:'manhattan', label:'Manhattan', desc:'Grid distance, can sharpen local voting.' },
	{ id:'minkowski', label:'Minkowski', desc:'Generalized distance controlled by p.' },
]

const WEIGHTS = [
	{ id:'uniform', label:'Uniform', desc:'All neighbors vote equally.' },
	{ id:'distance', label:'Distance', desc:'Closer neighbors vote more strongly.' },
]

export default function KNNPage() {
	const [dataset, setDataset] = useState('moons')
	const [result, setResult] = useState(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
	const [nSamples, setNSamples] = useState(200)
	const [noise, setNoise] = useState(0.2)
	const [testSize, setTestSize] = useState(0.25)
	const [nNeighbors, setNNeighbors] = useState(5)
	const [metric, setMetric] = useState('euclidean')
	const [weights, setWeights] = useState('uniform')
	const [p, setP] = useState(2)
	const debounceRef = useRef(null)

	const fetch = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const data = await runKNN({
				dataset,
				n_samples: nSamples,
				noise,
				test_size: testSize,
				n_neighbors: nNeighbors,
				metric,
				weights,
				p,
				resolution: 80,
				seed: 42,
			})
			setResult(data)
		} catch {
			setError('Backend not reachable. Make sure FastAPI is running on port 8000.')
		} finally {
			setLoading(false)
		}
	}, [dataset, nSamples, noise, testSize, nNeighbors, metric, weights, p])

	useEffect(() => {
		clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(fetch, 350)
		return () => clearTimeout(debounceRef.current)
	}, [fetch])

	const metrics = result?.metrics
	const modelInfo = result?.model_info

	return (
		<div style={{ display:'flex', gap:20, height:'100%', minHeight:0, overflow:'hidden', flexWrap:'wrap' }}>
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
					<SliderControl label="Samples" value={nSamples} min={50} max={400} step={10} onChange={setNSamples} format={v=>Math.round(v)} tooltip="Number of generated data points." />
					<SliderControl label="Noise" value={noise} min={0.01} max={0.5} step={0.01} onChange={setNoise} format={v=>v.toFixed(2)} tooltip="Higher noise makes the boundary less clean." />
					<SliderControl label="Test Split" value={testSize} min={0.1} max={0.4} step={0.05} onChange={setTestSize} format={v=>`${Math.round(v*100)}%`} tooltip="Fraction used for evaluation." />
				</PanelSection>

				<Divider />

				<PanelSection label="Model Parameters">
					<SliderControl label="Neighbors" value={nNeighbors} min={1} max={25} step={1} onChange={setNNeighbors} format={v=>Math.round(v)} tooltip="How many nearby points vote." />
					<SliderControl label="Minkowski p" value={p} min={1} max={5} step={1} onChange={setP} format={v=>Math.round(v)} tooltip="Distance power used when metric is Minkowski." />

					<div style={{ fontSize:11, color:'var(--text3)', marginBottom:8, marginTop:4 }}>Distance Metric</div>
					<div style={{ display:'flex', flexDirection:'column', gap:5 }}>
						{METRICS.map(m => (
							<button key={m.id} onClick={() => setMetric(m.id)} style={{
								background: metric===m.id ? 'rgba(59,130,246,0.1)' : 'var(--bg3)',
								border: metric===m.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
								borderRadius:7, padding:'7px 10px', cursor:'pointer', textAlign:'left', transition:'all 0.15s',
							}}>
								<div style={{ fontFamily:'var(--sans)', fontSize:12, fontWeight:600, color:metric===m.id?'var(--accent)':'var(--text)', marginBottom:2 }}>{m.label}</div>
								<div style={{ fontFamily:'var(--sans)', fontSize:10, color:'var(--text3)', lineHeight:1.4 }}>{m.desc}</div>
							</button>
						))}
					</div>

					<div style={{ fontSize:11, color:'var(--text3)', marginBottom:8, marginTop:12 }}>Voting Weights</div>
					<div style={{ display:'flex', flexDirection:'column', gap:5 }}>
						{WEIGHTS.map(w => (
							<button key={w.id} onClick={() => setWeights(w.id)} style={{
								background: weights===w.id ? 'rgba(59,130,246,0.1)' : 'var(--bg3)',
								border: weights===w.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
								borderRadius:7, padding:'7px 10px', cursor:'pointer', textAlign:'left', transition:'all 0.15s',
							}}>
								<div style={{ fontFamily:'var(--sans)', fontSize:12, fontWeight:600, color:weights===w.id?'var(--accent)':'var(--text)', marginBottom:2 }}>{w.label}</div>
								<div style={{ fontFamily:'var(--sans)', fontSize:10, color:'var(--text3)', lineHeight:1.4 }}>{w.desc}</div>
							</button>
						))}
					</div>
				</PanelSection>

				<Divider />
				<Legend />
			</div>

			<div style={{ flex:1, display:'flex', flexDirection:'column', gap:14, overflowY:'auto', minWidth:0 }}>
				{metrics && (
					<div className="fade-up">
						<FitStatusBadge status={metrics.fit_status} />
						<div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
							<MetricCard label="Train Accuracy" value={`${(metrics.train_acc*100).toFixed(1)}%`} color="green" sub="On training data" />
							<MetricCard label="Test Accuracy" value={`${(metrics.test_acc*100).toFixed(1)}%`} color={metrics.test_acc>0.85?'green':metrics.test_acc>0.7?'yellow':'red'} sub="On unseen data" />
							<MetricCard label="Neighbors" value={modelInfo?.n_neighbors ?? '—'} color="default" sub="Voting count" />
							<MetricCard label="Metric" value={modelInfo?.metric ?? '—'} color="default" sub="Distance function" />
						</div>
					</div>
				)}

				<div style={{ display:'flex', gap:14, minHeight:0, flexWrap:'wrap' }}>
					<div style={{ flex:1, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:'16px 16px 10px' }}>
						<ChartHeader title="Decision Boundary — KNN" loading={loading && !!result} subtitle={`k=${nNeighbors} · metric=${metric} · weights=${weights}`} />
						{error && <ErrorMsg msg={error} />}
						{!error && <BoundaryChart boundary={result?.boundary} scatter={result?.scatter} loading={loading && !result} />}
					</div>

					<div style={{ width:240, flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
						{result && <ConfusionMatrix cm={metrics?.confusion_matrix} />}
						{modelInfo && (
							<InfoBox items={[
								['Neighbors', modelInfo.n_neighbors],
								['Metric', modelInfo.metric],
								['Weights', modelInfo.weights],
								['p', modelInfo.p],
								['Test Split', `${Math.round(testSize*100)}%`],
							]} tip="💡 Lower k = more complex boundary and higher variance. Increase k to smooth the decision surface and reduce overfitting." />
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

function PanelSection({ label, children }) {
	return <div style={{ marginBottom:20 }}><div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>{label}</div>{children}</div>
}

function Divider() {
	return <div style={{ borderTop:'1px solid var(--border)', marginBottom:20 }} />
}

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

function ErrorMsg({ msg }) {
	return <div style={{ textAlign:'center', padding:60, color:'var(--red)', fontFamily:'var(--mono)', fontSize:13 }}>⚠️ {msg}</div>
}

function InfoBox({ items, tip }) {
	return (
		<div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
			<div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Model Info</div>
			<div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:12 }}>
				{items.map(([k,v]) => (<div key={k} style={{ display:'flex', justifyContent:'space-between' }}><span style={{ fontSize:11, color:'var(--text3)' }}>{k}</span><span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent2)' }}>{v}</span></div>))}
			</div>
			{tip && <div style={{ padding:'8px 10px', background:'rgba(59,130,246,0.06)', borderRadius:7, border:'1px solid rgba(59,130,246,0.15)', fontSize:11, color:'var(--text2)', fontFamily:'var(--sans)', lineHeight:1.5 }}>{tip}</div>}
		</div>
	)
}
