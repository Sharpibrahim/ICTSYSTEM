import { toneFor } from '../format'

const PALETTE = ['#4f46e5', '#06b6d4', '#12b76a', '#f79009', '#f04438', '#9b51e0', '#2e90fa', '#14b8a6', '#ee6a9a', '#64748b']

export function colorFor(indexOrName) {
  if (typeof indexOrName === 'number') return PALETTE[indexOrName % PALETTE.length]
  const tone = toneFor(indexOrName)
  const map = {
    green: '#12b76a', blue: '#2e90fa', amber: '#f79009', red: '#f04438',
    purple: '#9b51e0', gray: '#98a2b3', brand: '#4f46e5'
  }
  return map[tone] || '#4f46e5'
}

/** Vertical bar chart. data = [{ name, value }] */
export function BarChart({ data = [], height = 170, color = '#4f46e5', formatValue = (v) => v, alt = false }) {
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0))
  if (!data.length) return <p className="muted small">No data available yet.</p>
  return (
    <div className="chart">
      <div className="chart__bars" style={{ height }}>
        {data.map((item) => {
          const value = Number(item.value) || 0
          const pct = Math.max(2, Math.round((value / max) * 100))
          return (
            <div className="chart__bar-col" key={item.name} title={`${item.name}: ${formatValue(value)}`}>
              <span className="small muted" style={{ fontWeight: 600 }}>
                {formatValue(value)}
              </span>
              <div className="chart__bar-stack">
                <div className={`chart__bar ${alt ? 'chart__bar--alt' : ''}`} style={{ height: `${pct}%`, background: alt ? undefined : `linear-gradient(180deg, ${color}, ${color}bb)` }} />
              </div>
              <span className="chart__label">{item.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Grouped / stacked bar chart. data = [{ label, values: [{key,value,color}] }] */
export function StackedBars({ data = [], series = [], height = 180 }) {
  const totals = data.map((d) => d.values.reduce((sum, v) => sum + (Number(v.value) || 0), 0))
  const max = Math.max(1, ...totals)
  if (!data.length) return <p className="muted small">No data available yet.</p>
  return (
    <div className="chart">
      <div className="chart__bars" style={{ height }}>
        {data.map((group) => {
          const total = group.values.reduce((sum, v) => sum + (Number(v.value) || 0), 0)
          return (
            <div className="chart__bar-col" key={group.label}>
              <span className="small muted" style={{ fontWeight: 600 }}>{total}</span>
              <div className="chart__bar-stack">
                {group.values.map((v) => (
                  <div
                    key={v.key}
                    className="chart__bar"
                    style={{ height: `${Math.max(1, Math.round(((Number(v.value) || 0) / max) * 100))}%`, background: v.color, maxWidth: 16 }}
                    title={`${group.label} • ${v.key}: ${v.value}`}
                  />
                ))}
              </div>
              <span className="chart__label">{group.label}</span>
            </div>
          )
        })}
      </div>
      <div className="chart__legend">
        {series.map((s) => (
          <span className="chart__legend-item" key={s.key}>
            <span className="chart__swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Donut chart. data = [{ name, value }] */
export function DonutChart({ data = [], size = 158, thickness = 20, centerLabel, centerValue }) {
  const valid = data.filter((d) => Number(d.value) > 0)
  const total = valid.reduce((sum, d) => sum + Number(d.value), 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  if (!valid.length) return <p className="muted small">No data available yet.</p>

  return (
    <div className="donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef1f6" strokeWidth={thickness} />
          {valid.map((item, index) => {
            const fraction = Number(item.value) / total
            const dash = fraction * circumference
            const el = (
              <circle
                key={item.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={colorFor(item.name) || PALETTE[index % PALETTE.length]}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              >
                <title>{`${item.name}: ${item.value}`}</title>
              </circle>
            )
            offset += dash
            return el
          })}
        </g>
        <text x="50%" y="47%" textAnchor="middle" className="donut__center-value" style={{ fontSize: 20, fontWeight: 700 }}>
          {centerValue ?? total}
        </text>
        <text x="50%" y="60%" textAnchor="middle" fill="#667085" style={{ fontSize: 11 }}>
          {centerLabel || 'Total'}
        </text>
      </svg>
      <div className="donut__legend">
        {valid.map((item) => (
          <div className="donut__legend-row" key={item.name}>
            <span className="chart__swatch" style={{ background: colorFor(item.name) }} />
            <span>{item.name}</span>
            <b>{item.value}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Multi-series line/area chart. data = [{ label, values: {key: number} }] */
export function LineChart({ data = [], series = [], height = 190, showArea = true }) {
  if (!data.length) return <p className="muted small">No data available yet.</p>
  const width = 640
  const padX = 34
  const padY = 18
  const allValues = data.flatMap((d) => series.map((s) => Number(d.values[s.key]) || 0))
  const max = Math.max(1, ...allValues)
  const stepX = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0
  const scaleY = (v) => height - padY - ((Number(v) || 0) / max) * (height - padY * 2)

  const points = (key) =>
    data.map((d, i) => [padX + i * stepX, scaleY(d.values[key])])

  const path = (key) => points(key).map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={padX}
            x2={width - padX}
            y1={padY + t * (height - padY * 2)}
            y2={padY + t * (height - padY * 2)}
            stroke="#eef1f6"
            strokeWidth="1"
          />
        ))}
        <text x={4} y={padY + 4} fontSize="10" fill="#98a2b3">{max}</text>
        <text x={4} y={height - padY} fontSize="10" fill="#98a2b3">0</text>
        {series.map((s, idx) => (
          <g key={s.key}>
            {showArea && (
              <path
                d={`${path(s.key)} L${padX + (data.length - 1) * stepX},${height - padY} L${padX},${height - padY} Z`}
                fill={s.color || PALETTE[idx % PALETTE.length]}
                opacity="0.09"
              />
            )}
            <path d={path(s.key)} fill="none" stroke={s.color || PALETTE[idx % PALETTE.length]} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
            {points(s.key).map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#fff" stroke={s.color || PALETTE[idx % PALETTE.length]} strokeWidth="2">
                <title>{`${data[i].label} • ${s.label}: ${data[i].values[s.key]}`}</title>
              </circle>
            ))}
          </g>
        ))}
        {data.map((d, i) => (
          <text key={d.label} x={padX + i * stepX} y={height - 3} fontSize="10" fill="#98a2b3" textAnchor="middle">
            {d.label}
          </text>
        ))}
      </svg>
      <div className="chart__legend">
        {series.map((s, idx) => (
          <span className="chart__legend-item" key={s.key}>
            <span className="chart__swatch" style={{ background: s.color || PALETTE[idx % PALETTE.length] }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Progress ring — used for attendance rate. */
export function Ring({ value = 0, size = 118, thickness = 11, label = 'Attendance', caption }) {
  const num = Math.max(0, Math.min(100, Number(value) || 0))
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const dash = (num / 100) * circumference
  const color = num >= 75 ? '#12b76a' : num >= 50 ? '#f79009' : '#f04438'
  return (
    <div className="center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef1f6" strokeWidth={thickness} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeLinecap="round"
          />
        </g>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 23, fontWeight: 700 }}>
          {num}%
        </text>
      </svg>
      <div className="small muted mt-1">{caption || label}</div>
    </div>
  )
}

export function Sparkline({ values = [], width = 120, height = 34, color = '#12b76a' }) {
  if (!values.length) return null
  const max = Math.max(1, ...values.map((v) => Number(v) || 0))
  const step = values.length > 1 ? width / (values.length - 1) : width
  const path = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(height - ((Number(v) || 0) / max) * height).toFixed(1)}`)
    .join(' ')
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export { PALETTE }
