<template>
  <p class="text-gray-500 text-sm mb-2 text-center whitespace-nowrap">
    <span class="mx-2" :title="new Date(detail.date[0]).toLocaleString()">{{new Date(detail.date[0]).toLocaleDateString()}}</span>
    -
    <span class="mx-2" :title="new Date(detail.date[1]).toLocaleString()">{{new Date(detail.date[1]).toLocaleDateString()}}</span>
  </p>
  <p class="text-gray-600 text-sm mb-1.5">
    <span class="mr-1">{{text.total}}
      <span class="text-blue-600 font-medium">{{detail.total}}</span> {{text.times}}
    </span>
    <span v-if="type !== '100'">{{text.sum}}<span class="mx-1 text-green-600 font-medium">{{detail.countMio}}</span>{{text.no5star}}</span>
  </p>
  <p class="text-gray-600 text-sm mb-1.5">
    <span :title="`${text.character}${colon}${detail.count5c}\n${text.weapon}${colon}${detail.count5w}`" class="mr-3 whitespace-pre cursor-help text-yellow-500">
      <span class="min-w-12 inline-block">{{text.star5}}{{colon}}{{detail.count5}}</span>
      [{{percent(detail.count5, detail.total)}}]
    </span>
    <br><span :title="`${text.character}${colon}${detail.count4c}\n${text.weapon}${colon}${detail.count4w}`" class="mr-3 whitespace-pre cursor-help text-purple-600">
      <span class="min-w-12 inline-block">{{text.star4}}{{colon}}{{detail.count4}}</span>
      [{{percent(detail.count4, detail.total)}}]
    </span>
    <br><span class="text-blue-500 whitespace-pre">
      <span class="min-w-12 inline-block">{{text.star3}}{{colon}}{{detail.count3}}</span>
      [{{percent(detail.count3, detail.total)}}]
    </span>
  </p>

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
  return `${Math.round(num / total * 10000) / 100}%`
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