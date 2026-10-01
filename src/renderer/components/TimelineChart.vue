<template>
  <div v-if="hasData" class="mt-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm border-t-4 border-t-violet-400">
    <div class="flex items-baseline justify-between mb-3 pb-3 border-b border-gray-100">
      <h3 class="text-lg font-semibold text-violet-700 flex items-center gap-1.5">
        <span>📈</span>抽卡節奏
      </h3>
      <span class="text-gray-400 text-sm">上：每月抽數　下：每月 5★ 數</span>
    </div>
    <div class="flex items-center gap-4 mb-2 text-sm text-gray-500">
      <span>計入：限定</span>
      <el-checkbox v-model="include.collab">連動</el-checkbox>
      <el-checkbox v-model="include.standard">常駐（含新手）</el-checkbox>
    </div>
    <!-- 總花費：跟著上面的卡池勾選 -->
    <div class="grid grid-cols-4 gap-2 mb-3">
      <div class="bg-white border border-gray-200 rounded-lg p-2.5 text-center">
        <div class="text-gray-500 text-sm">總抽數</div>
        <div class="text-2xl font-bold text-gray-800 tabular-nums">{{ formatNum(spending.pulls) }}</div>
        <div class="text-gray-400 text-xs">抽</div>
      </div>
      <div class="bg-white border border-gray-200 rounded-lg p-2.5 text-center">
        <div class="text-gray-500 text-sm">等值星瓊</div>
        <div class="text-2xl font-bold text-violet-600 tabular-nums">{{ formatNum(spending.jade) }}</div>
        <div class="text-gray-400 text-xs">每抽 {{ JADE_PER_PULL }} 星瓊</div>
      </div>
      <div class="bg-white border border-gray-200 rounded-lg p-2.5 text-center cursor-help"
           :title="`以最大面額 ${SHARD_PACK} 古老夢華 = NT$${formatNum(PACK_TWD)} 換算（每抽約 NT$${perPullTwd}），未計首儲雙倍與月卡`">
        <div class="text-gray-500 text-sm">約合台幣</div>
        <div class="text-2xl font-bold text-orange-500 tabular-nums">NT$ {{ formatNum(spending.twd) }}</div>
        <div class="text-gray-400 text-xs">含免費取得的抽數</div>
      </div>
      <div class="bg-white border border-gray-200 rounded-lg p-2.5 text-center">
        <div class="text-gray-500 text-sm">每月平均</div>
        <div class="text-2xl font-bold text-gray-800 tabular-nums">{{ formatNum(spending.perMonth) }}</div>
        <div class="text-gray-400 text-xs">抽 / 月（{{ spending.months }} 個月）</div>
      </div>
    </div>
    <div ref="chartEl" class="w-full h-72 xl:h-[28rem]"></div>
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

// 花費換算：1 抽 = 160 星瓊；台幣以最大面額 6480 古老夢華 = NT$3,290 計（1 古老夢華 = 1 星瓊）
const JADE_PER_PULL = 160
const SHARD_PACK = 6480
const PACK_TWD = 3290
const perPullTwd = Math.round(JADE_PER_PULL / SHARD_PACK * PACK_TWD)

const formatNum = (n) => n.toLocaleString('zh-TW')

const spending = computed(() => {
  const pulls = buckets.value.reduce((a, b) => a + b.total, 0)
  const jade = pulls * JADE_PER_PULL
  const months = buckets.value.length || 1
  return {
    pulls,
    jade,
    twd: Math.round(jade / SHARD_PACK * PACK_TWD),
    months,
    perMonth: Math.round(pulls / months)
  }
})

const peakMonth = computed(() => {
  if (!buckets.value.length) return null
  let max = buckets.value[0]
  for (const b of buckets.value) {
    if (b.total > max.total) max = b
  }
  return { label: max.key, total: max.total }
})

// 上下兩張小圖共用月份軸（不用雙 Y 軸）：上 = 每月抽數，下 = 每月 5★ 數
const buildOption = () => {
  const xs = buckets.value.map(b => b.key)
  const totals = buckets.value.map(b => b.total)
  const ssrs = buckets.value.map(b => b.ssr)
  const axisText = { fontSize: 12, color: '#9ca3af' }
  const valueAxis = (gridIndex, name, splitNumber) => ({
    type: 'value',
    gridIndex,
    name,
    minInterval: 1,
    splitNumber,
    nameTextStyle: axisText,
    axisLabel: axisText,
    splitLine: { lineStyle: { color: '#f3f4f6' } }
  })
  const monthAxis = (gridIndex, showLabel) => ({
    type: 'category',
    gridIndex,
    data: xs,
    axisLabel: showLabel
      ? { ...axisText, interval: 'auto', rotate: xs.length > 12 ? 30 : 0 }
      : { show: false },
    axisTick: { show: false },
    axisLine: { lineStyle: { color: '#e5e7eb' } }
  })
  return {
    grid: [
      { left: 48, right: 16, top: 28, height: '52%' },
      { left: 48, right: 16, top: '70%', bottom: 36 }
    ],
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const i = params[0].dataIndex
        const total = totals[i], ssr = ssrs[i]
        const rate = total > 0 ? ((ssr / total) * 100).toFixed(1) : '0.0'
        return `${xs[i]}<br/>抽數: <b>${total}</b><br/>5★: <b>${ssr}</b> (${rate}%)`
      },
      padding: 6,
      textStyle: { fontSize: 14 }
    },
    xAxis: [monthAxis(0, false), monthAxis(1, true)],
    yAxis: [valueAxis(0, '抽數', 4), valueAxis(1, '5★', 2)],
    series: [
      {
        name: '抽數',
        type: 'bar',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: totals,
        itemStyle: { color: '#93c5fd', borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: '#3b82f6' } },
        barMaxWidth: 28
      },
      {
        name: '5★',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: ssrs,
        itemStyle: { color: '#fbbf24', borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: '#f59e0b' } },
        barMaxWidth: 28
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

// 監聽容器本身的大小：頁籤切回來（從隱藏變顯示）時也會重畫
let observer = null

onMounted(() => {
  nextTick(render)
  observer = new ResizeObserver(() => chart?.resize())
  if (chartEl.value) observer.observe(chartEl.value)
})

onUnmounted(() => {
  observer?.disconnect()
  chart?.dispose()
  chart = null
})

watch(buckets, () => nextTick(render))
</script>
