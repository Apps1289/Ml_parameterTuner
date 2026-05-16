import React, { useState, useRef, useCallback } from 'react'
import { uploadCSV, runCSVModel } from '../api'
import SliderControl from './SliderControl'
import MetricCard from './MetricCard'
import FitStatusBadge from './FitStatusBadge'
import { BoundaryChart, ConfusionMatrix } from './ClassifierShared'

const MODELS = [
  { id:'logistic',      label:'Logistic Reg.',  color:'#3b82f6', emoji:'🔵' },
  { id:'knn',           label:'KNN',            color:'#f59e0b', emoji:'📍' },
  { id:'svm',           label:'SVM',            color:'#8b5cf6', emoji:'📐' },
  { id:'decision_tree', label:'Decision Tree',  color:'#10b981', emoji:'🌲' },
  { id:'random_forest', label:'Random Forest',  color:'#ef4444', emoji:'🌳' },
]

export default function CSVUploadPage() {
  const [csvMeta,    setCsvMeta]    = useState(null)   // {columns, numeric_columns, n_rows, preview, filename, raw}
  const [featureX,   setFeatureX]   = useState('')
  const [featureY,   setFeatureY]   = useState('')
  const [labelCol,   setLabelCol]   = useState('')
  const [modelType,  setModelType]  = useState('logistic')
  const [result,     setResult]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [error,      setError]      = useState(null)
  const [dragOver,   setDragOver]   = useState(false)
  const [C,          setC]          = useState(1.0)
  const [k,          setK]          = useState(5)
  const [maxDepth,   setMaxDepth]   = useState(4)
  const [nEst,       setNEst]       = useState(20)
  const [gamma,      setGamma]      = useState(1.0)
  const fileRef = useRef(null)

  const handleFile = useCallback(async (file) => {
    if (!file || !file.name.endsWith('.csv')) { setError('Please upload a .csv file'); return }
    setUploading(true); setError(null); setResult(null); setCsvMeta(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const meta = await uploadCSV(formData)
      if (meta.error) { setError(meta.error); return }
      // Also store raw text for sending to model endpoint
      const text = await file.text()
      setCsvMeta({ ...meta, raw: text })
      // Auto-pick columns if possible
      if (meta.numeric_columns.length >= 2) {
        setFeatureX(meta.numeric_columns[0])
        setFeatureY(meta.numeric_columns[1])
      }
      if (meta.columns.length > 0) setLabelCol(meta.columns[meta.columns.length-1])
    } catch { setError('Upload failed. Make sure backend is running.') }
    finally  { setUploading(false) }
  }, [])

  const handleDrop = useCallback(e => {
    e.preventDefault(); setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  const runModel = useCallback(async () => {
    if (!csvMeta || !featureX || !featureY || !labelCol) { setError('Please select feature columns and label column'); return }
    if (featureX === featureY) { setError('Feature X and Feature Y must be different columns'); return }
    setLoading(true); setError(null)
    try {
      // Parse CSV and send as JSON records
      const lines = csvMeta.raw.trim().split('\n')
      const headers = lines[0].split(',').map(h=>h.trim().replace(/"/g,''))
      const records = lines.slice(1).map(line => {
        const vals = line.split(',').map(v=>v.trim().replace(/"/g,''))
        const obj = {}
        headers.forEach((h,i) => obj[h] = vals[i])
        return obj
      })
      const data = await runCSVModel({
        csv_data: JSON.stringify(records),
        feature_x: featureX, feature_y: featureY, label_col: labelCol,
        model_type: modelType, test_size:0.25, seed:42, resolution:70,
        C, n_neighbors:k, max_depth:maxDepth, n_estimators:nEst, gamma,
      })
      if (data.error) { setError(data.error); return }
      setResult(data)
    } catch { setError('Run failed. Make sure backend is running.') }
    finally  { setLoading(false) }
  }, [csvMeta, featureX, featureY, labelCol, modelType, C, k, maxDepth, nEst, gamma])

  const activeModel = MODELS.find(m=>m.id===modelType)
  const m = result?.metrics

  return (
    <div style={{ display:'flex', gap:20, height:'100%', minHeight:0, overflow:'hidden', flexWrap:'wrap' }}>

      {/* LEFT */}
      <div style={{ width:'clamp(250px, 32vw, 310px)', flexShrink:0, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:20, overflowY:'auto' }}>

        {/* Drop zone */}
        <Sec label="Upload CSV">
          <div
            onDrop={handleDrop}
            onDragOver={e=>{e.preventDefault();setDragOver(true)}}
            onDragLeave={()=>setDragOver(false)}
            onClick={()=>fileRef.current?.click()}
            style={{
              border:`2px dashed ${dragOver?'var(--accent)':'var(--border2)'}`,
              borderRadius:10, padding:'20px 12px', textAlign:'center', cursor:'pointer',
              background:dragOver?'var(--accent-glow)':'var(--bg3)',
              transition:'all 0.2s', marginBottom:10,
            }}
          >
            <div style={{ fontSize:28, marginBottom:6 }}>{uploading ? '⏳' : '📂'}</div>
            <div style={{ fontFamily:'var(--sans)', fontSize:12, color:'var(--text2)', fontWeight:500 }}>
              {uploading ? 'Uploading...' : 'Drop CSV here or click to browse'}
            </div>
            <div style={{ fontFamily:'var(--sans)', fontSize:10, color:'var(--text3)', marginTop:4 }}>
              Needs numeric features + binary label column
            </div>
            <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }}
              onChange={e=>handleFile(e.target.files[0])} />
          </div>

          {csvMeta && (
            <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:8, padding:'8px 12px' }}>
              <div style={{ fontFamily:'var(--sans)', fontSize:12, fontWeight:600, color:'#10b981', marginBottom:3 }}>
                ✅ {csvMeta.filename}
              </div>
              <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)' }}>
                {csvMeta.n_rows} rows · {csvMeta.columns.length} columns
              </div>
            </div>
          )}
        </Sec>

        {csvMeta && (
          <>
            <Hr />
            <Sec label="Column Selection">
              <ColSelect label="Feature X (horizontal axis)" value={featureX} options={csvMeta.numeric_columns} onChange={setFeatureX} color="#3b82f6" />
              <ColSelect label="Feature Y (vertical axis)"   value={featureY} options={csvMeta.numeric_columns} onChange={setFeatureY} color="#f97316" />
              <ColSelect label="Label column (class)"        value={labelCol} options={csvMeta.columns}         onChange={setLabelCol} color="#10b981" />
            </Sec>

            <Hr />
            <Sec label="Model">
              <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:12 }}>
                {MODELS.map(m=>(
                  <button key={m.id} onClick={()=>setModelType(m.id)} style={{
                    background:modelType===m.id?`${m.color}20`:'var(--bg3)',
                    border:modelType===m.id?`1.5px solid ${m.color}`:'1.5px solid var(--border)',
                    borderRadius:7, padding:'6px 10px', cursor:'pointer', textAlign:'left',
                    color:modelType===m.id?m.color:'var(--text2)',
                    fontFamily:'var(--sans)', fontSize:12, fontWeight:modelType===m.id?600:400,
                    transition:'all 0.15s', display:'flex', alignItems:'center', gap:6,
                  }}>
                    <span>{m.emoji}</span>{m.label}
                  </button>
                ))}
              </div>
              {(modelType==='logistic'||modelType==='svm') && <SliderControl label="C" value={C} min={0.01} max={10} step={0.01} onChange={setC} format={v=>v.toFixed(2)} tooltip="Regularization strength." />}
              {modelType==='svm'           && <SliderControl label="Gamma" value={gamma} min={0.01} max={10} step={0.01} onChange={setGamma} format={v=>v.toFixed(2)} tooltip="RBF kernel width." />}
              {modelType==='knn'           && <SliderControl label="K" value={k} min={1} max={25} step={1} onChange={setK} format={v=>Math.round(v)} tooltip="Number of neighbours." />}
              {(modelType==='decision_tree'||modelType==='random_forest') && <SliderControl label="Max Depth" value={maxDepth} min={1} max={12} step={1} onChange={setMaxDepth} format={v=>Math.round(v)} tooltip="Tree depth." />}
              {modelType==='random_forest' && <SliderControl label="Trees" value={nEst} min={5} max={100} step={5} onChange={setNEst} format={v=>Math.round(v)} tooltip="Number of trees." />}
            </Sec>

            <Hr />
            <button onClick={runModel} disabled={loading||!featureX||!featureY||!labelCol} style={{
              width:'100%', padding:'12px 0', borderRadius:10, cursor:loading?'wait':'pointer',
              background:loading?'var(--border2)':'linear-gradient(135deg,#3b82f6,#8b5cf6)',
              border:'none', fontFamily:'var(--sans)', fontSize:14, fontWeight:700, color:'white',
              transition:'all 0.2s', opacity:(!featureX||!featureY||!labelCol)?0.5:1,
            }}>
              {loading ? '⏳ Running Model...' : '▶  Run Model'}
            </button>
          </>
        )}

        {/* Sample datasets tip */}
        {!csvMeta && (
          <>
            <Hr />
            <div style={{ padding:'12px 14px', background:'rgba(59,130,246,0.06)', borderRadius:8, border:'1px solid rgba(59,130,246,0.15)', fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>
              💡 <strong style={{ color:'var(--accent)' }}>Don't have a CSV?</strong><br/>
              Try downloading a dataset from{' '}
              <span style={{ color:'var(--accent)', fontFamily:'var(--mono)' }}>kaggle.com</span> or use sklearn's built-in datasets exported to CSV (Iris, Breast Cancer, Wine).
            </div>
          </>
        )}
      </div>

      {/* RIGHT */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:14, overflowY:'auto', minWidth:0 }}>

        {/* No file state */}
        {!csvMeta && (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
            <div style={{ fontSize:64 }}>📊</div>
            <div style={{ fontFamily:'var(--sans)', fontSize:20, fontWeight:700, color:'var(--text)' }}>Upload Your Own Dataset</div>
            <div style={{ fontFamily:'var(--sans)', fontSize:14, color:'var(--text3)', textAlign:'center', maxWidth:400, lineHeight:1.7 }}>
              Upload any CSV with numeric features and a binary label column. Pick which two features to visualise, choose a model, and see the decision boundary on your real data.
            </div>
            <div style={{ display:'flex', gap:10, marginTop:8 }}>
              {['📈 Any CSV dataset', '🎯 Binary classification', '⚡ 5 models to try'].map((t,i)=>(
                <div key={i} style={{ padding:'8px 14px', background:'var(--panel)', border:'1px solid var(--border)', borderRadius:20, fontFamily:'var(--sans)', fontSize:12, color:'var(--text2)' }}>{t}</div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 16px', fontFamily:'var(--mono)', fontSize:12, color:'var(--red)' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            <div className="fade-up">
              <FitStatusBadge status={m.fit_status} />
              <div style={{ display:'flex', gap:10 }}>
                <MetricCard label="Train Accuracy" value={`${(m.train_acc*100).toFixed(1)}%`} color="green" sub="On training data" />
                <MetricCard label="Test Accuracy"  value={`${(m.test_acc *100).toFixed(1)}%`} color={m.test_acc>0.85?'green':m.test_acc>0.7?'yellow':'red'} sub="On unseen data" />
                <MetricCard label="Samples"        value={result.n_samples} color="default" sub="After cleaning" />
                <MetricCard label="Model"          value={activeModel?.label} color="default" sub="Active classifier" />
              </div>
            </div>

            <div style={{ display:'flex', gap:14, minHeight:0, flexWrap:'wrap' }}>
              <div style={{ flex:1, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:'16px 16px 10px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div>
                    <div style={{ fontFamily:'var(--sans)', fontWeight:600, fontSize:15, color:'var(--text)' }}>
                      {activeModel?.emoji} {activeModel?.label} — Your Data
                    </div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)', marginTop:2 }}>
                      X: {featureX} · Y: {featureY} · Label: {labelCol}
                    </div>
                  </div>
                  {result.label_map && (
                    <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)' }}>
                      🔵 {result.label_map['0']} · 🟠 {result.label_map['1']}
                    </div>
                  )}
                </div>
                <BoundaryChart boundary={result.boundary} scatter={result.scatter} loading={false} />
              </div>
              <div style={{ width:240, flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
                <ConfusionMatrix cm={m.confusion_matrix} />
                {result.label_map && (
                  <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
                    <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Class Labels</div>
                    {[['0','#3b82f6'],['1','#f97316']].map(([k,c])=>(
                      <div key={k} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                        <span style={{ width:10, height:10, borderRadius:'50%', background:c, display:'inline-block' }} />
                        <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text2)' }}>Class {k}: <strong>{result.label_map[k]}</strong></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Preview table */}
        {csvMeta && !result && (
          <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:16, flex:1, overflowY:'auto' }}>
            <div style={{ fontFamily:'var(--sans)', fontWeight:600, fontSize:14, color:'var(--text)', marginBottom:12 }}>
              📋 Data Preview — first 5 rows
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'var(--mono)', fontSize:11 }}>
                <thead>
                  <tr>
                    {csvMeta.columns.map(c=>(
                      <th key={c} style={{ padding:'6px 12px', background:'var(--bg3)', color: c===featureX?'#3b82f6':c===featureY?'#f97316':c===labelCol?'#10b981':'var(--text3)', borderBottom:'1px solid var(--border)', textAlign:'left', whiteSpace:'nowrap' }}>
                        {c===featureX?'📈 ':c===featureY?'📊 ':c===labelCol?'🏷 ':''}{c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvMeta.preview.map((row,i)=>(
                    <tr key={i} style={{ borderBottom:'1px solid var(--border)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                      {csvMeta.columns.map(c=>(
                        <td key={c} style={{ padding:'5px 12px', color:'var(--text2)' }}>{String(row[c]??'')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop:12, fontFamily:'var(--sans)', fontSize:11, color:'var(--text3)' }}>
              Showing 5 of {csvMeta.n_rows} rows · Select columns on the left then click Run Model
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Sec({ label, children }) { return <div style={{ marginBottom:16 }}><div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>{label}</div>{children}</div> }
function Hr() { return <div style={{ borderTop:'1px solid var(--border)', marginBottom:16 }} /> }
function ColSelect({ label, value, options, onChange, color }) {
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5, fontFamily:'var(--sans)' }}>{label}</div>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{
        width:'100%', padding:'7px 10px', borderRadius:7, background:'var(--bg3)',
        border:`1.5px solid ${value?color:'var(--border)'}`, color:value?color:'var(--text3)',
        fontFamily:'var(--mono)', fontSize:12, outline:'none', cursor:'pointer',
      }}>
        <option value="">— select column —</option>
        {options.map(c=><option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  )
}
