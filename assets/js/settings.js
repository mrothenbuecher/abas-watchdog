var settings = {
  "warning_time_min": 10,
  "error_time_min": 15,
  "close_time_min": 1,
  "kill_time_min": 0,
  "singleton": false,
  "ignore_windows_titles": ["abas ERP Kommandoübersicht", "abas ERP"],
  "dont_kill": ["abas ERP Kommandoübersicht"],
  "ignore_all_windows_titles": ["bitte warten"],
  "refresh_interval_ms": 500,
  "lang": "de",
  "elasticsearch": null,
  "dir": "",
  "allow_quit": true,
  "allow_devtools": true,
  "reshow_error_time_sec": 10
};


var rem = require('electron').remote;

var args = null;

// in der electron anwendung
if(typeof rem !== 'undefined'){
  gl = rem.getGlobal('sharedObject');
  console.log(gl.prop1);
  args = gl.prop1;
}else{
  console.log(process.argv);
  args = process.argv;
}

function extend() {
  for (var i = 1; i < arguments.length; i++)
    for (var key in arguments[i])
      if (arguments[i].hasOwnProperty(key))
        arguments[0][key] = arguments[i][key];
  return arguments[0];
}

var fs = require('fs');
if (fs.existsSync("watchdog")) {
  settings.dir = "watchdog/";
} else {
  settings.dir = "";
}


var contents = null;

if(args.length >= 2 && args[args.length-1].match(/\.json/)){
  console.log("custom settingsfile:", args[args.length-1]);
  contents = fs.readFileSync(settings.dir + args[args.length-1]);
}else{
  contents = fs.readFileSync(settings.dir + 'settings.json');
}

if (contents) {
  var jsonContent = JSON.parse(contents);
  // Einstellung aus Datei lesen
  settings = extend(settings, jsonContent);
}
