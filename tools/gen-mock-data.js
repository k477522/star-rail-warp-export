// 產生測試用抽卡資料，輸出到 userData/gacha-list-100000001.json
const fs = require('fs')
const path = require('path')

const char5 = ['布洛妮娅', '銀狼', '花火', '刃', '符玄', '景元', '卡芙卡', '羅刹', '黃泉', '砂金']
const char4 = ['艾絲妲', '娜塔莎', '佩拉', '停雲', '白露', '三月七', '丹恆', '虎克', '阿蘭']
const weap5 = ['但戰鬥未止息', '在藍天下', '以憂傷為食', '記憶中的模樣', '長夜不再漫漫']
const weap4 = ['錦繡', '渡鴉', '相戀的心', '幽境訊號', '決心如熔火']
const weap3 = ['鋒銳如影', '智慧觀星者', '穿徹號令', '琥珀', '幻煦珊瑚枝']

let idBase = 1682521800010000000n
let timeBase = new Date('2023-04-26T12:00:00+08:00').getTime()
const TIME_STEP = 30000 // 30秒一抽

function makeId() {
  idBase += 1n
  return idBase.toString()
}

function makeTime(offset) {
  const d = new Date(timeBase + offset * TIME_STEP)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

let globalOffset = 0

function makePulls(poolKey, gachaId, plan) {
  // plan: array of numbers, each number = how many 3★/4★ before next 5★
  // last segment ends without 5★ (current pity)
  const pulls = []
  let offset = globalOffset
  let char5idx = 0, weap5idx = 0

  for (let seg = 0; seg < plan.length; seg++) {
    const count = plan[seg]
    const is5star = seg < plan.length - 1 // last segment = current pity, no 5★

    for (let i = 0; i < count; i++) {
      // sprinkle 4★ every ~9 pulls
      const is4 = (i % 9 === 8)
      const isWeap = Math.random() < 0.3
      let name, itemType, rank

      if (is4) {
        rank = '4'
        if (isWeap) { name = weap4[i % weap4.length]; itemType = '光錐' }
        else { name = char4[i % char4.length]; itemType = '角色' }
      } else {
        rank = '3'
        name = weap3[i % weap3.length]; itemType = '光錐'
      }

      pulls.push({
        id: makeId(), item_id: '2001', item_type: itemType,
        name, rank_type: rank,
        time: makeTime(offset++), gacha_id: gachaId, gacha_type: poolKey, count: '1'
      })
    }

    if (is5star) {
      const isWeap = ['12','22'].includes(poolKey)
      if (isWeap) {
        name = weap5[weap5idx++ % weap5.length]; itemType = '光錐'
      } else {
        name = char5[char5idx++ % char5.length]; itemType = '角色'
      }
      pulls.push({
        id: makeId(), item_id: '1001', item_type: itemType,
        name, rank_type: '5',
        time: makeTime(offset++), gacha_id: gachaId, gacha_type: poolKey, count: '1'
      })
    }
  }

  globalOffset = offset
  return pulls
}

// 各池的5星前累積抽數計畫 (最後一段=當前保底進度，不出5星)
const pools = {
  '11': { gachaId: '2001', plan: [58, 72, 45, 81, 63, 72] },  // 限定角色，最後72抽進度
  '21': { gachaId: '2101', plan: [39, 55, 68, 48] },           // 聯動角色，最後48抽進度
  '12': { gachaId: '3001', plan: [65, 71, 54] },               // 限定光錐，最後54抽進度
  '22': { gachaId: '3101', plan: [70, 62] },                   // 聯動光錐，最後62抽進度
  '1':  { gachaId: '1001', plan: [60, 75, 88, 38] },           // 常駐，最後38抽進度
}

const result = []
for (const [key, { gachaId, plan }] of Object.entries(pools)) {
  result.push([key, makePulls(key, gachaId, plan)])
}

const data = {
  result,
  typeMap: [
    ['11', '角色活動躍遷'],
    ['12', '光錐活動躍遷'],
    ['1', '常駐躍遷'],
    ['21', '角色聯動躍遷'],
    ['22', '光錐聯動躍遷']
  ],
  time: Date.now(),
  uid: '100000001',
  lang: 'zh-tw',
  region: 'prod_gf_cn',
  region_time_zone: 8
}

const outPath = path.resolve(__dirname, '../userData/gacha-list-100000001.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8')
console.log('產生完成：', outPath)

// 印出各池統計
for (const [key, pulls] of result) {
  const star5 = pulls.filter(p => p.rank_type === '5')
  const pity = pulls.filter((p, i) => {
    const last5 = pulls.map((x,j) => x.rank_type==='5' ? j : -1).filter(j=>j>=0).pop()
    return i > (last5 ?? -1)
  }).length
  console.log(`Pool ${key}: 共${pulls.length}抽, ${star5.length}個5星, 當前保底${pity}抽`)
}
