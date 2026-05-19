<template>
  <p class="text-gray-500 text-sm mb-2 text-center whitespace-nowrap">
    <span class="mx-2" :title="new Date(detail.date[0]).toLocaleString()">{{new Date(detail.date[0]).toLocaleDateString()}}</span>
    <span class="text-gray-300">—</span>
    <span class="mx-2" :title="new Date(detail.date[1]).toLocaleString()">{{new Date(detail.date[1]).toLocaleDateString()}}</span>
  </p>

  <div class="flex items-baseline justify-between mb-2 px-1">
    <span class="text-gray-600 text-sm">
      {{text.total}} <span class="text-violet-600 font-bold text-base tabular-nums">{{detail.total}}</span> {{text.times}}
    </span>
    <span v-if="type !== '100'" class="text-gray-500 text-xs">
      {{text.sum}}<span class="mx-1 text-emerald-600 font-bold tabular-nums">{{detail.countMio}}</span>{{text.no5star}}
    </span>
  </div>

  <div class="mb-3">
    <div class="flex h-5 rounded-md overflow-hidden border border-gray-200 shadow-sm">
      <div v-if="detail.count5"
           class="bg-yellow-400 flex items-center justify-center text-[10px] font-bold text-white transition-all hover:brightness-110 cursor-help"
           :style="`width:${barPct(detail.count5, detail.total)}%`"
           :title="`${text.star5}${colon}${detail.count5}（${text.character}${colon}${detail.count5c}、${text.weapon}${colon}${detail.count5w}）`">
        <span v-if="barPct(detail.count5, detail.total) >= 4">{{ detail.count5 }}</span>
      </div>
      <div v-if="detail.count4"
           class="bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white transition-all hover:brightness-110 cursor-help"
           :style="`width:${barPct(detail.count4, detail.total)}%`"
           :title="`${text.star4}${colon}${detail.count4}（${text.character}${colon}${detail.count4c}、${text.weapon}${colon}${detail.count4w}）`">
        {{ detail.count4 }}
      </div>
      <div v-if="detail.count3"
           class="bg-blue-400 flex items-center justify-center text-[10px] font-bold text-white transition-all hover:brightness-110 cursor-help"
           :style="`width:${barPct(detail.count3, detail.total)}%`"
           :title="`${text.star3}${colon}${detail.count3}`">
        {{ detail.count3 }}
      </div>
    </div>
    <div class="flex justify-between text-[11px] text-gray-500 mt-1 px-0.5">
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-yellow-400"></span>{{text.star5}} {{percent(detail.count5, detail.total)}}</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-purple-500"></span>{{text.star4}} {{percent(detail.count4, detail.total)}}</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-blue-400"></span>{{text.star3}} {{percent(detail.count3, detail.total)}}</span>
    </div>
  </div>

  <div v-if="detail.ssrPos.length" class="mt-2">
    <div class="flex items-center justify-between mb-2">
      <span class="text-gray-500 text-sm">{{text.history}}</span>
      <span class="text-sm flex items-center gap-1">
        <span class="text-gray-400">{{text.average}}{{colon}}</span>
        <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold leading-none">
          {{avg5(detail.ssrPos)}}
        </span>
      </span>
    </div>
    <div class="flex flex-wrap gap-1.5">
      <span v-for="(item, index) of detail.ssrPos"
        :key="index"
        :title="ssrTitle(item)"
        :class="pityTierClass(item[1], item[3])"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[13px] cursor-help leading-tight transition-transform hover:scale-105 hover:shadow-sm">
        <span v-if="isOff(item)" class="bg-rose-500 text-white text-[10px] font-bold px-1 rounded leading-tight">歪</span>
        <span v-else class="text-xs opacity-70">{{isWeaponItem(item) ? '◆' : '●'}}</span>
        <span>{{cleanName(item[0])}}</span>
        <span class="font-bold ml-0.5 tabular-nums">{{item[1]}}</span>
      </span>
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
  i18n: Object
})

const type = computed(() => props.data[0])
const detail = computed(() => props.data[1])
const text = computed(() => props.i18n.ui.data)
const colon = computed(() => props.i18n.symbol.colon)

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

const tierClasses = {
  lucky: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  mid:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  soft:  'bg-orange-50 text-orange-700 border-orange-200',
  hard:  'bg-red-50 text-red-700 border-red-300'
}

const pityTierClass = (pity, bannerKey) => tierClasses[pityTier(pity, bannerKey)]

const isWeaponItem = (item) => isWeapon(item[5])

const isOff = (item) => isOffBanner(item[3], item[4])

const cleanName = (name) => (name || '').replace(/<[^>]+>/g, '')

const ssrTitle = (item) => {
  const date = new Date(item[2]).toLocaleString()
  const tier = pityTier(item[1], item[3])
  const tierLabel = text.value.pity?.[tier] || ''
  const offLabel = isOff(item) ? `\n${text.value.offBanner || '歪'}` : ''
  return (tierLabel ? `${date}\n${tierLabel}` : date) + offLabel
}
</script>