import { useState } from 'react'

// Single-series charts: one hue, no legend (the title names the series), recessive grid,
// 4px rounded bar ends on the baseline, 2px gaps, tap/hover a bar to read its value.

const BAR = '#047857' // emerald-700 on white surface
const BAR_ACTIVE = '#065f46'
const GRID = '#e7e5e4'

const niceMax = (value) => {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  return [1, 2, 2.5, 5, 10].find((s) => s * power >= value) * power
}

/** data: [{ key, label, value, tooltip }] */
export function ColumnChart({ data, format = (v) => v, height = 220, labelEvery = 1, highlightKey, ariaLabel }) {
  const [hover, setHover] = useState(null)
  const max = niceMax(Math.max(...data.map((d) => d.value), 0))
  const ticks = [0, max / 2, max]
  const active = data.find((d) => d.key === hover)

  return (
    <figure className="m-0" aria-label={ariaLabel}>
      <div className="relative" style={{ height }}>
        {/* grid + y labels */}
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${(t / max) * 100}%` }}>
            <span className="w-14 -translate-y-1/2 text-right text-sm tabular-nums text-stone-500">{format(t)}</span>
            <span className="h-px flex-1 -translate-y-1/2" style={{ background: GRID }} />
          </div>
        ))}

        <div className="absolute bottom-0 left-16 right-0 top-0 flex items-end" style={{ gap: 2 }}>
          {data.map((d) => {
            const isActive = d.key === hover
            return (
              <button
                key={d.key}
                type="button"
                className="relative flex h-full flex-1 items-end outline-none"
                onMouseEnter={() => setHover(d.key)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(d.key)}
                onBlur={() => setHover(null)}
                onClick={() => setHover(d.key)}
                aria-label={d.tooltip ?? `${d.label} ${format(d.value)}`}
              >
                <span
                  className="block w-full"
                  style={{
                    height: `${(d.value / max) * 100}%`,
                    minHeight: d.value ? 2 : 0,
                    background: isActive || d.key === highlightKey ? BAR_ACTIVE : BAR,
                    opacity: hover && !isActive ? 0.55 : 1,
                    borderRadius: '4px 4px 0 0',
                  }}
                />
              </button>
            )
          })}
        </div>

        {active ? (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border border-stone-200 bg-white px-3 py-2 text-base shadow-lg"
            style={{ left: `calc(4rem + (100% - 4rem) * ${(data.indexOf(active) + 0.5) / data.length})` }}
          >
            <p className="font-semibold text-stone-600">{active.label}</p>
            <p className="text-xl font-extrabold tabular-nums text-stone-900">{active.tooltip ?? format(active.value)}</p>
          </div>
        ) : null}
      </div>

      <div className="ml-16 mt-1 flex" style={{ gap: 2 }}>
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 truncate text-center text-sm text-stone-600">
            {i % labelEvery === 0 ? d.label : ''}
          </span>
        ))}
      </div>
    </figure>
  )
}

/** Ranked horizontal bars. rows: [{ key, label, value, sub }] */
export function BarList({ rows, format = (v) => v }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="text-lg font-bold text-stone-900">{r.label}</span>
            <span className="text-lg font-bold tabular-nums text-stone-900">
              {format(r.value)}
              {r.sub ? <span className="ml-2 text-base font-normal text-stone-600">{r.sub}</span> : null}
            </span>
          </div>
          <div className="h-4 rounded" style={{ background: GRID }}>
            <div className="h-4" style={{ width: `${(r.value / max) * 100}%`, background: BAR, borderRadius: '0 4px 4px 0' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
