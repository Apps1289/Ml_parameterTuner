import React from 'react'

export default function MetricCard({ label, value, sub, color }) {
  const c = color === 'green' ? 'var(--green)'
          : color === 'red'   ? 'var(--red)'
          : color === 'yellow'? 'var(--yellow)'
          : 'var(--accent2)'

  return (
    <div style={{
      background: 'var(--bg3)',
      border: `1px solid var(--border)`,
      borderRadius: 10,
      padding: '14px 16px',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--sans)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 22, color: c, fontWeight: 700 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  )
}
