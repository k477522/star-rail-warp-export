<template>
  <div class="mt-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm border-t-4 border-t-violet-400">
    <div class="flex items-baseline justify-between mb-4 pb-3 border-b border-gray-100">
      <h3 class="text-lg font-semibold text-violet-700 flex items-center gap-1.5">
        <span>🎯</span>抽卡規劃
      </h3>
      <span class="text-gray-400 text-sm">依軟保底機率模型精確計算；先抽角色，剩下的抽數再抽光錐</span>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
      <!-- 輸入 -->
      <section class="space-y-4">
        <div>
          <p class="text-gray-700 font-semibold mb-2">手上資源</p>
          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="text-gray-500 text-sm">星瓊</span>
              <el-input-number v-model="form.jade" :min="0" :step="160" class="!w-full" controls-position="right" />
            </label>
            <label class="block">
              <span class="text-gray-500 text-sm">專票</span>
              <el-input-number v-model="form.passes" :min="0" class="!w-full" controls-position="right" />
            </label>
          </div>
          <p class="text-gray-500 text-sm mt-2">可抽 <b class="text-gray-800 text-base tabular-nums">{{ budget }}</b> 抽</p>
        </div>

        <div>
          <p class="text-gray-700 font-semibold mb-2">目標</p>
          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="text-gray-500 text-sm">角色</span>
              <el-select v-model="form.charCopies" class="!w-full">
                <el-option v-for="o of charOptions" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </label>
            <label class="block">
              <span class="text-gray-500 text-sm">光錐</span>
              <el-select v-model="form.coneCopies" class="!w-full">
                <el-option v-for="o of coneOptions" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </label>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-gray-700 font-semibold">目前狀態</p>
            <el-radio-group v-model="form.banner" size="small" @change="loadState">
              <el-radio-button label="event">限定池</el-radio-button>
              <el-radio-button label="collab">聯動池</el-radio-button>
            </el-radio-group>
          </div>
          <div class="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 text-sm">
            <span class="text-gray-500">角色池已墊</span>
            <el-input-number v-model="form.charPity" :min="0" :max="89" size="small" controls-position="right" />
            <el-checkbox v-model="form.charGuaranteed">大保底</el-checkbox>
            <span class="text-gray-500">光錐池已墊</span>
            <el-input-number v-model="form.conePity" :min="0" :max="79" size="small" controls-position="right" />
            <el-checkbox v-model="form.coneGuaranteed">大保底</el-checkbox>
          </div>
          <p class="text-gray-400 text-xs mt-2">已從你的抽卡紀錄帶入，可自行修改。<el-button text size="small" type="primary" @click="loadState">重新帶入</el-button></p>
        </div>
      </section>

      <!-- 結果 -->
      <section>
        <div v-if="!hasTarget" class="h-full flex items-center justify-center text-gray-400">請選擇要抽的角色或光錐</div>
        <template v-else>
          <div class="grid grid-cols-3 gap-2 mb-4">
            <div class="border-2 rounded-lg p-3 text-center" :class="probTone(result.both).box">
              <div class="text-gray-600 text-sm">達成目標機率</div>
              <div class="text-4xl font-bold tabular-nums" :class="probTone(result.both).text">{{ pct(result.both) }}</div>
              <div class="text-gray-500 text-xs mt-1">{{ targetLabel }}，{{ budget }} 抽內</div>
            </div>
            <div class="border border-gray-200 rounded-lg p-3 text-center">
              <div class="text-gray-500 text-sm">要有 50% 把握</div>
              <div class="text-2xl font-bold text-gray-800 tabular-nums">{{ result.q50 ?? '—' }} <span class="text-sm font-normal text-gray-400">抽</span></div>
              <div class="text-gray-400 text-xs">{{ shortfall(result.q50) }}</div>
            </div>
            <div class="border border-gray-200 rounded-lg p-3 text-center">
              <div class="text-gray-500 text-sm">要有 90% 把握</div>
              <div class="text-2xl font-bold text-gray-800 tabular-nums">{{ result.q90 ?? '—' }} <span class="text-sm font-normal text-gray-400">抽</span></div>
              <div class="text-gray-400 text-xs">{{ shortfall(result.q90) }}</div>
            </div>
          </div>
          <p v-if="form.charCopies && form.coneCopies" class="text-gray-500 text-sm mb-2">
            只看角色：<b class="text-gray-700">{{ pct(result.charOnly) }}</b>
            <span class="mx-2 text-gray-300">|</span>
            只看光錐：<b class="text-gray-700">{{ pct(result.coneOnly) }}</b>
            <span class="text-gray-400">（各自用全部 {{ budget }} 抽計算）</span>
          </p>
          <div ref="chartEl" class="w-full h-64"></div>
          <p class="text-gray-400 text-xs mt-1">曲線 = 投入幾抽時達成目標的機率；虛線 = 你目前可抽的數量。</p>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { use, init } from 'echarts/core'
import { TooltipComponent, GridComponent, MarkLineComponent } from 'echarts/components'
import { LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { pullsForLimited, toCdf, quantile, poolState, MAX_PULLS } from '../planner'

use([TooltipComponent, GridComponent, MarkLineComponent, LineChart, CanvasRenderer])

const props = defineProps({
  detail: Map
})

const JADE_PER_PULL = 160
const STORAGE_KEY = 'pullPlanner'

const charOptions = [
  { value: 0, label: '不抽' },
  ...Array.from({ length: 7 }, (_, i) => ({ value: i + 1, label: `E${i}` }))
]
const coneOptions = [
  { value: 0, label: '不抽' },
  ...Array.from({ length: 5 }, (_, i) => ({ value: i + 1, label: `S${i + 1}` }))
]

// 資源與目標記在本機，下次打開沿用
const saved = (() => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch (e) { return {} }
})()

const form = reactive({
  jade: saved.jade ?? 0,
  passes: saved.passes ?? 0,
  charCopies: saved.charCopies ?? 1,
  coneCopies: saved.coneCopies ?? 0,
  banner: saved.banner ?? 'event',
  charPity: 0,
  charGuaranteed: false,
  conePity: 0,
  coneGuaranteed: false
})

watch(() => [form.jade, form.passes, form.charCopies, form.coneCopies, form.banner], () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      jade: form.jade, passes: form.passes, charCopies: form.charCopies, coneCopies: form.coneCopies, banner: form.banner
    }))
  } catch (e) {}
})

const loadState = () => {
  const [charKey, coneKey] = form.banner === 'collab' ? ['21', '22'] : ['11', '12']
  const c = poolState(props.detail, charKey)
  const w = poolState(props.detail, coneKey)
  form.charPity = c.pity
  form.charGuaranteed = c.guaranteed
  form.conePity = w.pity
  form.coneGuaranteed = w.guaranteed
}
loadState()

const budget = computed(() => Math.floor((form.jade || 0) / JADE_PER_PULL) + (form.passes || 0))
const hasTarget = computed(() => form.charCopies > 0 || form.coneCopies > 0)

const targetLabel = computed(() => {
  const parts = []
  if (form.charCopies) parts.push(`角色 E${form.charCopies - 1}`)
  if (form.coneCopies) parts.push(`光錐 S${form.coneCopies}`)
  return parts.join(' + ')
})

const result = computed(() => {
  const charPmf = pullsForLimited('11', form.charCopies, form.charPity || 0, form.charGuaranteed, 0.5)
  const conePmf = pullsForLimited('12', form.coneCopies, form.conePity || 0, form.coneGuaranteed, 0.75)
  const charCdf = toCdf(charPmf)
  const coneCdf = toCdf(conePmf)
  // 合併：角色用掉 k 抽，光錐要在剩下的抽數內完成 => 兩個分佈卷積
  const bothPmf = new Array(MAX_PULLS + 1).fill(0)
  for (let i = 0; i < charPmf.length; i++) {
    if (!charPmf[i]) continue
    for (let j = 0; j < conePmf.length && i + j <= MAX_PULLS; j++) bothPmf[i + j] += charPmf[i] * conePmf[j]
  }
  const bothCdf = toCdf(bothPmf)
  const b = Math.min(budget.value, MAX_PULLS)
  return {
    both: bothCdf[b],
    charOnly: charCdf[b],
    coneOnly: coneCdf[b],
    q50: quantile(bothCdf, 0.5),
    q90: quantile(bothCdf, 0.9),
    q99: quantile(bothCdf, 0.99) ?? MAX_PULLS,
    cdf: bothCdf
  }
})

const pct = (v) => {
  if (v >= 0.9995) return '100%'
  if (v > 0 && v < 0.001) return '<0.1%'
  return `${(v * 100).toFixed(1)}%`
}

const probTone = (v) => {
  if (v >= 0.9) return { box: 'border-emerald-300 bg-emerald-50', text: 'text-emerald-600' }
  if (v >= 0.5) return { box: 'border-yellow-300 bg-yellow-50', text: 'text-yellow-600' }
  return { box: 'border-red-300 bg-red-50', text: 'text-red-600' }
}

const shortfall = (need) => {
  if (need == null) return ''
  const diff = need - budget.value
  if (diff <= 0) return '你目前的抽數已足夠'
  return `還差 ${diff} 抽（${(diff * JADE_PER_PULL).toLocaleString('zh-TW')} 星瓊）`
}

// 累積機率曲線
const chartEl = ref(null)
let chart = null
let observer = null

const buildOption = () => {
  const r = result.value
  const maxX = Math.max(r.q99, budget.value) + 10
  const points = r.cdf.slice(0, maxX + 1).map((v, i) => [i, Math.round(v * 1000) / 10])
  return {
    grid: { left: 44, right: 16, top: 30, bottom: 32 },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => `${params[0].value[0]} 抽：<b>${params[0].value[1]}%</b>`,
      padding: 6,
      textStyle: { fontSize: 14 }
    },
    xAxis: {
      type: 'value',
      max: maxX,
      name: '抽',
      nameTextStyle: { fontSize: 12, color: '#9ca3af' },
      axisLabel: { fontSize: 12, color: '#9ca3af' },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { fontSize: 12, color: '#9ca3af', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#f3f4f6' } }
    },
    series: [{
      type: 'line',
      data: points,
      showSymbol: false,
      lineStyle: { color: '#7c3aed', width: 2 },
      areaStyle: { color: 'rgba(124, 58, 237, 0.08)' },
      markLine: {
        symbol: 'none',
        silent: true,
        lineStyle: { color: '#6b7280', type: 'dashed', width: 1.5 },
        label: { formatter: `目前 ${budget.value} 抽`, color: '#4b5563', fontSize: 12 },
        data: [{ xAxis: budget.value }]
      }
    }]
  }
}

const render = () => {
  if (!chartEl.value) return
  if (!chart) {
    chart = init(chartEl.value)
    observer = new ResizeObserver(() => chart?.resize())
    observer.observe(chartEl.value)
  }
  chart.setOption(buildOption(), { notMerge: true })
}

const dispose = () => {
  observer?.disconnect()
  observer = null
  chart?.dispose()
  chart = null
}

onMounted(() => nextTick(render))
onUnmounted(dispose)

watch([result, budget, hasTarget], () => {
  // 目標清空時圖表 DOM 會被移除，重建一次
  if (!hasTarget.value) return dispose()
  nextTick(() => {
    if (chart && chart.getDom() !== chartEl.value) dispose()
    render()
  })
})
</script>
