const fs = require('fs-extra')
const path = require('path')
const fetch = require('electron-fetch').default
const { BrowserWindow, app, screen } = require('electron')
const crypto = require('crypto')
const unhandled = require('electron-unhandled')
const windowStateKeeper = require('electron-window-state')
const debounce = require('lodash/debounce')
const { glob } = require('glob')

const isDev = !app.isPackaged

const userPath = app.getPath('userData')
// 開發模式：main 編譯在 dist/electron/main，往上三層是專案根目錄（資料放 <專案>/userData）
// 安裝版：exe 所在資料夾（資料放 exe 旁邊的 userData）
const appRoot = isDev ? path.resolve(__dirname, '..', '..', '..') : path.resolve(app.getAppPath(), '..', '..')
const userDataPath = path.resolve(appRoot, 'userData')
// const globalUserDataPath = path.resolve(userPath, 'userData')

let win = null
const initWindow = () => {
  // 以 1920×1080 為設計尺寸，螢幕工作區較小時縮到放得下
  const { workAreaSize } = screen.getPrimaryDisplay()
  let mainWindowState = windowStateKeeper({
    // 換檔名讓舊版記住的小視窗尺寸失效，改用新的預設大小
    file: 'window-state-v2.json',
    defaultWidth: Math.min(1920, workAreaSize.width),
    defaultHeight: Math.min(1080, workAreaSize.height)
  })
  win = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#fff',
    webPreferences: {
      contextIsolation:false,
      nodeIntegration: true
    }
  })
  // 預設開啟時最大化；取消最大化後會回到上面記住的大小
  win.maximize()
  const saveState = debounce(mainWindowState.saveState, 500)
  win.on('resize', () => saveState(win))
  win.on('move', () => saveState(win))
  return win
}

const getWin = () => win

const log = []
const sendMsg = (text, type = 'LOAD_DATA_STATUS') => {
  if (win) {
    win.webContents.send(type, text)
  }
  if (type !== 'LOAD_DATA_STATUS') {
    log.push([Date.now(), type, text])
    saveLog()
  }
}

const saveLog = () => {
  const text = log.map(item => {
    const time = new Date(item[0]).toLocaleString()
    const type = item[1] === 'LOAD_DATA_STATUS' ? 'INFO' : item[1]
    const text = item[2]
    return `[${type}][${time}]${text}`
  }).join('\r\n')
  fs.outputFile(path.join(userDataPath, 'log.txt'), text)
}

const authkeyMask = (text = '') => {
  return text.replace(/authkey=[^&]+&/g, 'authkey=***&')
}

unhandled({
  showDialog: false,
  logger: function (err) {
    log.push([Date.now(), 'ERROR', authkeyMask(err.stack)])
    saveLog()
  }
})

const request = async (url) => {
  const res = await fetch(url, {
    timeout: 15 * 1000
  })
  return await res.json()
}

const sleep = (sec = 1) => {
  return new Promise(rev => {
    setTimeout(rev, sec * 1000)
  })
}

const sortData = (data) => {
  return data.map(item => {
    const [time, name, type, rank] = item
    return {
      time, name, type, rank,
      timestamp: new Date(time)
    }
  }).sort((a, b) => a.timestamp - b.timestamp)
  .map(item => {
    const { time, name, type, rank } = item
    return [time, name, type, rank]
  })
}

const langMap = new Map([
  ['zh-cn', '简体中文'],
  ['zh-tw', '繁體中文'],
  ['de-de', 'Deutsch'],
  ['en-us', 'English'],
  ['es-es', 'Español'],
  ['fr-fr', 'Français'],
  ['id-id', 'Indonesia'],
  ['ja-jp', '日本語'],
  ['ko-kr', '한국어'],
  ['pt-pt', 'Português'],
  ['ru-ru', 'Pусский'],
  ['th-th', 'ภาษาไทย'],
  ['vi-vn', 'Tiếng Việt']
])

const localeMap = new Map([
  ['zh-cn', ['zh', 'zh-CN']],
  ['zh-tw', ['zh-TW']],
  ['de-de', ['de-AT', 'de-CH', 'de-DE', 'de']],
  ['en-us', ['en-AU', 'en-CA', 'en-GB', 'en-NZ', 'en-US', 'en-ZA', 'en']],
  ['es-es', ['es', 'es-419']],
  ['fr-fr', ['fr-CA', 'fr-CH', 'fr-FR', 'fr']],
  ['id-id', ['id']],
  ['ja-jp', ['ja']],
  ['ko-kr', ['ko']],
  ['pt-pt', ['pt-BR', 'pt-PT', 'pt']],
  ['ru-ru', ['ru']],
  ['th-th', ['th']],
  ['vi-vn', ['vi']]
])

const detectLocale = (value) => {
  const locale = value || app.getLocale()
  let result = 'zh-cn'
  for (let [key, list] of localeMap) {
    if (locale === key || list.includes(locale)) {
      result = key
      break
    }
  }
  return result
}

const saveJSON = async (name, data) => {
  try {
    await fs.outputJSON(path.join(userDataPath, name), data)
  } catch (e) {
    sendMsg(e, 'ERROR')
    await sleep(3)
  }
}

const readJSON = async (dataPath, name) => {
  let data = null
  try {
    data = await fs.readJSON(path.join(dataPath, name))
  } catch (e) {}
  return data
}

const hash = (data, type = 'sha256') => {
  const hmac = crypto.createHmac(type, 'hk4e')
  hmac.update(data)
  return hmac.digest('hex')
}

const scryptKey = crypto.scryptSync(userPath, 'hk4e', 24)
const cipherAes = (data) => {
  const algorithm = 'aes-192-cbc'
  const iv = Buffer.alloc(16, 0)
  const cipher = crypto.createCipheriv(algorithm, scryptKey, iv)
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

const decipherAes = (encrypted) => {
  const algorithm = 'aes-192-cbc'
  const iv = Buffer.alloc(16, 0)
  const decipher = crypto.createDecipheriv(algorithm, scryptKey, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

const  interfaces = require('os').networkInterfaces()
const localIp = () => {
  for (var devName in interfaces) {
    var iface = interfaces[devName]

    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i]
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
        return alias.address
    }
  }
  return '127.0.0.1'
}

async function getCacheText(gamePath) {
  const results = await glob(path.join(gamePath, '/webCaches{/,/*/}Cache/Cache_Data/data_2'), {
    stat: true,
		withFileTypes: true,
    nodir: true,
    windowsPathsNoEscape: true
  })
  const timeSortedFiles = results
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .map(path => path.fullpath())
  const cacheText = await fs.readFile(path.join(timeSortedFiles[0]), 'utf8')

  return [cacheText, timeSortedFiles[0]]
}

module.exports = {
  sleep, request, hash, cipherAes, decipherAes, saveLog, getCacheText,
  sendMsg, readJSON, saveJSON, initWindow, getWin, localIp, userPath, detectLocale, langMap,
  appRoot, userDataPath
}