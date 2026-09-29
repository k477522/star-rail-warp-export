import idJson from '../idJson.json'
import { gameConstants, isStandardAt } from './gameConstants'

const CHAR_POOLS = ['11', '21']
const CONE_POOLS = ['12', '22']

const cleanName = (name) => (name || '').replace(/<[^>]+>/g, '')

// 光錐 item_id -> 對應角色名稱
// 1. 「常數設定」裡的光錐對應角色優先
// 2. 否則用卡池 ID 配對：同一期光錐池 3xxx 對應角色池 2xxx，取該期抽到的限定角色
export const buildConeOwners = (detail, lang) => {
  const owners = new Map()
  if (!detail) return owners

  const names = idJson[lang] || idJson['zh-tw']
  for (const [coneId, charId] of gameConstants.coneOwners) {
    const name = names?.[charId]?.name
    if (name) owners.set(coneId, name)
  }

  // ssrPos: [name, pity, time, poolKey, item_id, type, gacha_id]
  const charByBanner = new Map()
  for (const key of CHAR_POOLS) {
    for (const item of detail.get(key)?.ssrPos || []) {
      const [name, , time, , itemId, , gachaId] = item
      if (!gachaId || isStandardAt(itemId, time) || charByBanner.has(gachaId)) continue
      charByBanner.set(gachaId, cleanName(name))
    }
  }

  for (const key of CONE_POOLS) {
    for (const item of detail.get(key)?.ssrPos || []) {
      const [, , time, , itemId, , gachaId] = item
      if (!gachaId || isStandardAt(itemId, time) || owners.has(itemId)) continue
      const paired = charByBanner.get(`2${gachaId.slice(1)}`)
      if (paired) owners.set(itemId, paired)
    }
  }
  return owners
}
