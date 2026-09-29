const { app, ipcMain } = require('electron')
const fetch = require('electron-fetch').default
const semver = require('semver')
const util = require('util')
const path = require('path')
const fs = require('fs-extra')
const extract = require('../module/extract-zip')
const { version } = require('../../../package.json')
const { hash, sendMsg } = require('../utils')
const config = require('../config')
const i18n = require('../i18n')
const streamPipeline = util.promisify(require('stream').pipeline)

async function download(url, filePath) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`unexpected response ${response.statusText}`)
  await streamPipeline(response.body, fs.createWriteStream(filePath))
}

const updateInfo = {
  status: 'init'
}

const isDev = !app.isPackaged
const appPath = isDev ? path.resolve(__dirname, '../../', 'update-dev/app'): app.getAppPath()
const updatePath = isDev ? path.resolve(__dirname, '../../', 'update-dev/download') : path.resolve(appPath, '..', '..', 'update')

// 更新檔放在本 fork 的 GitHub Pages（gh-pages 分支），由 release workflow 部署
const UPDATE_URL = 'https://k477522.github.io/star-rail-warp-export/update'

const fetchManifest = async () => {
  const res = await fetch(`${UPDATE_URL}/manifest.json?t=${Math.floor(Date.now() / (1000 * 60 * 10))}`)
  if (!res.ok) throw new Error(`manifest: ${res.status} ${res.statusText}`)
  return await res.json()
}

const hasNewVersion = (data) => data?.active && semver.gt(data.version, version) && semver.gte(version, data.from)

// 下載、驗證並替換程式；成功後通知畫面顯示「重新啟動」按鈕
const install = async (data) => {
  if (updateInfo.status === 'downloading' || updateInfo.status === 'moving') return false
  await fs.emptyDir(updatePath)
  const filePath = path.join(updatePath, data.name)
  updateInfo.status = 'downloading'
  await download(`${UPDATE_URL}/${data.name}`, filePath)
  const buffer = await fs.readFile(filePath)
  const sha256 = hash(buffer)
  if (sha256 !== data.hash) {
    updateInfo.status = 'failed'
    throw new Error('更新檔驗證失敗（hash 不符）')
  }
  const appPathTemp = path.join(updatePath, 'app')
  await extract(filePath, { dir: appPathTemp })
  updateInfo.status = 'moving'
  await fs.emptyDir(appPath)
  await fs.copy(appPathTemp, appPath)
  updateInfo.status = 'finished'
  sendMsg(i18n.log.autoUpdate.success, 'UPDATE_HINT')
  return true
}

// 啟動時自動檢查：開啟「自動更新」就直接安裝
const update = async () => {
  if (isDev) return
  try {
    const data = await fetchManifest()
    if (!hasNewVersion(data)) return
    if (!config.autoUpdate) {
      sendMsg(data.version, 'NEW_VERSION')
      return
    }
    await install(data)
  } catch (e) {
    updateInfo.status = 'failed'
    sendMsg(e, 'ERROR')
  }
}

// 「檢查更新」按鈕
ipcMain.handle('CHECK_UPDATE', async () => {
  const data = await fetchManifest()
  return {
    current: version,
    latest: data?.version || null,
    hasUpdate: !!hasNewVersion(data),
    installed: updateInfo.status === 'finished',
    isDev
  }
})

ipcMain.handle('INSTALL_UPDATE', async () => {
  if (isDev) throw new Error('開發模式不能安裝更新')
  const data = await fetchManifest()
  if (!hasNewVersion(data)) return false
  return await install(data)
})

const getUpdateInfo = () => updateInfo

setTimeout(update, 1000)

exports.getUpdateInfo = getUpdateInfo