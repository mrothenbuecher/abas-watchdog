var fs = require('fs');
const electron = require('electron');
const log = require('electron-log');
const { dialog } = require('electron')

log.info("starte watchdog");

global.sharedObject = {
  prop1: process.argv
}

if (fs.existsSync("watchdog")) {
  eval(fs.readFileSync('watchdog/assets/js/settings.js') + '');
} else {
  eval(fs.readFileSync('assets/js/settings.js') + '');
}
// dafür sorgen das die devtools angezeigt werden

require('electron-debug')({
  showDevTools: false,
  isEnabled: true
});


const app = electron.app
const Tray = electron.Tray
const Menu = electron.Menu
const { ipcMain } = require('electron')

const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')

let mainWindow
let tray

function createWindow() {

  tray = new Tray(__dirname + '/images/abas.ico');
  tray.setToolTip('abas-watchdog');


  mainWindow = new BrowserWindow({
    icon: __dirname + '/images/abas.ico',
    show: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false
    }
  });
  mainWindow.setMenu(null);
  //mainWindow.openDevTools();
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  var force_quit = false;

  var menu = [];

  menu.push({
    label: 'show',
    type: 'normal',
    click: function() {
      mainWindow.show();
    }
  });

  menu.push({
    label: 'settings',
    type: 'normal',
    click: function() {
      mainWindow.webContents.send('message', 'ping');
    }
  });

  if (settings.allow_devtools) {
    menu.push({
      label: 'devtools',
      type: 'normal',
      click: function() {
        mainWindow.webContents.openDevTools();
      }
    });
  }

  if (settings.allow_quit) {
    menu.push({
      type: 'separator'
    });
    menu.push({
      label: 'quit',
      type: 'normal',
      click: function() {
        force_quit = true;
        mainWindow.close();
      }
    });
  }

  const contextMenu = Menu.buildFromTemplate(menu);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  });

  mainWindow.on('show', () => {
    //tray.setHighlightMode('always');
  });

  mainWindow.on('hide', () => {
    //tray.setHighlightMode('never');
  });

  // Hauptfenster wird nicht geschlossen nur versteckt
  mainWindow.on('close', function(e) {
    if (!force_quit) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.hide();
}

/*
var shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    //if (!mainWindow.isVisible()) mainWindow.show();
    //if (mainWindow.isMinimized()) mainWindow.restore();
    //mainWindow.focus();
  }
});
*/

var shouldQuit = !app.requestSingleInstanceLock();

if (shouldQuit) {
  app.quit();
  return;
}

app.on('ready', createWindow)

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function() {
  if (mainWindow === null) {
    createWindow()
  }
})

process.on("uncaughtException", (err) => {

    log.error(err);

   const messageBoxOptions = {
        type: "error",
        title: "Fehler",
        message: err
    };
    dialog.showMessageBoxSync(messageBoxOptions);

    // I believe it used to be the case that doing a "throw err;" here would
    // terminate the process, but now it appears that you have to use's Electron's
    // app module to exit (process.exit(1) seems to not terminate the process)
    app.exit(1);
});
