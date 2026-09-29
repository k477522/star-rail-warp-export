const { ipcMain } = require('electron')
const { readJSON, saveJSON, userDataPath } = require('./utils')

// 使用者在「常數設定」維護的常駐名單與光錐對應角色；沒有檔案時渲染端用預設值
const FILE_NAME = 'constants.json'

ipcMain.handle('GET_GAME_CONSTANTS', async () => {
  return await readJSON(userDataPath, FILE_NAME)
})

ipcMain.handle('SAVE_GAME_CONSTANTS', async (event, data) => {
  await saveJSON(FILE_NAME, data)
})
