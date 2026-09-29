<template>
  <div v-if="hasData" class="mt-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm border-t-4 border-t-violet-400">
    <div class="flex items-baseline justify-between mb-3 pb-3 border-b border-gray-100">
      <h3 class="text-lg font-semibold text-violet-700 flex items-center gap-1.5">
        <span>📈</span>抽卡節奏
      </h3>
      <span class="text-gray-400 text-sm">每月抽數（柱）vs 每月 5★ 數（點）</span>
    </div>
    <div class="flex items-center gap-4 mb-2 text-sm text-gray-500">
      <span>計入：限定</span>
      <el-checkbox v-model="include.collab">連動</el-checkbox>
      <el-checkbox v-model="include.standard">常駐（含新手）</el-checkbox>
    </div>
    <div ref="chartEl" class="w-full h-56 xl:h-96"></div>
    <p class="text-gray-400 text-[13px] mt-2 leading-relaxed">
      月份依抽卡時間（本地時區）分桶。
      <span v-if="peakMonth"> · 最高峰：<span class="text-gray-600 font-medium">{{ peakMonth.label }}</span> 抽了 {{ peakMonth.total }} 抽。</span>
    </p>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { use, init } from 'echarts/core'
import {
  TitleComponent, TooltipComponent, LegendComponent,
  GridComponent
} from 'echarts/components'
import { BarChart, LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'

use([TitleComponent, TooltipComponent, LegendComponent, GridComponent, BarChart, LineChart, CanvasRenderer])

const props = defineProps({
  gachaData: Object
})

const chartEl = ref(null)
let chart = null

// 限定池（11/12）一律計入；連動、常駐（含新手）可切換
const include = reactive({ collab: true, standard: false })

const includedKeys = computed(() => {
  const keys = new Set(['11', '12'])
  if (include.collab) { keys.add('21'); keys.add('22') }
  if (include.standard) { keys.add('1'); keys.add('2') }
  return keys
})

// 月份範圍以全部資料為準，切換篩選時 X 軸不會跳動
const allMonths = computed(() => {
  const result = props.gachaData?.result
  if (!result) return []
  const set = new Set()
  for (const [, list] of result) {
    if (!Array.isArray(list)) continue
    for (const it of list) {
      const d = new Date(it.time)
      if (isNaN(d.getTime())) continue
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
  }
  return [...set].sort()
})

const buckets = computed(() => {
  const result = props.gachaData?.result
  if (!result) return []
  const map = new Map(allMonths.value.map(k => [k, { total: 0, ssr: 0 }])) // 'YYYY-MM' -> { total, ssr }
  for (const [key, list] of result) {
    if (!includedKeys.value.has(key)) continue
    if (!Array.isArray(list)) continue
    for (const it of list) {
      const d = new Date(it.time)
      if (isNaN(d.getTime())) continue
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, { total: 0, ssr: 0 })
      const e = map.get(key)
      e.total++
      if (it.rank_type === '5') e.ssr++
    }
  }
  const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  return sorted.map(([k, v]) => ({ key: k, ...v }))
})

const hasData = computed(() => buckets.value.length >= 2)

const peakMonth = computed(() => {
  if (!buckets.value.length) return null
  let max = buckets.value[0]
  for (const b of buckets.value) {
    if (b.total > max.total) max = b
  }
  return { label: max.key, total: max.total }
})

const buildOption = () => {
  const xs = buckets.value.map(b => b.key)
  const totals = buckets.value.map(b => b.total)
  const ssrs = buckets.value.map(b => b.ssr)
  return {
    grid: { left: 40, right: 40, top: 32, bottom: 30 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const month = params[0].axisValue
        const total = params.find(p => p.seriesName === '抽數')?.value ?? 0
        const ssr = params.find(p => p.seriesName === '5★')?.value ?? 0
        const rate = total > 0 ? ((ssr / total) * 100).toFixed(1) : '0.0'
        return `${month}<br/>抽數: <b>${total}</b><br/>5★: <b>${ssr}</b> (${rate}%)`
      },
      padding: 6,
      textStyle: { fontSize: 14 }
    },
    legend: {
      data: ['抽數', '5★'],
      top: 0,
      right: 0,
      textStyle: { fontSize: 13 },
      itemGap: 12
    },
    xAxis: {
      type: 'category',
      data: xs,
      axisLabel: { fontSize: 12, color: '#9ca3af', interval: 'auto', rotate: xs.length > 12 ? 30 : 0 },
      axisLine: { lineStyle: { color: '#e5e7eb' } }
    },
    yAxis: [
      {
        type: 'value',
        name: '抽數',
        nameTextStyle: { fontSize: 12, color: '#9ca3af' },
        axisLabel: { fontSize: 12, color: '#9ca3af' },
        splitLine: { lineStyle: { color: '#f3f4f6' } }
      },
      {
        type: 'value',
        name: '5★',
        nameTextStyle: { fontSize: 12, color: '#9ca3af' },
        axisLabel: { fontSize: 12, color: '#9ca3af' },
        splitLine: { show: false },
        minInterval: 1
      }
    ],
    series: [
      {
        name: '抽數',
        type: 'bar',
        data: totals,
        itemStyle: { color: '#93c5fd', borderRadius: [3, 3, 0, 0] },
        emphasis: { itemStyle: { color: '#3b82f6' } },
        barMaxWidth: 28
      },
      {
        name: '5★',
        type: 'line',
        yAxisIndex: 1,
        data: ssrs,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#f59e0b', width: 2 },
        itemStyle: { color: '#f59e0b' }
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

const onResize = () => chart?.resize()

onMounted(() => {
  nextTick(render)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
  chart = null
})

watch(buckets, () => nextTick(render))
</script>
