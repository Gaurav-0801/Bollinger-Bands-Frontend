// Basis = SMA(close, length)
// StdDev = population standard deviation over last `length` closes
// Upper = Basis + multiplier * StdDev
// Lower = Basis - multiplier * StdDev
// Offset: shift series by N bars (positive = forward/right)

type AnyKLine = any

export function registerBBands(kline: AnyKLine) {
  if (kline?.getIndicatorClass?.("BBANDS_V0")) return

  const name = "BBANDS_V0"
  kline.registerIndicator?.({
    name,
    shortName: "BB",
    calcParams: [20, 2, 0], // [length, stdMult, offset]
    shouldCheckParam: (p: number[]) => p[0] >= 1 && p[1] >= 0,
    figures: [
      { key: "basis", title: "Basis: ", type: "line" },
      { key: "upper", title: "Upper: ", type: "line" },
      { key: "lower", title: "Lower: ", type: "line" },
    ],
    styles: {
      basis: { color: "#60a5fa", size: 2, style: "solid" },
      upper: { color: "#22c55e", size: 2, style: "solid" },
      lower: { color: "#ef4444", size: 2, style: "solid" },
      bandFill: { show: true, opacity: 0.12 },
    },
    calc: (list: any[], { params }: any) => {
      const length = Number(params?.[0] ?? 20)
      const mult = Number(params?.[1] ?? 2)
      const offset = Number(params?.[2] ?? 0)

      const closes = list.map((d) => Number(d.close))
      const n = closes.length
      const basis: (number | null)[] = Array(n).fill(null)
      const stdev: (number | null)[] = Array(n).fill(null)

      let sum = 0
      let sqSum = 0
      for (let i = 0; i < n; i++) {
        const c = closes[i]
        sum += c
        sqSum += c * c
        if (i >= length) {
          const out = closes[i - length]
          sum -= out
          sqSum -= out * out
        }
        if (i >= length - 1) {
          const mean = sum / length
          const variance = Math.max(0, sqSum / length - mean * mean) // population variance
          basis[i] = mean
          stdev[i] = Math.sqrt(variance)
        }
      }

      const rows = list.map((_, i) => {
        const b = basis[i]
        const s = stdev[i]
        if (b == null || s == null) return {}
        return { basis: b, upper: b + mult * s, lower: b - mult * s }
      })

      if (offset !== 0) {
        const empty = Array(Math.abs(offset)).fill({})
        return offset > 0
          ? [...empty, ...rows].slice(0, rows.length)
          : [...rows.slice(-offset), ...empty].slice(0, rows.length)
      }
      return rows
    },
    draw: ({ ctx, dataSource, styles, xAxis, yAxis }: any) => {
      const values = dataSource?.indicator?.result || []
      const toX = (i: number) => xAxis.convertToPixel(i)
      const toY = (v: number) => yAxis.convertToPixel(v)

      const path = { basis: new Path2D(), upper: new Path2D(), lower: new Path2D() }
      let first = true
      values.forEach((row: any, i: number) => {
        if (row?.basis == null || row?.upper == null || row?.lower == null) return
        const x = toX(i)
        const yB = toY(row.basis)
        const yU = toY(row.upper)
        const yL = toY(row.lower)
        if (first) {
          path.basis.moveTo(x, yB)
          path.upper.moveTo(x, yU)
          path.lower.moveTo(x, yL)
          first = false
        } else {
          path.basis.lineTo(x, yB)
          path.upper.lineTo(x, yU)
          path.lower.lineTo(x, yL)
        }
      })

      const canFill =
        styles?.bandFill?.show && styles?.upper?.color !== "transparent" && styles?.lower?.color !== "transparent"

      if (canFill) {
        ctx.save()
        ctx.globalAlpha = styles?.bandFill?.opacity ?? 0.1
        const fill = new Path2D()
        let started = false
        values.forEach((r: any, i: number) => {
          if (r?.upper == null) return
          const x = toX(i),
            y = toY(r.upper)
          if (!started) {
            fill.moveTo(x, y)
            started = true
          } else fill.lineTo(x, y)
        })
        for (let i = values.length - 1; i >= 0; i--) {
          const r = values[i]
          if (r?.lower == null) continue
          fill.lineTo(toX(i), toY(r.lower))
        }
        ctx.fillStyle = styles?.upper?.color || "rgba(255,255,255,0.1)"
        ctx.fill(fill, "nonzero")
        ctx.restore()
      }

      drawStyledLine(ctx, path.upper, styles?.upper)
      drawStyledLine(ctx, path.lower, styles?.lower)
      drawStyledLine(ctx, path.basis, styles?.basis)
      return false
    },
  })
}

function drawStyledLine(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  s?: { color?: string; size?: number; style?: "solid" | "dashed" },
) {
  if (!s || !s.color || s.color === "transparent") return
  ctx.save()
  ctx.strokeStyle = s.color
  ctx.lineWidth = s.size ?? 2
  if (s.style === "dashed") ctx.setLineDash([6, 6])
  else ctx.setLineDash([])
  ctx.stroke(path)
  ctx.restore()
}
