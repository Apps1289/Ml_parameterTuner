import React from 'react'

const STATUS = {
  good:         { label: '✅  Good Fit',        color: 'var(--green)',  bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  desc: 'Model generalizes well to unseen data.' },
  overfitting:  { label: '⚠️  Overfitting',      color: 'var(--yellow)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', desc: 'High variance — model memorizes training data. Try regularization or reduce complexity.' },
  underfitting: { label: '📉  Underfitting',     color: 'var(--red)',    bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',  desc: 'High bias — model is too simple to capture the pattern. Increase complexity.' },
}

export default function FitStatusBadge({ status }) {
  const s = STATUS[status] || STATUS['good']
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 10, padding: '12px 16px',
      marginBottom: 16,
    }}>
      <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, color: s.color, fontSize: 14, marginBottom: 4 }}>
        {s.label}
      </div>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
        {s.desc}
      </div>
    </div>
  )
}
