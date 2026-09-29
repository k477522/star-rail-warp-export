import idJson from '../idJson.json'
import { STANDARD_5STAR } from './constants'

// 手動對照表：光錐 item_id -> 角色 item_id
// 用在卡池 ID 推算不出來的情況（例如那期沒抽角色）
const SIGNATURE_CONE_OWNER = {
  // 常駐光錐（歪出來的，卡池 ID 推算不到）
  '23000': '1003', // 銀河鐵道之夜 -> 姬子
  '23002': '1107', // 無可取代的東西 -> 克拉拉
  '23004': '1004', // 以世界之名 -> 瓦爾特
  '23005': '1104', // 制勝的瞬間 -> 傑帕德
  // 限定光錐
  '23006': '1005', // 只需等待 -> 卡芙卡
  '23034': '1313'  // 回到大地的飛行 -> 星期日
}

const CHAR_POOLS = ['11', '21']
const CONE_POOLS = ['12', '22']

const cleanName = (name) => (name || '').replace(/<[^>]+>/g, '')

// 光錐 item_id -> 對應角色名稱
// 1. 手動對照表優先
// 2. 否則用卡池 ID 配對：同一期光錐池 3xxx 對應角色池 2xxx，取該期抽到的限定角色
export const buildConeOwners = (detail, lang) => {
  const owners = new Map()
  if (!detail) return owners

  const names = idJson[lang] || idJson['zh-tw']
  for (const [coneId, charId] of Object.entries(SIGNATURE_CONE_OWNER)) {
    const name = names?.[charId]?.name
    if (name) owners.set(coneId, name)
  }

  // ssrPos: [name, pity, time, poolKey, item_id, type, gacha_id]
  const charByBanner = new Map()
  for (const key of CHAR_POOLS) {
    for (const item of detail.get(key)?.ssrPos || []) {
      const [name, , , , itemId, , gachaId] = item
      if (!gachaId || STANDARD_5STAR.has(itemId) || charByBanner.has(gachaId)) continue
      charByBanner.set(gachaId, cleanName(name))
    }
  }

  for (const key of CONE_POOLS) {
    for (const item of detail.get(key)?.ssrPos || []) {
      const [, , , , itemId, , gachaId] = item
      if (!gachaId || STANDARD_5STAR.has(itemId) || owners.has(itemId)) continue
      const paired = charByBanner.get(`2${gachaId.slice(1)}`)
      if (paired) owners.set(itemId, paired)
    }
  }
  return owners
}
