export function generateOHLC({ bars = 300, startPrice = 100 }: { bars?: number; startPrice?: number }) {
  let t = Date.now() - bars * 24 * 60 * 60 * 1000
  let p = startPrice
  const out: { timestamp: number; open: number; high: number; low: number; close: number; volume: number }[] = []
  for (let i = 0; i < bars; i++) {
    const drift = (Math.random() - 0.5) * 2
    const open = p
    const close = Math.max(1, open + drift * (1 + Math.random()))
    const high = Math.max(open, close) + Math.random() * 1.5
    const low = Math.min(open, close) - Math.random() * 1.5
    out.push({
      timestamp: t,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume: Math.floor(1000 + Math.random() * 5000),
    })
    p = close
    t += 24 * 60 * 60 * 1000
  }
  return out
}
function round(v: number) {
  return Math.round(v * 100) / 100
}
