<template>
  <div v-if="total" class="mt-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm border-t-4 border-t-violet-400">
    <div class="flex items-baseline justify-between mb-3 pb-3 border-b border-gray-100">
      <h3 class="text-lg font-semibold text-violet-700 flex items-center gap-1.5">
        <span>📊</span>5★ 出貨抽數分佈
      </h3>
      <span class="text-gray-400 text-sm">共 {{ total }} 隻 5★（不含新手池）</span>
    </div>
    <div class="grid grid-cols-3 gap-2 mb-3">
      <div class="bg-white border border-gray-200 rounded-lg p-2.5 text-center">
        <div class="text-gray-500 text-sm">進軟保底前出貨（早出）</div>
        <div class="text-2xl font-bold text-emerald-600 tabular-nums">{{ pct(stats.early) }}</div>
        <div class="text-gray-400 text-xs">理論 {{ pct(stats.earlyExp) }}</div>
      </div>
      <div class="bg-white border border-gray-200 rounded-lg p-2.5 text-center">
        <div class="text-gray-500 text-sm">軟保底區出貨</div>
        <div class="text-2xl font-bold text-orange-500 tabular-nums">{{ pct(stats.soft) }}</div>
        <div class="text-gray-400 text-xs">理論 {{ pct(stats.softExp) }}</div>
      </div>
      <div class="bg-white border border-gray-200 rounded-lg p-2.5 text-center">
        <div class="text-gray-500 text-sm">最常出貨的區間</div>
        <div class="text-2xl font-bold text-gray-700 tabular-nums">{{ stats.mode }}</div>
        <div class="text-gray-400 text-xs">抽</div>
      </div>
    </div>
    <div ref="chartEl" class="w-full h-72"></div>
    <p class="text-gray-400 text-[13px] mt-2 leading-relaxed">
      長條 = 你實際在該區間出貨的 5★ 數（數字在區間下方）；虛線 = 依軟保底機率模型推算的理論數（角色池 90 抽、光錐池 80 抽分別計算）。軟保底：角色池 74 抽起、光錐池 65 抽起。
    </p>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { use, init } from 'echarts/core'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { BarChart, LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { pityModel, pityDistribution } from '../pityModel'

use([TooltipComponent, LegendComponent, GridComponent, BarChart, LineChart, CanvasRenderer])

const props = defineProps({
  detail: Map
})

const POOLS = ['11', '12', '21', '22', '1']
const BUCKET = 10
const BUCKETS = 9 // 1–10 … 81–90
const labels = Array.from({ length: BUCKETS }, (_, i) => `${i * BUCKET + 1}–${(i + 1) * BUCKET}`)

const chartEl = ref(null)
let chart = null

// 實際 / 理論 每區間的 5★ 數
const data = computed(() => {
  const actual = new Array(BUCKETS).fill(0)
  const expected = new Array(BUCKETS).fill(0)
  let early = 0, earlyExp = 0, soft = 0, softExp = 0, total = 0
  for (const key of POOLS) {
    const items = props.detail?.get(key)?.ssrPos || []
    if (!items.length) continue
    const { soft: softAt } = pityModel(key)
    const dist = pityDistribution(key)
    for (const item of items) {
      const pity = item[1]
      actual[Math.min(Math.floor((pity - 1) / BUCKET), BUCKETS - 1)]++
      if (pity < softAt) early++; else soft++
      total++
    }
    // 每隻 5★ 各自貢獻一份該池的理論分佈
    dist.forEach((p, i) => {
      expected[Math.min(Math.floor(i / BUCKET), BUCKETS - 1)] += p * items.length
      if (i + 1 < softAt) earlyExp += p * items.length; else softExp += p * items.length
    })
  }
  return { actual, expected, early, earlyExp, soft, softExp, total }
})

const total = computed(() => data.value.total)

const stats = computed(() => {
  const d = data.value
  let modeIdx = 0
  d.actual.forEach((v, i) => { if (v > d.actual[modeIdx]) modeIdx = i })
  return {
    early: d.early / d.total, earlyExp: d.earlyExp / d.total,
    soft: d.soft / d.total, softExp: d.softExp / d.total,
    mode: labels[modeIdx]
  }
})

const pct = (v) => `${Math.round(v * 100)}%`

const buildOption = () => {
  const d = data.value
  return {
    grid: { left: 40, right: 20, top: 36, bottom: 44 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const i = params[0].dataIndex
        return `第 ${labels[i]} 抽<br/>你的 5★：<b>${d.actual[i]}</b> 隻<br/>理論：${d.expected[i].toFixed(1)} 隻`
      },
      padding: 6,
      textStyle: { fontSize: 14 }
    },
    legend: {
      data: ['實際', '理論'],
      top: 0,
      right: 0,
      textStyle: { fontSize: 13 },
      itemGap: 12
    },
    xAxis: {
      type: 'category',
      data: labels,
      // 實際數量放在 X 軸標籤下方，避免被理論線蓋住
      axisLabel: {
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 18,
        formatter: (v, i) => `${v}
{n|${d.actual[i]} 隻}`,
        rich: { n: { fontSize: 13, fontWeight: 'bold', color: '#374151' } }
      },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '5★ 數',
      minInterval: 1,
      nameTextStyle: { fontSize: 12, color: '#9ca3af' },
      axisLabel: { fontSize: 12, color: '#9ca3af' },
      splitLine: { lineStyle: { color: '#f3f4f6' } }
    },
    series: [
      {
        name: '理論',
        type: 'line',
        z: 1,
        data: d.expected.map(v => Math.round(v * 10) / 10),
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#6b7280', width: 2, type: 'dashed' },
        itemStyle: { color: '#6b7280', borderColor: '#fff', borderWidth: 2 }
      },
      {
        name: '實際',
        type: 'bar',
        z: 3,
        data: d.actual,
        barMaxWidth: 48,
        itemStyle: { color: '#60a5fa', borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: '#3b82f6' } },
      }
    ]
  }
}

const render = () => {
  if (!chartEl.value) return
  if (!chart) chart = init(chartEl.value)
  chart.setOption(buildOption(), { notMerge: true })
  chart.resize()
}

// 監聽容器大小：頁籤切回來時也會重畫
let observer = null
onMounted(() => {
  nextTick(render)
  observer = new ResizeObserver(() => chart?.resize())
  nextTick(() => chartEl.value && observer.observe(chartEl.value))
})

onUnmounted(() => {
  observer?.disconnect()
  chart?.dispose()
  chart = null
})

watch(data, () => nextTick(render))
</script>
