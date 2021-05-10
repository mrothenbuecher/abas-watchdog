var settings = {
  "warning_time_min": 10,
  "error_time_min": 15,
  "close_time_min": 1,
  "kill_time_min": 0,
  "singleton": false,
  "ignore_windows_titles": ["abas ERP Kommandoübersicht", "abas ERP"],
  "dont_kill": ["abas ERP Kommandoübersicht"],
  "ignore_all_windows_titles": ["bitte warten"],
  "dont_kill_user": [],
  "refresh_interval_ms": 500,
  "lang": "de",
  "elasticsearch": null,
  "dir": "",
  "allow_quit": true,
  "allow_devtools": true,
  "reshow_error_time_sec": 10,
  "current_user":process.env.USERNAME,
  "web_config": ""
};
const got = require('got');
var deepExtend = require('deep-extend');

var rem = require('electron').remote;

var args = null;

// in der electron anwendung
if (typeof rem !== 'undefined') {
  gl = rem.getGlobal('sharedObject');
  //console.log(gl.prop1);
  args = gl.prop1;
} else {
  //console.log(process.argv);
  args = process.argv;
}

function requestSettings(url) {
  got.get(url, {
    responseType: 'json'
  }).then(response => {
    //console.log("Web Settings:",response,"Lang:",.lang);
    deepExtend(settings, response.body);
    settings.web_config = url;
  }).catch(error => {
    console.error("Error while retrieving web config: ", error);
  });
  // reload Settings every minute
  setTimeout(function() {
    requestSettings(url);
  }, 60000);
}

var fs = require('fs');
if (fs.existsSync("watchdog")) {
  settings.dir = "watchdog/";
} else {
  settings.dir = "";
}


var contents = null;

if (args.length >= 2 && args[args.length - 1].match(/\.json/)) {
  //console.log("custom settingsfile:", args[args.length-1]);
  contents = fs.readFileSync(settings.dir + args[args.length - 1]);
} else {
  contents = fs.readFileSync(settings.dir + 'settings.json');
}

if (contents) {
  var jsonContent = JSON.parse(contents);
    // Einstellung aus Datei lesen
  deepExtend(settings, jsonContent);
  // Settings aus dem Web abfragen
  if (settings.web_config) {
    requestSettings(settings.web_config);
  }
}
