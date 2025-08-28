"use client"
import { BBandsChart } from "@/components/bbands-chart"

export default function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <header className="mb-4 flex flex-col items-start justify-between gap-3 md:mb-6 md:flex-row md:items-center">
          <h1 className="text-pretty text-2xl font-semibold tracking-tight md:text-3xl">
            Bollinger Bands (KLineCharts)
          </h1>
          <a
            href="https://github.com/klinecharts/klinecharts"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border px-3 py-1.5 text-sm opacity-80 transition hover:bg-secondary hover:opacity-100"
          >
            KLineCharts docs
          </a>
        </header>
        <BBandsChart />
      </div>
    </main>
  )
}
