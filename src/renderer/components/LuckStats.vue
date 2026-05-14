<template>
  <div v-if="hasData" class="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
    <p class="text-gray-600 font-medium text-sm mb-3">運氣分析</p>

    <!-- Luck tier -->
    <div class="mb-3">
      <span :class="tierColor" class="text-xl font-bold">{{ tierLabel }}</span>
      <span class="text-gray-400 text-xs ml-2">
        <template v-if="totalSSR >= 3">
          限定角色池均抽 {{ avgPity }} 抽（共 {{ totalSSR }} 個五星）
        </template>
        <template v-else>
          限定角色池五星數量不足，無法評級（需至少 3 個）
        </template>
      </span>
    </div>

    <!-- Tier ladder -->
    <div class="flex gap-1 mb-4 text-xs">
      <div v-for="t of tiers" :key="t.label"
           :class="t.active ? `bg-white border-2 ${t.borderColor}` : 'bg-gray-100 border border-gray-200'"
           class="flex-1 text-center py-1 px-1 rounded">
        <div :class="t.active ? `${t.textColor} font-bold` : 'text-gray-400'">{{ t.label }}</div>
        <div class="text-gray-400 text-[10px] mt-0.5">{{ t.range }}</div>
      </div>
    </div>

    <!-- Pool pity bars -->
    <div class="space-y-2">
      <div v-for="pool of poolList" :key="pool.key" class="flex items-center gap-2 text-xs">
        <span class="text-gray-500 w-28 text-right flex-shrink-0 truncate">{{ pool.name }}</span>
        <div class="flex-1 bg-gray-200 rounded-full h-2">
          <div
            :class="barColor(pool.pity, pool.hardPity)"
            class="h-2 rounded-full transition-all"
            :style="`width: ${Math.min(pool.pity / pool.hardPity * 100, 100)}%`"
          ></div>
        </div>
        <span :class="pityTextColor(pool.pity, pool.hardPity)" class="w-16 flex-shrink-0">
          {{ pool.pity }} / {{ pool.hardPity }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  detail: Map,
  typeMap: Map
})

const hardPityMap = {
  '11': 90, '21': 90, '1': 90,
  '12': 80, '22': 80,
  '2': 50
}

const hasData = computed(() => props.detail && props.detail.size > 0)

const allSSR = computed(() => {
  const result = []
  for (const key of ['11', '21']) {
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

const tierDefs = [
  { label: '超級歐洲人', range: '< 45',  max: 45,       textColor: 'text-yellow-500', borderColor: 'border-yellow-400' },
  { label: '歐洲人',     range: '45 – 58', max: 58,     textColor: 'text-green-500',  borderColor: 'border-green-400' },
  { label: '普通人',     range: '58 – 68', max: 68,     textColor: 'text-gray-600',   borderColor: 'border-gray-400' },
  { label: '非洲人',     range: '68 – 78', max: 78,     textColor: 'text-orange-500', borderColor: 'border-orange-400' },
  { label: '超級非洲人', range: '≥ 78',   max: Infinity, textColor: 'text-red-600',   borderColor: 'border-red-400' }
]

const currentTier = computed(() => {
  if (avgPity.value === null || totalSSR.value < 3) return null
  return tierDefs.find(t => avgPity.value < t.max)
})

const tierLabel = computed(() => currentTier.value?.label ?? '—')
const tierColor = computed(() => currentTier.value?.textColor ?? 'text-gray-400')

const tiers = computed(() => tierDefs.map(t => ({
  ...t,
  active: currentTier.value === t
})))

const poolList = computed(() => {
  if (!props.detail) return []
  return ['11', '21', '12', '22', '1']
    .filter(key => props.detail.has(key))
    .map(key => ({
      key,
      name: props.typeMap?.get(key) || key,
      pity: props.detail.get(key).countMio,
      hardPity: hardPityMap[key] || 90
    }))
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
