<template>
  <div v-if="hasData" class="mt-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm border-t-4 border-t-violet-400">
    <div class="flex items-baseline justify-between mb-3 pb-3 border-b border-gray-100">
      <h3 class="text-base font-semibold text-violet-700 flex items-center gap-1.5">
        <span>⭐</span>5★ 收藏
      </h3>
      <span class="text-gray-400 text-xs">
        角色 {{ filteredCharacters.length }}/{{ characters.length }} · 光錐 {{ filteredCones.length }}/{{ cones.length }} · 限定池實際花費 {{ totalActualCost }} 抽
      </span>
    </div>

    <!-- Filter toolbar -->
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <el-input v-model="filters.search" placeholder="搜尋名稱..." size="small" clearable class="!w-44" prefix-icon="search"></el-input>
      <el-select v-model="filters.sort" size="small" class="!w-32">
        <el-option label="花費 ↓" value="cost"></el-option>
        <el-option label="抽數 ↓" value="count"></el-option>
        <el-option label="命座 ↓" value="rank"></el-option>
        <el-option label="最近 ↓" value="recent"></el-option>
        <el-option label="首次 ↑" value="first"></el-option>
      </el-select>
      <el-checkbox v-model="filters.onlyLimited" size="small">只看限定</el-checkbox>
      <el-checkbox v-model="filters.onlyOff" size="small">只看歪過</el-checkbox>
      <el-checkbox v-model="filters.onlyMax" size="small">只看 E6/S5</el-checkbox>
      <el-button v-if="hasActiveFilter" size="small" text type="primary" @click="resetFilters">清除</el-button>
    </div>

    <!-- 角色 -->
    <div v-if="filteredCharacters.length" class="mb-4">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-sm font-medium text-gray-600">角色</span>
        <span class="text-gray-400 text-xs">({{ filteredCharacters.length }})</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        <div v-for="ch of filteredCharacters" :key="ch.name"
             :class="ch.isStandard ? 'bg-gray-50' : 'bg-white'"
             :title="cardTitle(ch)"
             class="border border-gray-200 rounded-lg p-2.5 cursor-help transition-shadow hover:shadow-md">
          <div class="flex items-center justify-between gap-1">
            <span class="font-semibold text-gray-800 text-sm truncate" :title="ch.name">{{ ch.name }}</span>
            <span :class="constellationClass(ch.constellation)" class="text-[11px] font-bold px-1.5 py-0.5 rounded leading-none flex-shrink-0">
              E{{ ch.constellation }}<span v-if="ch.overflow" class="opacity-70">+{{ ch.overflow }}</span>
            </span>
          </div>
          <div class="flex items-baseline gap-1 mt-1.5">
            <span :class="costColor(ch.avgActualCost)" class="text-base font-bold tabular-nums">{{ ch.totalActualCost }}</span>
            <span class="text-gray-400 text-[10px]">抽</span>
            <span v-if="ch.count > 1" class="text-gray-400 text-[10px] ml-1">(均 {{ ch.avgActualCost }})</span>
          </div>
          <div class="flex items-center justify-between mt-0.5">
            <div class="flex items-center gap-1.5">
              <span class="text-gray-500 text-[11px]">×{{ ch.count }}</span>
              <span v-if="ch.totalLostBefore > 0" class="bg-rose-100 text-rose-600 text-[10px] font-bold px-1 rounded leading-tight" :title="`為了拿他歪了 ${ch.totalLostBefore} 次`">歪 {{ ch.totalLostBefore }}</span>
              <span v-if="ch.isStandard" class="text-gray-400 text-[10px]">常駐</span>
            </div>
            <span class="text-gray-400 text-[10px] tabular-nums">{{ formatDate(ch.lastDate) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 光錐 -->
    <div v-if="filteredCones.length">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-sm font-medium text-gray-600">光錐</span>
        <span class="text-gray-400 text-xs">({{ filteredCones.length }})</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        <div v-for="co of filteredCones" :key="co.name"
             :class="co.isStandard ? 'bg-gray-50' : 'bg-white'"
             :title="cardTitle(co)"
             class="border border-gray-200 rounded-lg p-2.5 cursor-help transition-shadow hover:shadow-md">
          <div class="flex items-center justify-between gap-1">
            <span class="font-semibold text-gray-800 text-sm truncate" :title="co.name">{{ co.name }}</span>
            <span :class="superimpositionClass(co.superimposition)" class="text-[11px] font-bold px-1.5 py-0.5 rounded leading-none flex-shrink-0">
              S{{ co.superimposition }}<span v-if="co.overflow" class="opacity-70">+{{ co.overflow }}</span>
            </span>
          </div>
          <div class="flex items-baseline gap-1 mt-1.5">
            <span :class="costColor(co.avgActualCost)" class="text-base font-bold tabular-nums">{{ co.totalActualCost }}</span>
            <span class="text-gray-400 text-[10px]">抽</span>
            <span v-if="co.count > 1" class="text-gray-400 text-[10px] ml-1">(均 {{ co.avgActualCost }})</span>
          </div>
          <div class="flex items-center justify-between mt-0.5">
            <div class="flex items-center gap-1.5">
              <span class="text-gray-500 text-[11px]">×{{ co.count }}</span>
              <span v-if="co.totalLostBefore > 0" class="bg-rose-100 text-rose-600 text-[10px] font-bold px-1 rounded leading-tight" :title="`為了拿他歪了 ${co.totalLostBefore} 次`">歪 {{ co.totalLostBefore }}</span>
              <span v-if="co.isStandard" class="text-gray-400 text-[10px]">常駐</span>
            </div>
            <span class="text-gray-400 text-[10px] tabular-nums">{{ formatDate(co.lastDate) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { isWeapon } from '../utils'
import { STANDARD_5STAR, EVENT_BANNER_KEYS } from '../constants'

const filters = reactive({
  search: '',
  sort: 'cost',
  onlyLimited: false,
  onlyOff: false,
  onlyMax: false
})

const resetFilters = () => {
  filters.search = ''
  filters.sort = 'cost'
  filters.onlyLimited = false
  filters.onlyOff = false
  filters.onlyMax = false
}

const hasActiveFilter = computed(() =>
  filters.search || filters.sort !== 'cost' ||
  filters.onlyLimited || filters.onlyOff || filters.onlyMax
)

const applyFilters = (list, isWeaponList) => {
  const cap = isWeaponList ? 5 : 6
  let result = list
  const q = filters.search.trim().toLowerCase()
  if (q) result = result.filter(x => x.name.toLowerCase().includes(q))
  if (filters.onlyLimited) result = result.filter(x => !x.isStandard)
  if (filters.onlyOff) result = result.filter(x => x.totalLostBefore > 0)
  if (filters.onlyMax) result = result.filter(x => {
    const rank = isWeaponList ? x.superimposition : x.constellation
    return rank >= cap
  })
  const sortFns = {
    cost: (a, b) => b.totalActualCost - a.totalActualCost,
    count: (a, b) => b.count - a.count,
    rank: (a, b) => {
      const ra = isWeaponList ? a.superimposition : a.constellation
      const rb = isWeaponList ? b.superimposition : b.constellation
      return rb - ra || b.count - a.count
    },
    recent: (a, b) => new Date(b.lastDate) - new Date(a.lastDate),
    first: (a, b) => new Date(a.firstDate) - new Date(b.firstDate)
  }
  return [...result].sort(sortFns[filters.sort] || sortFns.cost)
}

const props = defineProps({
  detail: Map,
  typeMap: Map
})

const cleanName = (name) => (name || '').replace(/<[^>]+>/g, '')

// 對每筆 5★ 計算「實際花費」：在限定池歪了之後，把那些被浪費的 pity 算進下一隻限定的成本
const attributePulls = (detail) => {
  const attributions = [] // { name, itemId, itemType, time, bannerKey, pity, actualCost, lostBefore }
  if (!detail) return attributions
  for (const [poolKey, d] of detail) {
    if (!d?.ssrPos) continue
    const isEvent = EVENT_BANNER_KEYS.has(poolKey)
    const sorted = [...d.ssrPos].sort((a, b) => new Date(a[2]) - new Date(b[2]))
    let wastedPulls = 0  // 累計被歪掉的 pity
    let lostStreak = 0   // 累計歪次數
    for (const item of sorted) {
      const [rawName, pity, time, , itemId, itemType] = item
      const isStd = STANDARD_5STAR.has(itemId)
      if (isEvent && isStd) {
        // 歪了：這筆是常駐角色/光錐，pity 累積到下一筆
        attributions.push({
          name: cleanName(rawName), itemId, itemType, time,
          bannerKey: poolKey, pity, actualCost: pity, lostBefore: 0
        })
        wastedPulls += pity
        lostStreak++
      } else {
        // 限定（or 常駐池任何 5★）：實際成本 = 自己的 pity + 之前被歪掉的累計
        attributions.push({
          name: cleanName(rawName), itemId, itemType, time,
          bannerKey: poolKey, pity,
          actualCost: pity + (isEvent ? wastedPulls : 0),
          lostBefore: isEvent ? lostStreak : 0
        })
        wastedPulls = 0
        lostStreak = 0
      }
    }
  }
  return attributions
}

const aggregated = computed(() => {
  if (!props.detail) return { characters: [], cones: [] }
  const attributions = attributePulls(props.detail)
  const map = new Map()
  for (const a of attributions) {
    if (!map.has(a.name)) {
      map.set(a.name, {
        name: a.name,
        itemType: a.itemType,
        itemId: a.itemId,
        count: 0,
        totalActualCost: 0,
        totalLostBefore: 0,
        pulls: []
      })
    }
    const entry = map.get(a.name)
    entry.count++
    entry.totalActualCost += a.actualCost
    entry.totalLostBefore += a.lostBefore
    entry.pulls.push({
      time: a.time,
      bannerKey: a.bannerKey,
      pity: a.pity,
      actualCost: a.actualCost,
      lostBefore: a.lostBefore
    })
  }

  const characters = []
  const cones = []
  for (const entry of map.values()) {
    entry.pulls.sort((a, b) => new Date(a.time) - new Date(b.time))
    entry.firstDate = entry.pulls[0].time
    entry.lastDate = entry.pulls[entry.pulls.length - 1].time
    entry.banners = [...new Set(entry.pulls.map(p => p.bannerKey))]
    entry.isStandard = STANDARD_5STAR.has(entry.itemId)
    entry.avgActualCost = Math.round(entry.totalActualCost / entry.count)

    if (isWeapon(entry.itemType)) {
      const cap = 5
      entry.superimposition = Math.min(entry.count, cap)
      entry.overflow = Math.max(entry.count - cap, 0)
      cones.push(entry)
    } else {
      const cap = 6
      entry.constellation = Math.min(entry.count - 1, cap)
      entry.overflow = Math.max(entry.count - (cap + 1), 0)
      characters.push(entry)
    }
  }

  // 排序：按累計實際花費降序（最讓你心痛的排最前），再按 count
  const sortFn = (a, b) => b.totalActualCost - a.totalActualCost || b.count - a.count
  characters.sort(sortFn)
  cones.sort(sortFn)
  return { characters, cones }
})

const characters = computed(() => aggregated.value.characters)
const cones = computed(() => aggregated.value.cones)
const filteredCharacters = computed(() => applyFilters(characters.value, false))
const filteredCones = computed(() => applyFilters(cones.value, true))
const hasData = computed(() => characters.value.length > 0 || cones.value.length > 0)
const totalActualCost = computed(() =>
  characters.value.reduce((a, x) => a + x.totalActualCost, 0) +
  cones.value.reduce((a, x) => a + x.totalActualCost, 0)
)

const constellationClass = (e) => {
  if (e >= 6) return 'bg-amber-100 text-amber-700 border border-amber-300'
  if (e >= 4) return 'bg-purple-100 text-purple-700 border border-purple-300'
  if (e >= 2) return 'bg-blue-100 text-blue-700 border border-blue-300'
  if (e >= 1) return 'bg-emerald-100 text-emerald-700 border border-emerald-300'
  return 'bg-gray-100 text-gray-600 border border-gray-300'
}

const superimpositionClass = (s) => {
  if (s >= 5) return 'bg-amber-100 text-amber-700 border border-amber-300'
  if (s >= 3) return 'bg-purple-100 text-purple-700 border border-purple-300'
  if (s >= 2) return 'bg-blue-100 text-blue-700 border border-blue-300'
  return 'bg-gray-100 text-gray-600 border border-gray-300'
}

const formatDate = (t) => {
  const d = new Date(t)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

// 實際花費的顏色：< 80 綠（賺）、80-100 灰（平均）、100-130 橘（小貴）、> 130 紅（心痛）
const costColor = (avg) => {
  if (avg < 80) return 'text-emerald-600'
  if (avg < 100) return 'text-gray-700'
  if (avg < 130) return 'text-orange-500'
  return 'text-rose-600'
}

const cardTitle = (entry) => {
  const banners = entry.banners.map(k => props.typeMap?.get(k) || k).join('、')
  const first = new Date(entry.firstDate).toLocaleDateString()
  const last = new Date(entry.lastDate).toLocaleDateString()
  const breakdown = entry.pulls.map((p, i) => {
    const tag = p.lostBefore > 0 ? `（含歪 ${p.lostBefore} 次）` : ''
    return `第 ${i + 1} 次：${p.actualCost} 抽${tag}`
  }).join('\n')
  return `${entry.name}\n累計：${entry.totalActualCost} 抽（平均 ${entry.avgActualCost} 抽/隻）\n${breakdown}\n首次：${first}\n最近：${last}\n來源：${banners}`
}
</script>
