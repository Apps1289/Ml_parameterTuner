import React, { useEffect, useRef, useState } from 'react'
import HomePage from './components/HomePage'
import LinearRegression   from './components/LinearRegression'
import LogisticRegression from './components/LogisticRegression'
import KNN                from './components/KNN'
import SVM                from './components/SVM'
import DecisionTree       from './components/DecisionTree'
import RandomForest       from './components/RandomForest'
import GradientBoosting   from './components/GradientBoosting'
import NaiveBayes         from './components/NaiveBayes'
import NeuralNet          from './components/NeuralNet'
import BiasVariance       from './components/BiasVariance'
import ModelComparison    from './components/ModelComparison'
import CSVUpload          from './components/CSVUpload'
import { loadAuthToken }  from './api'

const NAV = [
  { group:'Regression',      items:[
    { id:'linear-regression',   label:'Linear Reg.',   emoji:'📈' },
  ]},
  { group:'Classification',  items:[
    { id:'logistic-regression', label:'Logistic',      emoji:'🔵' },
    { id:'knn',                 label:'KNN',           emoji:'📍' },
    { id:'svm',                 label:'SVM',           emoji:'📐' },
    { id:'decision-tree',       label:'Decision Tree', emoji:'🌲' },
    { id:'random-forest',       label:'Random Forest', emoji:'🌳' },
    { id:'gradient-boosting',   label:'Grad. Boost',   emoji:'🚀' },
    { id:'naive-bayes',         label:'Naive Bayes',   emoji:'📐' },
    { id:'neural-net',          label:'Neural Net',    emoji:'🧠' },
  ]},
  { group:'Tools',           items:[
    { id:'bias-variance',       label:'Bias-Variance', emoji:'📊' },
    { id:'comparison',          label:'Compare',       emoji:'⚖️' },
    { id:'csv-upload',          label:'CSV Upload',    emoji:'📂' },
  ]},
]

const GROUP_COLORS = { Regression:'#3b82f6', Classification:'#10b981', Tools:'#8b5cf6' }

const CATEGORY_ITEMS = {
  Regression: [
    { id:'linear-regression', label:'Linear Regression', emoji:'📈', desc:'Basic OLS regression' },
  ],
  Classification: [
    { id:'logistic-regression', label:'Logistic Regression', emoji:'🔵', desc:'Linear classifier' },
    { id:'knn', label:'KNN', emoji:'📍', desc:'Nearest neighbours' },
    { id:'svm', label:'SVM', emoji:'📐', desc:'Kernel-based classifier' },
    { id:'decision-tree', label:'Decision Tree', emoji:'🌲', desc:'Tree-based splits' },
    { id:'random-forest', label:'Random Forest', emoji:'🌳', desc:'Ensemble of trees' },
    { id:'gradient-boosting', label:'Gradient Boosting', emoji:'🚀', desc:'Boosted trees' },
    { id:'naive-bayes', label:'Naive Bayes', emoji:'📐', desc:'Probabilistic classifier' },
    { id:'neural-net', label:'Neural Network', emoji:'🧠', desc:'MLP classifier' },
  ],
  Tools: [
    { id:'bias-variance', label:'Bias-Variance', emoji:'📊', desc:'See underfit vs overfit' },
    { id:'comparison', label:'Compare Models', emoji:'⚖️', desc:'Run two models side by side' },
  ],
}

export default function App() {
  const [active, setActive] = useState('linear-regression')
  const [activeGroup, setActiveGroup] = useState(null)
  const [hoverGroup, setHoverGroup] = useState(null)
  const [showHome, setShowHome] = useState(true)
  const headerRef = useRef(null)

  useEffect(() => {
    loadAuthToken()
  }, [])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setActiveGroup(null)
        setHoverGroup(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      {showHome ? (
        <HomePage onGetStarted={() => setShowHome(false)} />
      ) : (
        <>
          <header ref={headerRef} style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'0 20px', display:'flex', alignItems:'center', gap:12, height:56, flexShrink:0, position:'relative', zIndex:20 }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <button 
            onClick={() => setShowHome(true)}
            style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}
          >
            <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#3b82f6,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🧠</div>
            <div>
              <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700, color:'var(--text)', letterSpacing:'-0.02em' }}>ML Explorer</div>
              <div style={{ fontFamily:'var(--sans)', fontSize:9, color:'var(--text3)', lineHeight:1 }}>Visual Hyperparameter Lab</div>
            </div>
          </button>
        </div>

        <div style={{ width:1, height:30, background:'var(--border)', flexShrink:0 }} />

        {/* Nav */}
        <nav style={{ display:'flex', gap:8, flex:1, alignItems:'center', minWidth:0, overflow:'visible' }}>
          {NAV.map((group, gi) => {
            const items = CATEGORY_ITEMS[group.group] || []
            const isOpen = activeGroup === group.group || hoverGroup === group.group

            return (
              <div
                key={group.group}
                style={{ position:'relative', flexShrink:0, display:'flex', alignItems:'center', gap:8 }}
                onMouseEnter={() => setHoverGroup(group.group)}
                onMouseLeave={() => setHoverGroup(prev => prev === group.group ? null : prev)}
              >
                {gi > 0 && <div style={{ width:1, height:26, background:'var(--border)', margin:'0 2px', flexShrink:0 }} />}

                <button
                  type="button"
                  onClick={() => setActiveGroup(prev => prev === group.group ? null : group.group)}
                  style={{
                    background: isOpen ? 'var(--accent-glow)' : 'transparent',
                    border: isOpen ? `1px solid ${GROUP_COLORS[group.group]}55` : '1px solid transparent',
                    borderRadius:999,
                    padding:'6px 12px',
                    cursor:'pointer',
                    display:'flex',
                    alignItems:'center',
                    gap:7,
                    transition:'all 0.15s',
                    whiteSpace:'nowrap',
                    flexShrink:0,
                  }}
                >
                  <span style={{ fontSize:10, color:GROUP_COLORS[group.group], textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:700, fontFamily:'var(--sans)' }}>
                    {group.group}
                  </span>
                  <span style={{ fontSize:10, color:isOpen ? 'var(--accent)' : 'var(--text3)' }}>▾</span>
                </button>

                {isOpen && items.length > 0 && (
                  <div style={{
                    position:'absolute',
                    top:'calc(100% + 8px)',
                    left:0,
                    minWidth:270,
                    background:'rgba(15,22,36,0.98)',
                    border:'1px solid var(--border)',
                    borderRadius:14,
                    boxShadow:'0 16px 40px rgba(0,0,0,0.35)',
                    padding:10,
                    display:'grid',
                    gap:6,
                    zIndex:50,
                  }}>
                    <div style={{ fontSize:9, color:GROUP_COLORS[group.group], textTransform:'uppercase', letterSpacing:'0.14em', fontWeight:700, fontFamily:'var(--sans)', padding:'2px 4px 6px' }}>
                      {group.group} Models
                    </div>
                    {items.map(item => {
                      const isActive = active === item.id

                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => {
                            setActive(item.id)
                            setActiveGroup(null)
                            setHoverGroup(null)
                          }}
                          style={{
                            textAlign:'left',
                            background: isActive ? `${GROUP_COLORS[group.group]}18` : 'var(--bg3)',
                            border: isActive ? `1px solid ${GROUP_COLORS[group.group]}55` : '1px solid var(--border)',
                            borderRadius:10,
                            padding:'10px 12px',
                            cursor:'pointer',
                            display:'flex',
                            alignItems:'center',
                            gap:10,
                            transition:'all 0.15s',
                          }}
                        >
                          <span style={{ fontSize:15, flexShrink:0 }}>{item.emoji}</span>
                          <span style={{ display:'flex', flexDirection:'column', gap:1, minWidth:0 }}>
                            <span style={{ fontFamily:'var(--sans)', fontSize:12, fontWeight:600, color:isActive ? GROUP_COLORS[group.group] : 'var(--text2)' }}>
                              {item.label}
                            </span>
                            <span style={{ fontFamily:'var(--sans)', fontSize:10, color:'var(--text3)', lineHeight:1.35 }}>
                              {item.desc}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          <div style={{ flex:1 }} />

          <button
            type="button"
            onClick={() => {
              setActive('csv-upload')
              setActiveGroup(null)
              setHoverGroup(null)
            }}
            style={{
              background: active === 'csv-upload' ? 'var(--accent-glow)' : 'transparent',
              border: active === 'csv-upload' ? '1px solid rgba(139,92,246,0.35)' : '1px solid transparent',
              borderRadius:999,
              padding:'6px 12px',
              cursor:'pointer',
              display:'flex',
              alignItems:'center',
              gap:7,
              transition:'all 0.15s',
              whiteSpace:'nowrap',
              flexShrink:0,
            }}
          >
            <span style={{ fontSize:11 }}>📂</span>
            <span style={{ fontFamily:'var(--sans)', fontSize:10, fontWeight:600, color:active === 'csv-upload' ? '#8b5cf6' : 'var(--text2)' }}>
              CSV Upload
            </span>
          </button>
        </nav>

        {/* Phase badge */}
        
      </header>

      <main style={{ flex:1, padding:'16px 20px', overflow:'hidden' }}>
        {active === 'linear-regression'   && <LinearRegression />}
        {active === 'logistic-regression' && <LogisticRegression />}
        {active === 'knn'                 && <KNN />}
        {active === 'svm'                 && <SVM />}
        {active === 'decision-tree'       && <DecisionTree />}
        {active === 'random-forest'       && <RandomForest />}
        {active === 'gradient-boosting'   && <GradientBoosting />}
        {active === 'naive-bayes'         && <NaiveBayes />}
        {active === 'neural-net'          && <NeuralNet />}
        {active === 'bias-variance'       && <BiasVariance />}
        {active === 'comparison'          && <ModelComparison />}
        {active === 'csv-upload'          && <CSVUpload />}
      </main>
        </>
      )}
    </div>
  )
}
