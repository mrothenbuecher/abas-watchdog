const { ipcRenderer } = require('electron')

ipcRenderer.on('message', (event, arg) => {
  $('#settingsdialog').find('#settings').text(JSON.stringify(settings,undefined, 2));
  if (!$("#settingsdialog").is("[open]")) {
    settingsdialog.showModal();
  }
  currentWindow.show();
  currentWindow.focus();
})
