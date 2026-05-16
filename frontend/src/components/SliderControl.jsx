import React from 'react'

export default function SliderControl({ label, tooltip, value, min, max, step = 0.01, onChange, format }) {
  const display = format ? format(value) : value

  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
            {label}
          </span>
          {tooltip && (
            <div className="relative group">
              <span style={{
                width: 16, height: 16, borderRadius: '50%',
                background: 'var(--border2)', color: 'var(--text3)',
                fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'help', fontFamily: 'var(--mono)'
              }}>?</span>
              <div style={{
                position: 'absolute', left: 24, top: -4, zIndex: 50, width: 220,
                background: '#1e293b', border: '1px solid var(--border2)',
                borderRadius: 8, padding: '10px 12px',
                fontSize: 12, color: 'var(--text2)', lineHeight: 1.5,
                opacity: 0, pointerEvents: 'none',
                transition: 'opacity 0.2s',
              }} className="group-hover:opacity-100" style2={{ opacity: 1 }}>
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--accent)',
          background: 'var(--accent-glow)', padding: '2px 8px', borderRadius: 4,
          border: '1px solid rgba(59,130,246,0.2)'
        }}>
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
      <div className="flex justify-between mt-1">
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>{format ? format(min) : min}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>{format ? format(max) : max}</span>
      </div>
    </div>
  )
}
