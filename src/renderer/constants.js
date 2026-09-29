// 常駐 5★ 名單與光錐對應角色改由「常數設定」維護，見 gameConstants.js
import { isStandardAt } from './gameConstants'

// 限定池 banner key（角色/光錐池）
export const EVENT_BANNER_KEYS = new Set(['11', '12', '21', '22'])

// 聯動池 banner key
export const COLLAB_BANNER_KEYS = new Set(['21', '22'])

// 判斷某筆 5★ 是否是「歪」：在限定池但拿到（抽到當下）常駐池角色/光錐
export const isOffBanner = (bannerKey, itemId, time) => {
  return EVENT_BANNER_KEYS.has(bannerKey) && isStandardAt(itemId, time)
}
