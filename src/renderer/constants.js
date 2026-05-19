// 常駐池 5★（item_id）：含原始 7 隻 + 已轉常駐的限定（HSR 3.x）
export const STANDARD_5STAR = new Set([
  // 角色（原始 7）
  '1003', '1004', '1101', '1104', '1107', '1209', '1211',
  // 角色（限轉常）
  '1006', '1102', '1205', '1208', '1221', '1302',
  // 光錐
  '23000', '23002', '23003', '23004', '23005', '23012', '23013'
])

// 限定池 banner key（角色/光錐池）
export const EVENT_BANNER_KEYS = new Set(['11', '12', '21', '22'])

// 判斷某筆 5★ 是否是「歪」：在限定池但拿到常駐池角色/光錐
export const isOffBanner = (bannerKey, itemId) => {
  return EVENT_BANNER_KEYS.has(bannerKey) && STANDARD_5STAR.has(itemId)
}
