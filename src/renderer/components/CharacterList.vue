<template>
  <div v-if="hasData" class="mt-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
    <div class="flex items-baseline justify-between mb-3">
      <h3 class="text-base font-semibold text-gray-700">5★ 收藏</h3>
      <span class="text-gray-400 text-xs">
        角色 {{ characters.length }} · 光錐 {{ cones.length }} · 總拉取 {{ totalPulls }}
      </span>
    </div>

    <!-- 角色 -->
    <div v-if="characters.length" class="mb-4">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-sm font-medium text-gray-600">角色</span>
        <span class="text-gray-400 text-xs">({{ characters.length }})</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        <div v-for="ch of characters" :key="ch.name"
             :class="ch.isStandard ? 'bg-gray-50' : 'bg-white'"
             :title="cardTitle(ch)"
             class="border border-gray-200 rounded-lg p-2.5 cursor-help transition-shadow hover:shadow-md">
          <div class="flex items-center justify-between gap-1">
            <span class="font-semibold text-gray-800 text-sm truncate" :title="ch.name">{{ ch.name }}</span>
            <span :class="constellationClass(ch.constellation)" class="text-[11px] font-bold px-1.5 py-0.5 rounded leading-none flex-shrink-0">
              E{{ ch.constellation }}<span v-if="ch.overflow" class="opacity-70">+{{ ch.overflow }}</span>
            </span>
          </div>
          <div class="flex items-center justify-between mt-1.5">
            <span class="text-gray-500 text-xs">×{{ ch.count }}</span>
            <span class="text-gray-400 text-[11px] tabular-nums">{{ formatDate(ch.lastDate) }}</span>
          </div>
          <div v-if="ch.isStandard" class="text-gray-400 text-[10px] mt-0.5">常駐池</div>
        </div>
      </div>
    </div>

    <!-- 光錐 -->
    <div v-if="cones.length">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-sm font-medium text-gray-600">光錐</span>
        <span class="text-gray-400 text-xs">({{ cones.length }})</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        <div v-for="co of cones" :key="co.name"
             :class="co.isStandard ? 'bg-gray-50' : 'bg-white'"
             :title="cardTitle(co)"
             class="border border-gray-200 rounded-lg p-2.5 cursor-help transition-shadow hover:shadow-md">
          <div class="flex items-center justify-between gap-1">
            <span class="font-semibold text-gray-800 text-sm truncate" :title="co.name">{{ co.name }}</span>
            <span :class="superimpositionClass(co.superimposition)" class="text-[11px] font-bold px-1.5 py-0.5 rounded leading-none flex-shrink-0">
              S{{ co.superimposition }}<span v-if="co.overflow" class="opacity-70">+{{ co.overflow }}</span>
            </span>
          </div>
          <div class="flex items-center justify-between mt-1.5">
            <span class="text-gray-500 text-xs">×{{ co.count }}</span>
            <span class="text-gray-400 text-[11px] tabular-nums">{{ formatDate(co.lastDate) }}</span>
          </div>
          <div v-if="co.isStandard" class="text-gray-400 text-[10px] mt-0.5">常駐池</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { isWeapon } from '../utils'
import { STANDARD_5STAR } from '../constants'

const props = defineProps({
  detail: Map,
  typeMap: Map
})

const cleanName = (name) => (name || '').replace(/<[^>]+>/g, '')

const aggregated = computed(() => {
  if (!props.detail) return { characters: [], cones: [] }
  const map = new Map()
  for (const [, d] of props.detail) {
    if (!d?.ssrPos) continue
    for (const item of d.ssrPos) {
      const name = cleanName(item[0])
      if (!map.has(name)) {
        map.set(name, {
          name,
          itemType: item[5],
          itemId: item[4],
          count: 0,
          pulls: []
        })
      }
      const entry = map.get(name)
      entry.count++
      entry.pulls.push({
        time: item[2],
        bannerKey: item[3],
        pity: item[1]
      })
    }
  }

  const characters = []
  const cones = []
  for (const entry of map.values()) {
    entry.pulls.sort((a, b) => new Date(a.time) - new Date(b.time))
    entry.firstDate = entry.pulls[0].time
    entry.lastDate = entry.pulls[entry.pulls.length - 1].time
    entry.banners = [...new Set(entry.pulls.map(p => p.bannerKey))]
    entry.isStandard = STANDARD_5STAR.has(entry.itemId)

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

  const sortFn = (a, b) => b.count - a.count || new Date(b.lastDate) - new Date(a.lastDate)
  characters.sort(sortFn)
  cones.sort(sortFn)
  return { characters, cones }
})

const characters = computed(() => aggregated.value.characters)
const cones = computed(() => aggregated.value.cones)
const hasData = computed(() => characters.value.length > 0 || cones.value.length > 0)
const totalPulls = computed(() =>
  characters.value.reduce((a, x) => a + x.count, 0) +
  cones.value.reduce((a, x) => a + x.count, 0)
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

const cardTitle = (entry) => {
  const banners = entry.banners.map(k => props.typeMap?.get(k) || k).join('、')
  const first = new Date(entry.firstDate).toLocaleDateString()
  const last = new Date(entry.lastDate).toLocaleDateString()
  const pities = entry.pulls.map(p => p.pity).join(', ')
  return `${entry.name}\n首次：${first}\n最近：${last}\n來源：${banners}\n每次 pity：${pities}`
}
</script>
