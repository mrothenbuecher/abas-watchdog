var settings = {
    "warning_time_min": 10,
    "error_time_min": 15,
    "close_time_min": 1,
    "kill_time_min": 0,
    "singleton": false,
    "ignore_windows_titles": ["abas ERP Kommandoübersicht", "abas ERP", "bitte warten"],
    "refresh_interval_ms": 1000,
    "lang": "de",
    "elasticsearch": null,
    "dir": ""
};

var fs = require('fs');
if (fs.existsSync("watchdog")) {
    settings.dir = "watchdog/";
}

var contents = fs.readFileSync(settings.dir + 'settings.json');

if(contents){
  var jsonContent = JSON.parse(contents);
  // Einstellung aus Datei lesen
  jQuery.extend(settings, jsonContent);
}
