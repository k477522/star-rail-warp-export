// 抽卡規劃：精確計算「在 N 抽內達成目標」的機率（依 pityModel 的軟保底模型）
import { pityModel, probAt } from './pityModel'
import { isStandardAt } from './gameConstants'

export const MAX_PULLS = 2500

// 從目前已墊 startPity 抽開始，「再抽 k 抽出下一隻 5★」的機率，index = k
const nextFiveStar = (key, startPity) => {
  const { hard } = pityModel(key)
  const pmf = [0]
  let survival = 1
  for (let k = 1; startPity + k <= hard; k++) {
    const p = probAt(startPity + k, key)
    pmf.push(survival * p)
    survival *= (1 - p)
  }
  return pmf
}

// 兩個分佈相加（卷積），超過 MAX_PULLS 的截掉
const convolve = (a, b) => {
  const out = new Array(Math.min(a.length + b.length - 1, MAX_PULLS + 1)).fill(0)
  for (let i = 0; i < a.length; i++) {
    if (!a[i]) continue
    for (let j = 0; j < b.length && i + j < out.length; j++) out[i + j] += a[i] * b[j]
  }
  return out
}

const addInto = (target, src, scale) => {
  for (let i = 0; i < src.length; i++) target[i] = (target[i] || 0) + src[i] * scale
}

// 取得 n 隻限定所需抽數的分佈（pmf，index = 抽數）
// rate：小保底中限定機率（角色 0.5、光錐 0.75）
export const pullsForLimited = (key, n, startPity, guaranteed, rate) => {
  if (n <= 0) return [1]
  const first = nextFiveStar(key, startPity)
  const fresh = nextFiveStar(key, 0)
  const done = new Array(MAX_PULLS + 1).fill(0)
  let states = [{ count: 0, guaranteed, pmf: [1] }]
  let isFirst = true
  while (states.length) {
    const next = new Map()
    const push = (count, g, pmf, scale) => {
      if (count >= n) return addInto(done, pmf, scale)
      const k = `${count},${g}`
      if (!next.has(k)) next.set(k, { count, guaranteed: g, pmf: [] })
      addInto(next.get(k).pmf, pmf, scale)
    }
    for (const st of states) {
      const pmf = convolve(st.pmf, isFirst ? first : fresh)
      if (st.guaranteed) {
        push(st.count + 1, false, pmf, 1)
      } else {
        push(st.count + 1, false, pmf, rate)
        push(st.count, true, pmf, 1 - rate)
      }
    }
    isFirst = false
    states = [...next.values()].filter(st => st.pmf.some(v => v > 1e-12))
  }
  return done
}

export const toCdf = (pmf) => {
  const cdf = new Array(MAX_PULLS + 1).fill(0)
  let acc = 0
  for (let i = 0; i <= MAX_PULLS; i++) {
    acc += pmf[i] || 0
    cdf[i] = Math.min(acc, 1)
  }
  return cdf
}

// 第一個累積機率達到 p 的抽數
export const quantile = (cdf, p) => {
  const i = cdf.findIndex(v => v >= p)
  return i < 0 ? null : i
}

// 從抽卡紀錄推目前狀態：已墊抽數、是否大保底
export const poolState = (detail, key) => {
  const d = detail?.get(key)
  if (!d) return { pity: 0, guaranteed: false }
  const last = d.ssrPos[d.ssrPos.length - 1]
  return {
    pity: d.countMio || 0,
    guaranteed: !!(last && isStandardAt(last[4], last[2]))
  }
}
