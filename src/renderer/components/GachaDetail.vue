<template>
  <p class="text-gray-500 text-base mb-2 text-center whitespace-nowrap">
    <span class="mx-2" :title="new Date(detail.date[0]).toLocaleString()">{{new Date(detail.date[0]).toLocaleDateString()}}</span>
    <span class="text-gray-300">—</span>
    <span class="mx-2" :title="new Date(detail.date[1]).toLocaleString()">{{new Date(detail.date[1]).toLocaleDateString()}}</span>
  </p>

  <div class="flex items-baseline justify-between mb-2 px-1">
    <span class="text-gray-600 text-base">
      {{text.total}} <span class="text-violet-600 font-bold text-lg tabular-nums">{{detail.total}}</span> {{text.times}}
    </span>
    <span v-if="type !== '100'" class="text-gray-500 text-sm">
      {{text.sum}}<span class="mx-1 text-emerald-600 font-bold tabular-nums">{{detail.countMio}}</span>{{text.no5star}}
    </span>
  </div>

  <div class="mb-3">
    <div class="flex h-5 rounded-md overflow-hidden border border-gray-200 shadow-sm">
      <div v-if="detail.count5"
           class="bg-yellow-400 flex items-center justify-center text-xs font-bold text-white transition-all hover:brightness-110 cursor-help"
           :style="`width:${barPct(detail.count5, detail.total)}%`"
           :title="`${text.star5}${colon}${detail.count5}（${text.character}${colon}${detail.count5c}、${text.weapon}${colon}${detail.count5w}）`">
        <span v-if="barPct(detail.count5, detail.total) >= 4">{{ detail.count5 }}</span>
      </div>
      <div v-if="detail.count4"
           class="bg-purple-500 flex items-center justify-center text-xs font-bold text-white transition-all hover:brightness-110 cursor-help"
           :style="`width:${barPct(detail.count4, detail.total)}%`"
           :title="`${text.star4}${colon}${detail.count4}（${text.character}${colon}${detail.count4c}、${text.weapon}${colon}${detail.count4w}）`">
        {{ detail.count4 }}
      </div>
      <div v-if="detail.count3"
           class="bg-blue-400 flex items-center justify-center text-xs font-bold text-white transition-all hover:brightness-110 cursor-help"
           :style="`width:${barPct(detail.count3, detail.total)}%`"
           :title="`${text.star3}${colon}${detail.count3}`">
        {{ detail.count3 }}
      </div>
    </div>
    <div class="flex justify-between text-[13px] text-gray-500 mt-1 px-0.5">
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-yellow-400"></span>{{text.star5}} {{percent(detail.count5, detail.total)}}</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-purple-500"></span>{{text.star4}} {{percent(detail.count4, detail.total)}}</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-blue-400"></span>{{text.star3}} {{percent(detail.count3, detail.total)}}</span>
    </div>
  </div>

  <div v-if="detail.ssrPos.length" class="mt-2">
    <div class="flex items-center justify-between mb-2">
      <span class="text-gray-500 text-base">
        {{text.history}}
        <span class="text-gray-400 text-xs ml-1">最新 → 最早</span>
      </span>
      <span class="text-base flex items-center gap-1">
        <span class="text-gray-400">{{text.average}}{{colon}}</span>
        <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold leading-none">
          {{avg5(detail.ssrPos)}}
        </span>
      </span>
    </div>
    <div class="grid grid-cols-1 gap-1 max-h-[340px] overflow-y-auto pr-1">
      <div v-for="{ item, no } of ssrList"
        :key="no"
        :title="ssrTitle(item)"
        class="relative overflow-hidden rounded border border-gray-200 bg-white cursor-help hover:border-gray-300">
        <!-- 保底進度：整行淺色填滿，長度 = 抽數 / 硬保底 -->
        <div :class="tierBar[rowTier(item)]" class="absolute inset-y-0 left-0"
             :style="`width:${Math.min(item[1] / pityLimits(item[3]).hard * 100, 100)}%`"></div>
        <div class="relative flex items-center gap-2 px-2 py-1 text-[15px] leading-tight">
          <span class="w-7 flex-shrink-0 text-xs text-gray-400 tabular-nums">#{{no}}</span>
          <!-- 只有常駐池會同時出角色和光錐：角色 = 人形、光錐 = 漏斗 -->
          <el-icon v-if="type === '1'" class="flex-shrink-0 text-gray-400" :title="isWeaponItem(item) ? text.weapon : text.character">
            <Filter v-if="isWeaponItem(item)" />
            <User v-else />
          </el-icon>
          <span class="min-w-0 truncate text-gray-700">{{displayName(item)}}</span>
          <span v-if="isOff(item)" class="flex-shrink-0 text-xs font-bold text-white bg-red-500 px-1.5 py-px rounded leading-tight shadow-sm">歪</span>
          <span :class="tierText[rowTier(item)]" class="ml-auto w-8 flex-shrink-0 text-right font-bold tabular-nums">{{item[1]}}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { isWeapon } from '../utils'
import { isOffBanner } from '../constants'

const props = defineProps({
  data: Object,
  typeMap: Map,
  i18n: Object,
  coneOwners: Map
})

const type = computed(() => props.data[0])
const detail = computed(() => props.data[1])
const text = computed(() => props.i18n.ui.data)
const colon = computed(() => props.i18n.symbol.colon)

// 最新的排最前面；no 為時間順序編號（#1 = 此池第一個 5★）
const ssrList = computed(() => {
  const list = detail.value.ssrPos
  return list.map((item, i) => ({ item, no: i + 1 })).reverse()
})

const avg5 = (list) => {
  let n = 0
  list.forEach(item => {
    n += item[1]
  })
  return parseInt((n / list.length) * 100) / 100
}

const percent = (num, total) => {
  if (!total) return '0%'
  return `${Math.round(num / total * 10000) / 100}%`
}

const barPct = (num, total) => {
  if (!total) return 0
  return (num / total) * 100
}

const pityLimits = (bannerKey) => {
  if (bannerKey === '12' || bannerKey === '22') return { hard: 80, soft: 65 }
  if (bannerKey === '2') return { hard: 50, soft: 40 }
  return { hard: 90, soft: 74 }
}

const pityTier = (pity, bannerKey) => {
  const { hard, soft } = pityLimits(bannerKey)
  if (pity >= hard) return 'hard'
  if (pity >= soft) return 'soft'
  if (pity >= hard * 0.5) return 'mid'
  return 'lucky'
}

// 只有抽數與進度條帶顏色：綠 = 早出、灰 = 一般、橘 = 軟保底、紅 = 硬保底
const tierText = {
  lucky: 'text-emerald-600',
  mid:   'text-gray-700',
  soft:  'text-orange-500',
  hard:  'text-red-600'
}

const tierBar = {
  lucky: 'bg-emerald-100',
  mid:   'bg-gray-200',
  soft:  'bg-orange-100',
  hard:  'bg-red-100'
}

const isWeaponItem = (item) => isWeapon(item[5])

const isOff = (item) => isOffBanner(item[3], item[4])

// 歪了一律用硬保底的顏色
const rowTier = (item) => isOff(item) ? 'hard' : pityTier(item[1], item[3])

const cleanName = (name) => (name || '').replace(/<[^>]+>/g, '')

// 光錐名稱前加上對應角色，例如【緋英】邂逅於下一個花季
const displayName = (item) => {
  const owner = isWeaponItem(item) ? props.coneOwners?.get(item[4]) : null
  return owner ? `【${owner}】${cleanName(item[0])}` : cleanName(item[0])
}

const ssrTitle = (item) => {
  const date = new Date(item[2]).toLocaleString()
  const tier = pityTier(item[1], item[3])
  const tierLabel = text.value.pity?.[tier] || ''
  const offLabel = isOff(item) ? `\n${text.value.offBanner || '歪'}` : ''
  const typeLabel = isWeaponItem(item) ? text.value.weapon : text.value.character
  const head = `${displayName(item)}（${typeLabel}）\n${date}`
  return (tierLabel ? `${head}\n${tierLabel}` : head) + offLabel
}
</script>