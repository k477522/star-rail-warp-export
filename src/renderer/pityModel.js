// 軟保底機率模型：未進軟保底前 base rate；進軟保底後線性上升到硬保底時 100%
export const pityModel = (key) => {
  if (key === '12' || key === '22') return { hard: 80, soft: 65, base: 0.008 }
  if (key === '2') return { hard: 50, soft: 40, base: 0.006 }
  return { hard: 90, soft: 74, base: 0.006 }
}

// 第 pullNum 抽出 5★ 的機率（前面都沒出的條件下）
export const probAt = (pullNum, key) => {
  const { hard, soft, base } = pityModel(key)
  if (pullNum >= hard) return 1
  if (pullNum < soft) return base
  return base + ((pullNum - soft) / (hard - soft)) * (1 - base)
}

// 5★ 剛好在第 k 抽出的機率分佈，回傳長度 hard 的陣列（index 0 = 第 1 抽）
export const pityDistribution = (key) => {
  const { hard } = pityModel(key)
  const dist = []
  let survival = 1
  for (let k = 1; k <= hard; k++) {
    const p = probAt(k, key)
    dist.push(survival * p)
    survival *= (1 - p)
  }
  return dist
}
