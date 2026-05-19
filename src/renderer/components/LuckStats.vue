<template>
  <div v-if="hasData" class="mt-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm border-t-4 border-t-violet-400">
    <div class="flex items-baseline justify-between mb-4 pb-3 border-b border-gray-100">
      <h3 class="text-base font-semibold text-violet-700 flex items-center gap-1.5">
        <span>🎲</span>幸運度分析
      </h3>
      <span class="text-gray-400 text-xs">基於 5★ pity 與 50/50 紀錄</span>
    </div>

    <!-- Header: tier badge + summary -->
    <div class="flex items-center gap-4 mb-4">
      <div :class="tierBadgeBg" class="border-2 rounded-lg px-4 py-2 text-center min-w-[110px]">
        <div :class="tierColor" class="text-xl font-bold leading-tight">{{ tierLabel }}</div>
        <div class="text-gray-400 text-[10px] mt-0.5">{{ currentTier?.range || '—' }}</div>
      </div>
      <div class="flex-1">
        <div class="text-gray-700 text-sm">
          <template v-if="totalSSR >= 3">
            均限定 <span class="font-bold text-gray-900 text-base">{{ overallEffective }}</span> 抽
            <span class="text-gray-400 text-xs ml-2">（理論期望 ~{{ theoreticalExpected }} 抽）</span>
            <span v-if="totalSSR < 10" class="text-amber-600 text-xs ml-2">⚠ 樣本少（N={{ totalSSR }}），僅供參考</span>
          </template>
          <template v-else>
            樣本不足（需至少 3 個五星）
          </template>
        </div>
        <div class="text-gray-400 text-xs mt-1">
          <template v-if="totalSSR >= 3">
            角色 + 光錐共 {{ totalSSR }} 個五星 · 中限定 {{ totalWon }} / {{ totalFifty }} · 均 5★ pity {{ avgPity }} 抽
          </template>
        </div>
      </div>
    </div>

    <!-- Tier ladder -->
    <div class="flex gap-1 mb-5 text-xs">
      <div v-for="t of tiers" :key="t.label"
           :class="t.active ? t.boxBg : 'bg-gray-50 border-gray-200 opacity-60 border'"
           class="flex-1 text-center py-1.5 px-1 rounded-md transition-all">
        <div :class="t.active ? `${t.textColor} font-bold` : 'text-gray-400'">{{ t.label }}</div>
        <div class="text-gray-400 text-[10px] mt-0.5">{{ t.range }}</div>
      </div>
    </div>

    <!-- 50/50 stats: 卡片排列 -->
    <div v-if="fiftyStats.length" class="grid grid-cols-2 gap-3 mb-5">
      <div v-for="s of fiftyStats" :key="s.key" class="bg-white border border-gray-200 rounded-lg p-3">
        <div class="flex items-baseline justify-between mb-2">
          <span class="text-gray-500 text-xs">{{ s.name }}</span>
          <span :class="winRateColor(s.winRate, s.expected)" class="text-xl font-bold">
            {{ (s.winRate * 100).toFixed(1) }}%
            <span class="text-xs font-normal">{{ rateArrow(s.winRate, s.expected) }}</span>
          </span>
        </div>
        <div class="grid grid-cols-3 text-[11px] gap-1">
          <div class="text-center">
            <div class="text-gray-400">中限定</div>
            <div class="font-bold text-gray-700">{{ s.won }} / {{ s.fifty }}</div>
          </div>
          <div class="text-center border-x border-gray-100">
            <div class="text-gray-400">期望</div>
            <div class="font-bold text-gray-500">{{ (s.expected * 100).toFixed(0) }}%</div>
          </div>
          <div class="text-center">
            <div class="text-gray-400">均限定</div>
            <div class="font-bold text-gray-700">{{ s.effectiveAvg }} 抽</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pool pity bars -->
    <div class="mb-5">
      <div class="flex items-baseline justify-between mb-2">
        <p class="text-gray-500 text-xs">當前保底進度</p>
        <p class="text-gray-400 text-[10px]">預期值基於軟保底機率推估</p>
      </div>
      <div class="space-y-2">
        <div v-for="pool of poolList" :key="pool.key" class="flex items-center gap-3 text-xs">
          <span class="text-gray-600 w-24 text-right flex-shrink-0 truncate">{{ pool.name }}</span>
          <div class="flex-1 bg-gray-100 rounded-full h-3 relative overflow-hidden">
            <div
              :class="barColor(pool.pity, pool.hardPity)"
              class="h-3 rounded-full transition-all"
              :style="`width: ${Math.min(pool.pity / pool.hardPity * 100, 100)}%`"
            ></div>
          </div>
          <span :class="pityTextColor(pool.pity, pool.hardPity)" class="w-14 text-right flex-shrink-0 tabular-nums">
            {{ pool.pity }} / {{ pool.hardPity }}
          </span>
          <span class="w-24 text-right flex-shrink-0 text-gray-500 tabular-nums" :title="`離硬保底 ${pool.hardPity - pool.pity} 抽`">
            <span class="text-gray-400">預期</span>
            <span :class="pool.inSoftPity ? 'text-orange-500 font-bold' : 'text-gray-700 font-medium'">~{{ pool.expectedNext }}</span> 抽
          </span>
        </div>
      </div>
    </div>

    <!-- 近況 vs 歷史：收斂趨勢 -->
    <div v-if="trendData" class="border-t border-gray-200 pt-4 mb-5">
      <div class="flex items-baseline justify-between mb-2">
        <p class="text-gray-500 text-xs">近況 vs 歷史</p>
        <p class="text-gray-400 text-[10px]">理論期望 ~93 抽 / 限定（虛線）</p>
      </div>

      <div class="grid grid-cols-3 gap-2 mb-3">
        <div class="bg-white border border-gray-200 rounded-lg p-2.5 text-center">
          <div class="text-gray-400 text-[11px]">最近 {{ trendData.recent.n }} 個 5★</div>
          <div class="text-xl font-bold tabular-nums" :class="effColor(trendData.recent.eff)">
            {{ trendData.recent.eff }}
          </div>
          <div class="text-gray-400 text-[10px]">抽 / 限定</div>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg p-2.5 text-center">
          <div class="text-gray-400 text-[11px]">整體 {{ trendData.overall.n }} 個 5★</div>
          <div class="text-xl font-bold tabular-nums" :class="effColor(trendData.overall.eff)">
            {{ trendData.overall.eff }}
          </div>
          <div class="text-gray-400 text-[10px]">抽 / 限定</div>
        </div>
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-center">
          <div class="text-gray-400 text-[11px]">理論期望</div>
          <div class="text-xl font-bold tabular-nums text-gray-500">~93</div>
          <div class="text-gray-400 text-[10px]">抽 / 限定</div>
        </div>
      </div>

      <!-- Sparkline -->
      <div class="bg-white border border-gray-200 rounded-lg p-3">
        <svg :viewBox="`0 0 ${trendData.viewW} ${trendData.viewH}`" class="w-full h-28" preserveAspectRatio="none">
          <!-- 理論期望線 -->
          <line :x1="0" :y1="trendData.expY" :x2="trendData.viewW" :y2="trendData.expY"
                stroke="#94a3b8" stroke-dasharray="4 4" stroke-width="1" />
          <text :x="trendData.viewW - 4" :y="trendData.expY - 4" text-anchor="end"
                fill="#94a3b8" font-size="9">期望 93</text>

          <!-- 累計均限定折線 -->
          <polyline :points="trendData.points" fill="none" stroke="#3b82f6" stroke-width="1.5" />

          <!-- 當前點 -->
          <circle :cx="trendData.lastX" :cy="trendData.lastY" r="3" fill="#3b82f6" />
        </svg>
        <div class="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>第 1 個 5★</span>
          <span>累計均限定隨樣本變化（你目前 {{ overallEffective }} 抽）</span>
          <span>第 {{ trendData.overall.n }} 個</span>
        </div>
      </div>

      <p class="text-gray-500 text-[11px] mt-2 leading-relaxed">
        <template v-if="trendData.direction === 'up'">
          目前 {{ overallEffective }} 抽優於期望，<span class="text-gray-700">未來抽卡時這條線會緩慢往 93 移動（變沒那麼歐）</span>——這不是「該倒楣了」，是樣本數變多後自然向期望收斂（regression to mean）。每一抽的機率本身沒變。
        </template>
        <template v-else-if="trendData.direction === 'down'">
          目前 {{ overallEffective }} 抽差於期望，<span class="text-gray-700">未來這條線會緩慢往 93 移動（變沒那麼非）</span>——同樣不代表「該歐了」，只是樣本變多會收斂。
        </template>
        <template v-else>
          你已經非常接近理論期望了。
        </template>
      </p>
    </div>

    <!-- 預期成本：卡片網格 -->
    <div v-if="costEstimate.length" class="border-t border-gray-200 pt-4">
      <div class="flex items-baseline justify-between mb-2">
        <p class="text-gray-500 text-xs">預期成本</p>
        <p class="text-gray-400 text-[10px]">基於均限定 {{ overallEffective }} 抽推估</p>
      </div>
      <div class="grid grid-cols-5 gap-2">
        <div v-for="row of costEstimate" :key="row.label"
             :class="row.highlight ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-200'"
             class="border rounded-lg p-2.5">
          <div class="flex items-baseline gap-1.5">
            <span class="text-base font-bold text-gray-800 tabular-nums">{{ row.label }}</span>
            <span class="text-gray-400 text-[10px]">{{ row.desc }}</span>
          </div>
          <div class="flex items-baseline gap-1 mt-1">
            <span class="text-lg font-bold text-gray-800 tabular-nums">{{ row.pulls }}</span>
            <span class="text-gray-400 text-[10px]">抽</span>
          </div>
          <div class="text-gray-400 text-[10px] tabular-nums">({{ row.low }}–{{ row.high }})</div>
          <div class="text-gray-400 text-[10px] tabular-nums">{{ formatNum(row.pulls * 160) }} 星瓊</div>
        </div>
      </div>
      <p class="text-gray-400 text-[10px] mt-3 leading-tight">
        * 點估計假設你維持目前的中獎率與均抽 pity；括號內為 ±15% 經驗區間，實際因隨機性可能更寬。
      </p>
    </div>

    <!-- 極值紀錄 -->
    <div v-if="extremes" class="border-t border-gray-200 pt-4 mt-4">
      <p class="text-gray-500 text-xs mb-2">極值紀錄</p>
      <div class="grid grid-cols-3 gap-2">
        <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
          <div class="text-emerald-600 text-[11px]">🎉 最歐 5★</div>
          <div class="flex items-baseline gap-1 mt-1">
            <span class="text-xl font-bold text-emerald-700 tabular-nums">{{ extremes.luckiest.pity }}</span>
            <span class="text-gray-400 text-[10px]">抽</span>
          </div>
          <div class="text-gray-500 text-[11px] truncate" :title="extremes.luckiest.name">{{ extremes.luckiest.name }}</div>
        </div>
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-2.5">
          <div class="text-rose-600 text-[11px]">😭 最慘 5★</div>
          <div class="flex items-baseline gap-1 mt-1">
            <span class="text-xl font-bold text-rose-700 tabular-nums">{{ extremes.worst.pity }}</span>
            <span class="text-gray-400 text-[10px]">抽</span>
          </div>
          <div class="text-gray-500 text-[11px] truncate" :title="extremes.worst.name">{{ extremes.worst.name }}</div>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          <div class="text-amber-600 text-[11px]">⏳ 當前最長未出 5★</div>
          <div class="flex items-baseline gap-1 mt-1">
            <span class="text-xl font-bold text-amber-700 tabular-nums">{{ extremes.currentStreak.pity }}</span>
            <span class="text-gray-400 text-[10px]">抽</span>
          </div>
          <div class="text-gray-500 text-[11px] truncate">{{ extremes.currentStreak.poolName }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { STANDARD_5STAR } from '../constants'

const props = defineProps({
  detail: Map,
  typeMap: Map
})

const hardPityMap = {
  '11': 90, '21': 90, '1': 90,
  '12': 80, '22': 80,
  '2': 50
}

const fiftyConfig = [
  { key: '11', expected: 0.5 },
  { key: '21', expected: 0.5 },
  { key: '12', expected: 0.75 },
  { key: '22', expected: 0.75 }
]

const hasData = computed(() => props.detail && props.detail.size > 0)

const allSSR = computed(() => {
  const result = []
  for (const key of ['11', '21', '12', '22']) {
    const d = props.detail?.get(key)
    if (d) result.push(...d.ssrPos)
  }
  return result
})

const totalSSR = computed(() => allSSR.value.length)

const avgPity = computed(() => {
  if (!allSSR.value.length) return null
  const sum = allSSR.value.reduce((acc, item) => acc + item[1], 0)
  return Math.round(sum / allSSR.value.length * 10) / 10
})

// 等級閾值依「均限定」抽數校準（理論期望 ~93 抽 / 限定）
const tierDefs = [
  { label: '超級歐洲人', range: '< 70',     max: 70,       textColor: 'text-yellow-500', badgeBg: 'bg-yellow-50 border-yellow-200', boxBg: 'bg-white border-yellow-300 ring-2 ring-yellow-100' },
  { label: '歐洲人',     range: '70 – 88',  max: 88,       textColor: 'text-green-500',  badgeBg: 'bg-green-50 border-green-200',   boxBg: 'bg-white border-green-300 ring-2 ring-green-100' },
  { label: '普通人',     range: '88 – 98',  max: 98,       textColor: 'text-gray-600',   badgeBg: 'bg-gray-50 border-gray-200',     boxBg: 'bg-white border-gray-300 ring-2 ring-gray-100' },
  { label: '非洲人',     range: '98 – 117', max: 117,      textColor: 'text-orange-500', badgeBg: 'bg-orange-50 border-orange-200', boxBg: 'bg-white border-orange-300 ring-2 ring-orange-100' },
  { label: '超級非洲人', range: '≥ 117',    max: Infinity, textColor: 'text-red-600',    badgeBg: 'bg-red-50 border-red-200',       boxBg: 'bg-white border-red-300 ring-2 ring-red-100' }
]

const currentTier = computed(() => {
  const eff = overallEffective.value
  if (typeof eff !== 'number' || totalSSR.value < 3) return null
  return tierDefs.find(t => eff < t.max)
})

const tierLabel = computed(() => currentTier.value?.label ?? '—')
const tierColor = computed(() => currentTier.value?.textColor ?? 'text-gray-400')
const tierBadgeBg = computed(() => currentTier.value?.badgeBg ?? 'bg-gray-50 border-gray-200')

const tiers = computed(() => tierDefs.map(t => ({
  ...t,
  active: currentTier.value === t
})))

const fiftyStats = computed(() => {
  if (!props.detail) return []
  const result = []
  for (const { key, expected } of fiftyConfig) {
    const d = props.detail.get(key)
    if (!d || !d.ssrPos.length) continue
    const list = [...d.ssrPos].sort((a, b) => new Date(a[2]).getTime() - new Date(b[2]).getTime())
    let guaranteed = false
    let won = 0, lost = 0, fifty = 0
    for (const item of list) {
      const itemId = item[4]
      if (guaranteed) { guaranteed = false; continue }
      fifty++
      if (STANDARD_5STAR.has(itemId)) { lost++; guaranteed = true }
      else won++
    }
    if (!fifty) continue
    const winRate = won / fifty
    const sumPity = list.reduce((acc, x) => acc + x[1], 0)
    const limitedTotal = list.length - lost
    const effectiveAvg = limitedTotal > 0 ? Math.round(sumPity / limitedTotal * 10) / 10 : null
    result.push({
      key,
      name: props.typeMap?.get(key) || key,
      won, lost, fifty, winRate, expected, effectiveAvg
    })
  }
  return result
})

const totalWon = computed(() => fiftyStats.value.reduce((a, s) => a + s.won, 0))
const totalFifty = computed(() => fiftyStats.value.reduce((a, s) => a + s.fifty, 0))

const charStats = computed(() => fiftyStats.value.find(s => s.key === '11' || s.key === '21'))
const coneStats = computed(() => fiftyStats.value.find(s => s.key === '12' || s.key === '22'))

const overallEffective = computed(() => {
  const list = fiftyStats.value
  if (!list.length) return '—'
  const sumPity = list.reduce((acc, s) => acc + s.effectiveAvg * (s.won + s.lost), 0)
  const sumLimited = list.reduce((acc, s) => acc + (s.won + s.lost), 0)
  if (!sumLimited) return '—'
  return Math.round(sumPity / sumLimited * 10) / 10
})

// 各池理論期望（抽 / 限定）：角色 ~93.75（50% × 62.5），光錐 ~86.7（75% × 65）
const POOL_THEORETICAL = { '11': 93.75, '21': 93.75, '12': 86.7, '22': 86.7 }

const theoreticalExpected = computed(() => {
  const list = fiftyStats.value
  if (!list.length) return 93
  const weighted = list.reduce((acc, s) => {
    const exp = POOL_THEORETICAL[s.key] ?? 93
    const n = s.won + s.lost
    return { sum: acc.sum + exp * n, n: acc.n + n }
  }, { sum: 0, n: 0 })
  if (!weighted.n) return 93
  return Math.round(weighted.sum / weighted.n)
})

// 命座+光錐 組合：X+Y = X 命角色 + Y 把光錐
const costPlans = [
  { label: '0+0', desc: '只抽角色',          char: 1, cone: 0 },
  { label: '0+1', desc: '角色 + 專武',       char: 1, cone: 1 },
  { label: '1+0', desc: '1 命角色',          char: 2, cone: 0 },
  { label: '1+1', desc: '1 命 + 專武',       char: 2, cone: 1, highlight: true },
  { label: '2+1', desc: '2 命 + 專武',       char: 3, cone: 1 }
]

const costEstimate = computed(() => {
  const c = charStats.value
  const w = coneStats.value
  if (!c) return []
  return costPlans
    .filter(p => p.cone === 0 || w)
    .map(p => {
      const point = Math.round(c.effectiveAvg * p.char + (w ? w.effectiveAvg * p.cone : 0))
      const low = Math.round(point * 0.85)
      const high = Math.round(point * 1.15)
      return {
        label: p.label,
        desc: p.desc,
        pulls: point,
        low, high,
        highlight: p.highlight
      }
    })
})

// 全部 5★（含常駐池）依時間排序，用來找極值
const allSSRForExtremes = computed(() => {
  if (!props.detail) return []
  const all = []
  for (const [poolKey, d] of props.detail) {
    if (!d?.ssrPos) continue
    for (const item of d.ssrPos) {
      all.push({
        name: (item[0] || '').replace(/<[^>]+>/g, ''),
        pity: item[1],
        time: item[2],
        poolKey
      })
    }
  }
  return all
})

const extremes = computed(() => {
  const list = allSSRForExtremes.value
  if (!list.length) return null

  let luckiest = list[0]
  let worst = list[0]
  for (const item of list) {
    if (item.pity < luckiest.pity) luckiest = item
    if (item.pity > worst.pity) worst = item
  }

  // 當前最長未出 5★ streak：所有池子裡 countMio 最大的
  let currentStreak = { pity: 0, poolName: '—' }
  if (props.detail) {
    for (const [key, d] of props.detail) {
      if (!d) continue
      const p = d.countMio ?? 0
      if (p > currentStreak.pity) {
        currentStreak = { pity: p, poolName: props.typeMap?.get(key) || key }
      }
    }
  }

  return { luckiest, worst, currentStreak }
})

const formatNum = (n) => n.toLocaleString('zh-TW')

// 收斂趨勢：把所有限定池的 5★ 依時間排序，計算累計均限定
const EXPECTED_EFF = 93

const trendData = computed(() => {
  if (!props.detail) return null
  const all = []
  for (const key of ['11', '21', '12', '22']) {
    const d = props.detail.get(key)
    if (d) all.push(...d.ssrPos)
  }
  if (all.length < 5) return null

  // 依時間排序
  const sorted = [...all].sort((a, b) => new Date(a[2]).getTime() - new Date(b[2]).getTime())

  // 逐個累計（依每個池子各自追蹤 guaranteed 狀態太複雜，這裡用近似：lost ≈ standard 5★ 數量）
  // 用全局 guaranteed 不精確（池子之間沒共享 guarantee），改成各池獨立追蹤
  const poolGuaranteed = new Map()
  const poolPity = new Map()
  const poolLost = new Map()

  let cumPity = 0, cumLost = 0
  const points = []
  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]
    const pity = item[1]
    const poolKey = item[3]
    const itemId = item[4]
    cumPity += pity
    const g = poolGuaranteed.get(poolKey) || false
    if (g) {
      poolGuaranteed.set(poolKey, false)
    } else {
      if (STANDARD_5STAR.has(itemId)) {
        cumLost++
        poolGuaranteed.set(poolKey, true)
      }
    }
    const limited = (i + 1) - cumLost
    const eff = limited > 0 ? cumPity / limited : null
    if (eff !== null) points.push({ n: i + 1, eff })
  }

  if (points.length < 3) return null

  const overallN = points.length
  const overallEff = Math.round(points[points.length - 1].eff * 10) / 10

  // 最近 N 個
  const recentN = Math.min(10, Math.floor(overallN / 2))
  const recentItems = sorted.slice(-recentN)
  let rPity = 0, rLost = 0
  const rPoolG = new Map()
  for (const it of recentItems) {
    const g = rPoolG.get(it[3]) || false
    rPity += it[1]
    if (g) { rPoolG.set(it[3], false); continue }
    if (STANDARD_5STAR.has(it[4])) { rLost++; rPoolG.set(it[3], true) }
  }
  const recentLimited = recentN - rLost
  const recentEff = recentLimited > 0 ? Math.round(rPity / recentLimited * 10) / 10 : null

  // Sparkline 計算
  const viewW = 300, viewH = 80
  const padTop = 8, padBot = 12
  const effs = points.map(p => p.eff)
  const minE = Math.min(EXPECTED_EFF, ...effs) - 5
  const maxE = Math.max(EXPECTED_EFF, ...effs) + 5
  const range = maxE - minE
  const yOf = (e) => padTop + (e - minE) / range * (viewH - padTop - padBot)
  const xOf = (n) => (n - 1) / (overallN - 1) * viewW
  const polyline = points.map(p => `${xOf(p.n).toFixed(1)},${yOf(p.eff).toFixed(1)}`).join(' ')
  const expY = yOf(EXPECTED_EFF)
  const last = points[points.length - 1]

  const direction = overallEff < EXPECTED_EFF - 2 ? 'up' : (overallEff > EXPECTED_EFF + 2 ? 'down' : 'flat')

  return {
    recent: { n: recentN, eff: recentEff },
    overall: { n: overallN, eff: overallEff },
    points: polyline,
    viewW, viewH, expY,
    lastX: xOf(last.n), lastY: yOf(last.eff),
    direction
  }
})

const effColor = (v) => {
  if (typeof v !== 'number') return 'text-gray-400'
  if (v < EXPECTED_EFF - 15) return 'text-green-500'
  if (v < EXPECTED_EFF - 5) return 'text-green-600'
  if (v < EXPECTED_EFF + 5) return 'text-gray-700'
  if (v < EXPECTED_EFF + 15) return 'text-orange-500'
  return 'text-red-600'
}

const winRateColor = (rate, expected) => {
  if (rate >= expected + 0.1) return 'text-green-500'
  if (rate >= expected) return 'text-green-600'
  if (rate >= expected - 0.1) return 'text-gray-600'
  if (rate >= expected - 0.2) return 'text-orange-500'
  return 'text-red-600'
}

const rateArrow = (rate, expected) => {
  if (rate >= expected + 0.05) return '↑'
  if (rate <= expected - 0.05) return '↓'
  return ''
}

// 軟保底機率模型：未進軟保底前 base rate；進軟保底後線性上升到硬保底時 100%
const pityModel = (key) => {
  if (key === '12' || key === '22') return { hard: 80, soft: 65, base: 0.008 }
  if (key === '2') return { hard: 50, soft: 40, base: 0.006 }
  return { hard: 90, soft: 74, base: 0.006 }
}

const probAt = (pullNum, key) => {
  const { hard, soft, base } = pityModel(key)
  if (pullNum >= hard) return 1
  if (pullNum < soft) return base
  return base + ((pullNum - soft) / (hard - soft)) * (1 - base)
}

// E[剩餘抽數] | 當前 pity = p
const expectedRemaining = (currentPity, key) => {
  const { hard } = pityModel(key)
  let survival = 1
  let expected = 0
  for (let k = 1; k <= hard - currentPity; k++) {
    const p = probAt(currentPity + k, key)
    expected += k * survival * p
    survival *= (1 - p)
  }
  return Math.max(1, Math.round(expected * 10) / 10)
}

const poolList = computed(() => {
  if (!props.detail) return []
  return ['11', '21', '12', '22', '1']
    .filter(key => props.detail.has(key))
    .map(key => {
      const model = pityModel(key)
      const pity = props.detail.get(key).countMio
      return {
        key,
        name: props.typeMap?.get(key) || key,
        pity,
        hardPity: model.hard,
        softPity: model.soft,
        inSoftPity: pity >= model.soft,
        expectedNext: expectedRemaining(pity, key)
      }
    })
})

const barColor = (pity, hardPity) => {
  const r = pity / hardPity
  if (r < 0.5) return 'bg-green-400'
  if (r < 0.75) return 'bg-yellow-400'
  if (r < 0.9) return 'bg-orange-400'
  return 'bg-red-500'
}

const pityTextColor = (pity, hardPity) => {
  const r = pity / hardPity
  if (r < 0.75) return 'text-gray-600'
  if (r < 0.9) return 'text-orange-500'
  return 'text-red-600 font-bold'
}
</script>
