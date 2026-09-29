<template>
  <div class="mt-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm border-t-4 border-t-violet-400">
    <div class="flex items-baseline justify-between mb-4 pb-3 border-b border-gray-100">
      <h3 class="text-lg font-semibold text-violet-700 flex items-center gap-1.5">
        <span>⚙️</span>常數設定
      </h3>
      <div class="flex items-center gap-2">
        <span v-if="dirty" class="text-orange-500 text-sm">尚未儲存</span>
        <el-button @click="resetDefault">還原預設</el-button>
        <el-button :disabled="!dirty" @click="reload">取消變更</el-button>
        <el-button type="primary" :disabled="!dirty" :loading="saving" @click="save">儲存</el-button>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <!-- 常駐 5★ 名單 -->
      <section>
        <p class="text-gray-700 text-base font-semibold mb-1">常駐 5★ 名單</p>
        <p class="text-gray-400 text-sm mb-3">
          在限定池抽到名單內的角色或光錐算「歪」。限定角色從某版本起才會被歪到時，填上該版本的更新日，在那之前抽到的仍算中限定。
        </p>
        <div class="flex gap-2 mb-3">
          <el-select v-model="newStandard" filterable placeholder="搜尋角色或光錐名稱" class="flex-1">
            <el-option v-for="it of standardCandidates" :key="it.id" :label="it.label" :value="it.id"></el-option>
          </el-select>
          <el-button :disabled="!newStandard" @click="addStandard">新增</el-button>
        </div>
        <el-table :data="draft.standard" max-height="520" size="default" border>
          <el-table-column label="名稱" min-width="160">
            <template #default="{ row }">
              <span class="inline-flex items-center gap-1.5">
                <el-icon class="text-gray-400">
                  <Filter v-if="isCone(row.id)" />
                  <User v-else />
                </el-icon>
                {{ nameOf(row.id) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="加入歪池日期" width="200">
            <template #default="{ row }">
              <el-date-picker :model-value="row.since || null" type="date" value-format="YYYY-MM-DD"
                              placeholder="一開始就是常駐" clearable class="!w-full"
                              @update:model-value="v => row.since = v || ''" />
            </template>
          </el-table-column>
          <el-table-column width="90" align="center">
            <template #default="{ $index }">
              <el-button text type="danger" icon="delete" @click="draft.standard.splice($index, 1)"></el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <!-- 光錐對應角色 -->
      <section>
        <p class="text-gray-700 text-base font-semibold mb-1">光錐對應角色</p>
        <p class="text-gray-400 text-sm mb-3">
          光錐名稱前會顯示【角色】。沒設定的光錐會用卡池 ID 自動推算（同期角色池抽到的限定角色）。
        </p>
        <div class="flex gap-2 mb-3">
          <el-select v-model="newCone" filterable placeholder="光錐" class="flex-1">
            <el-option v-for="it of coneCandidates" :key="it.id" :label="it.label" :value="it.id"></el-option>
          </el-select>
          <el-select v-model="newChar" filterable placeholder="角色" class="flex-1">
            <el-option v-for="it of allChars" :key="it.id" :label="it.label" :value="it.id"></el-option>
          </el-select>
          <el-button :disabled="!newCone || !newChar" @click="addConeOwner">新增</el-button>
        </div>
        <el-table :data="draft.coneOwners" max-height="520" size="default" border>
          <el-table-column label="光錐" min-width="160">
            <template #default="{ row }">{{ nameOf(row.cone) }}</template>
          </el-table-column>
          <el-table-column label="角色" min-width="140">
            <template #default="{ row }">
              <el-select v-model="row.char" filterable class="!w-full">
                <el-option v-for="it of allChars" :key="it.id" :label="it.label" :value="it.id"></el-option>
              </el-select>
            </template>
          </el-table-column>
          <el-table-column width="90" align="center">
            <template #default="{ $index }">
              <el-button text type="danger" icon="delete" @click="draft.coneOwners.splice($index, 1)"></el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import idJson from '../../idJson.json'
import { isWeapon } from '../utils'
import { toPlain, defaultPlain, saveGameConstants } from '../gameConstants'

const props = defineProps({
  lang: String
})

const names = computed(() => idJson[props.lang] || idJson['zh-tw'])

const draft = reactive(toPlain())
const snapshot = ref(JSON.stringify(toPlain()))
const dirty = computed(() => JSON.stringify(draft) !== snapshot.value)
const saving = ref(false)

const newStandard = ref('')
const newCone = ref('')
const newChar = ref('')

const nameOf = (id) => names.value?.[id]?.name || id
const isCone = (id) => isWeapon(names.value?.[id]?.item_type)

// 所有 5★（依名稱排序），label 帶 ID 方便區分同名
const all5 = computed(() => Object.entries(names.value || {})
  .filter(([id, v]) => id !== 'version' && v?.rank_type === '5')
  .map(([id, v]) => ({ id, label: v.name, cone: isWeapon(v.item_type) }))
  .sort((a, b) => a.label.localeCompare(b.label)))

const allChars = computed(() => all5.value.filter(x => !x.cone))

const standardCandidates = computed(() => {
  const used = new Set(draft.standard.map(x => x.id))
  return all5.value
    .filter(x => !used.has(x.id))
    .map(x => ({ ...x, label: `${x.label}（${x.cone ? '光錐' : '角色'}）` }))
})

const coneCandidates = computed(() => {
  const used = new Set(draft.coneOwners.map(x => x.cone))
  return all5.value.filter(x => x.cone && !used.has(x.id))
})

const addStandard = () => {
  draft.standard.push({ id: newStandard.value, since: '' })
  newStandard.value = ''
}

const addConeOwner = () => {
  draft.coneOwners.push({ cone: newCone.value, char: newChar.value })
  newCone.value = ''
  newChar.value = ''
}

const setDraft = (data) => {
  draft.standard = data.standard
  draft.coneOwners = data.coneOwners
}

const reload = () => setDraft(toPlain())

const resetDefault = () => {
  setDraft(defaultPlain())
  ElMessage.info('已還原為預設值，按「儲存」後生效')
}

const save = async () => {
  saving.value = true
  try {
    await saveGameConstants(draft)
    snapshot.value = JSON.stringify(toPlain())
    setDraft(toPlain())
    ElMessage.success('已儲存')
  } finally {
    saving.value = false
  }
}
</script>
