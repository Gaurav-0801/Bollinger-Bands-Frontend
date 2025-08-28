"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { generateOHLC } from "@/lib/generate-ohlc"
import { registerBBands } from "@/lib/register-bbands"

type AnyChart = any
type LineStyle = "solid" | "dashed"

type Inputs = {
  length: number
  maType: "SMA"
  source: "close"
  stdDev: number
  offset: number
}

type StyleOpts = {
  basis: { show: boolean; color: string; width: number; style: LineStyle }
  upper: { show: boolean; color: string; width: number; style: LineStyle }
  lower: { show: boolean; color: string; width: number; style: LineStyle }
  bandFill: { show: boolean; opacity: number }
}

const DEFAULT_INPUTS: Inputs = { length: 20, maType: "SMA", source: "close", stdDev: 2, offset: 0 }
const DEFAULT_STYLE: StyleOpts = {
  basis: { show: true, color: "#60a5fa", width: 2, style: "solid" },
  upper: { show: true, color: "#22c55e", width: 2, style: "solid" },
  lower: { show: true, color: "#ef4444", width: 2, style: "solid" },
  bandFill: { show: true, opacity: 0.12 },
}

const PANE_ID = "candle_pane"

function cloneInputs(): Inputs {
  return { ...DEFAULT_INPUTS }
}
function cloneStyle(): StyleOpts {
  return {
    basis: { ...DEFAULT_STYLE.basis },
    upper: { ...DEFAULT_STYLE.upper },
    lower: { ...DEFAULT_STYLE.lower },
    bandFill: { ...DEFAULT_STYLE.bandFill },
  }
}

export function BBandsChart() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<AnyChart | null>(null)
  const indicatorIdRef = useRef<string | null>(null)
  const [inputs, setInputs] = useState<Inputs>(cloneInputs())
  const [style, setStyle] = useState<StyleOpts>(cloneStyle())
  const [open, setOpen] = useState(false)
  const [added, setAdded] = useState(false)

  const data = useMemo(() => generateOHLC({ bars: 300, startPrice: 200 }), [])

  useEffect(() => {
    let dispose: (() => void) | undefined
    async function initChart() {
      const kline = await import("klinecharts")
      registerBBands(kline)
      const container = containerRef.current!
      const chart = kline.init(container, { styles: { candle: { type: "candle_solid" } } })
      chartRef.current = chart
      chart.applyNewData(data)
      dispose = () => chart.dispose?.()
    }
    initChart()
    return () => dispose?.()
  }, [data])

  // auto-resize the chart on container/window resize for responsiveness
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handle = () => chartRef.current?.resize?.()
    const ro = new ResizeObserver(handle)
    ro.observe(el)
    window.addEventListener("resize", handle)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", handle)
    }
  }, [])

  // Update indicator live
  useEffect(() => {
    if (!added || !chartRef.current) return
    createOrUpdateIndicator(chartRef.current, indicatorIdRef, inputs, style)
  }, [inputs, style, added])

  const addIndicator = useCallback(() => {
    if (!chartRef.current || added) return
    createOrUpdateIndicator(chartRef.current, indicatorIdRef, inputs, style)
    setAdded(true)
  }, [inputs, style, added])

  const onReset = useCallback(() => {
    if (chartRef.current) {
      if (indicatorIdRef.current) {
        chartRef.current.removeIndicator?.(PANE_ID, indicatorIdRef.current)
        indicatorIdRef.current = null
      } else {
        try {
          chartRef.current.removeIndicator?.(PANE_ID, "BBANDS_V0")
        } catch {}
      }
    }
    setAdded(false)
    setInputs(cloneInputs())
    setStyle(cloneStyle())
  }, [])

  return (
    <Card className="p-3 md:p-4">
      <div className="mb-3 flex flex-col items-start justify-between gap-2 md:mb-4 md:flex-row md:items-center relative z-20 pointer-events-auto">
        <div className="text-sm opacity-80">
          Demo dataset (candles: {data.length}). Hover crosshair for Basis/Upper/Lower.
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onReset} disabled={!added} type="button">
            Reset
          </Button>
          <Button size="sm" onClick={addIndicator} disabled={added}>
            {added ? "Indicator added" : "Add indicator"}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!added}>
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader className="flex items-center justify-between">
                <DialogTitle>Bollinger Bands — Settings</DialogTitle>
                <Button variant="ghost" size="sm" onClick={onReset} disabled={!added}>
                  Reset
                </Button>
              </DialogHeader>
              <Tabs defaultValue="inputs">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="inputs">Inputs</TabsTrigger>
                  <TabsTrigger value="style">Style</TabsTrigger>
                </TabsList>
                <TabsContent value="inputs" className="pt-4">
                  <InputsTab inputs={inputs} onChange={setInputs} />
                </TabsContent>
                <TabsContent value="style" className="pt-4">
                  <StyleTab style={style} onChange={setStyle} />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div
        ref={containerRef}
        className="relative z-0 h-[55vh] min-h-[420px] w-full rounded-lg border bg-card md:h-[65vh]"
      />
    </Card>
  )
}

function buildStyles(style: StyleOpts) {
  return {
    basis: {
      color: style.basis.show ? style.basis.color : "transparent",
      size: style.basis.width,
      style: style.basis.style,
    },
    upper: {
      color: style.upper.show ? style.upper.color : "transparent",
      size: style.upper.width,
      style: style.upper.style,
    },
    lower: {
      color: style.lower.show ? style.lower.color : "transparent",
      size: style.lower.width,
      style: style.lower.style,
    },
    bandFill: { show: style.bandFill.show, opacity: style.bandFill.opacity },
  }
}

function createOrUpdateIndicator(
  chart: AnyChart,
  idRef: React.MutableRefObject<string | null>,
  inputs: Inputs,
  style: StyleOpts,
) {
  if (!chart) return

  // remove any previously created instance for a clean re-create/update
  if (idRef.current) {
    chart.removeIndicator?.(PANE_ID, idRef.current)
    idRef.current = null
  } else {
    try {
      chart.removeIndicator?.(PANE_ID, "BBANDS_V0")
    } catch {}
  }

  const created = chart.createIndicator("BBANDS_V0", false, {
    id: PANE_ID,
    calcParams: [inputs.length, inputs.stdDev, inputs.offset],
    styles: buildStyles(style),
  })

  const createdId =
    typeof created === "string"
      ? created
      : typeof created?.id === "string"
        ? created.id
        : typeof created?.indicator?.id === "string"
          ? created.indicator.id
          : null

  idRef.current = createdId
}

function InputsTab({ inputs, onChange }: { inputs: Inputs; onChange: (v: Inputs) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="length">Length</Label>
        <Input
          id="length"
          type="number"
          min={1}
          value={inputs.length}
          onChange={(e) => onChange({ ...inputs, length: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="std">StdDev (multiplier)</Label>
        <Input
          id="std"
          type="number"
          step="0.1"
          min={0}
          value={inputs.stdDev}
          onChange={(e) => onChange({ ...inputs, stdDev: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-2">
        <Label>Basic MA Type</Label>
        <div className="text-sm rounded-md border px-3 py-2 opacity-80">SMA</div>
      </div>
      <div className="space-y-2">
        <Label>Source</Label>
        <div className="text-sm rounded-md border px-3 py-2 opacity-80">Close</div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="offset">Offset</Label>
        <Input
          id="offset"
          type="number"
          step={1}
          value={inputs.offset}
          onChange={(e) => onChange({ ...inputs, offset: Number(e.target.value) })}
        />
      </div>
    </div>
  )
}

function StyleTab({ style, onChange }: { style: StyleOpts; onChange: (v: StyleOpts) => void }) {
  return (
    <div className="space-y-6">
      <LineGroup label="Basic (middle)" cfg={style.basis} onChange={(v) => onChange({ ...style, basis: v })} />
      <LineGroup label="Upper band" cfg={style.upper} onChange={(v) => onChange({ ...style, upper: v })} />
      <LineGroup label="Lower band" cfg={style.lower} onChange={(v) => onChange({ ...style, lower: v })} />
      <div className="grid grid-cols-2 items-center gap-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={style.bandFill.show}
            onCheckedChange={(c) => onChange({ ...style, bandFill: { ...style.bandFill, show: c } })}
          />
          <Label>Background fill</Label>
        </div>
        <div className={cn("flex items-center gap-3", !style.bandFill.show && "opacity-50")}>
          <Label className="w-24">Opacity</Label>
          <input
            aria-label="Band fill opacity"
            className="h-2 w-40 cursor-pointer rounded bg-muted md:w-48"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={style.bandFill.opacity}
            onChange={(e) => onChange({ ...style, bandFill: { ...style.bandFill, opacity: Number(e.target.value) } })}
          />
          <Input
            className="w-20"
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={style.bandFill.opacity}
            onChange={(e) => onChange({ ...style, bandFill: { ...style.bandFill, opacity: Number(e.target.value) } })}
          />
        </div>
      </div>
    </div>
  )
}

function LineGroup({
  label,
  cfg,
  onChange,
}: {
  label: string
  cfg: { show: boolean; color: string; width: number; style: LineStyle }
  onChange: (v: { show: boolean; color: string; width: number; style: LineStyle }) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex items-center gap-3">
        <Switch checked={cfg.show} onCheckedChange={(c) => onChange({ ...cfg, show: c })} />
        <Label>{label}</Label>
      </div>
      <div className={cn("grid grid-cols-3 items-center gap-3", !cfg.show && "opacity-50")}>
        <div className="flex items-center gap-2">
          <Label className="w-12">Color</Label>
          <input
            aria-label={`${label} color`}
            className="h-9 w-12 cursor-pointer rounded border"
            type="color"
            value={cfg.color}
            onChange={(e) => onChange({ ...cfg, color: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="w-12">Width</Label>
          <Input
            type="number"
            min={1}
            max={5}
            value={cfg.width}
            onChange={(e) => onChange({ ...cfg, width: Number(e.target.value) })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="w-12">Style</Label>
          <select
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={cfg.style}
            onChange={(e) => onChange({ ...cfg, style: e.target.value as LineStyle })}
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
          </select>
        </div>
      </div>
    </div>
  )
}
