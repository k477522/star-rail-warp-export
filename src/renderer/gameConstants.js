// 遊戲常數：常駐 5★ 名單、光錐對應角色
// 預設值寫在這裡，使用者在「常數設定」修改後存到 userData/constants.json
import { reactive } from 'vue'
const { ipcRenderer } = require('electron')

// since：開始出現在限定池歪池的日期（YYYY-MM-DD，亞洲服版本更新日），空字串 = 一開始就是常駐
// 在那之前只能在自己的限定池抽到，抽到算中限定
export const DEFAULT_STANDARD = [
  // 角色（原始 7）
  { id: '1003', since: '' }, // 姬子
  { id: '1004', since: '' }, // 瓦爾特
  { id: '1101', since: '' }, // 布洛妮婭
  { id: '1104', since: '' }, // 傑帕德
  { id: '1107', since: '' }, // 克拉拉
  { id: '1209', since: '' }, // 彥卿
  { id: '1211', since: '' }, // 白露
  // 角色（限定角色加入角色活動池歪池：3.2 = 2025-04-09、4.2 = 2026-04-22）
  { id: '1006', since: '2026-04-22' }, // 銀狼
  { id: '1102', since: '2025-04-09' }, // 希兒
  { id: '1205', since: '2025-04-09' }, // 刃
  { id: '1208', since: '2025-04-09' }, // 符玄
  { id: '1221', since: '2026-04-22' }, // 雲璃
  { id: '1302', since: '2026-04-22' }, // 銀枝
  // 光錐
  { id: '23000', since: '' }, // 銀河鐵道之夜
  { id: '23002', since: '' }, // 無可取代的東西
  { id: '23003', since: '' }, // 但戰鬥還未結束
  { id: '23004', since: '' }, // 以世界之名
  { id: '23005', since: '' }, // 制勝的瞬間
  { id: '23012', since: '' }, // 如泥酣眠
  { id: '23013', since: '' }  // 時節不居
]

export const DEFAULT_CONE_OWNERS = [
  // 常駐光錐（歪出來的，卡池 ID 推算不到）
  { cone: '23000', char: '1003' }, // 銀河鐵道之夜 -> 姬子
  { cone: '23002', char: '1107' }, // 無可取代的東西 -> 克拉拉
  { cone: '23004', char: '1004' }, // 以世界之名 -> 瓦爾特
  { cone: '23005', char: '1104' }, // 制勝的瞬間 -> 傑帕德
  // 限定光錐
  { cone: '23006', char: '1005' }, // 只需等待 -> 卡芙卡
  { cone: '23034', char: '1313' }  // 回到大地的飛行 -> 星期日
]

// 目前生效的常數（reactive：設定儲存後各處畫面會自動重算）
export const gameConstants = reactive({
  standard: new Map(DEFAULT_STANDARD.map(x => [x.id, x.since])),
  coneOwners: new Map(DEFAULT_CONE_OWNERS.map(x => [x.cone, x.char]))
})

const apply = ({ standard, coneOwners }) => {
  gameConstants.standard = new Map(standard.map(x => [x.id, x.since || '']))
  gameConstants.coneOwners = new Map(coneOwners.map(x => [x.cone, x.char]))
}

// 可編輯的純資料複本
export const toPlain = () => ({
  standard: [...gameConstants.standard].map(([id, since]) => ({ id, since })),
  coneOwners: [...gameConstants.coneOwners].map(([cone, char]) => ({ cone, char }))
})

export const defaultPlain = () => ({
  standard: DEFAULT_STANDARD.map(x => ({ ...x })),
  coneOwners: DEFAULT_CONE_OWNERS.map(x => ({ ...x }))
})

export const loadGameConstants = async () => {
  const saved = await ipcRenderer.invoke('GET_GAME_CONSTANTS')
  if (saved?.standard && saved?.coneOwners) apply(saved)
}

export const saveGameConstants = async (data) => {
  await ipcRenderer.invoke('SAVE_GAME_CONSTANTS', JSON.parse(JSON.stringify(data)))
  apply(data)
}

// 目前是否在常駐名單（不看時間，用於「常駐」標籤）
export const isStandardItem = (itemId) => gameConstants.standard.has(itemId)

// 抽到當下是否為常駐：有轉常駐日期的，在那之前抽到算限定
export const isStandardAt = (itemId, time) => {
  if (!gameConstants.standard.has(itemId)) return false
  const since = gameConstants.standard.get(itemId)
  if (!since || !time) return true
  return String(time).slice(0, 10) >= since
}
