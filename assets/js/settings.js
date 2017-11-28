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
    "allow_devtools": true
};

function extend(){
    for(var i=1; i<arguments.length; i++)
        for(var key in arguments[i])
            if(arguments[i].hasOwnProperty(key))
                arguments[0][key] = arguments[i][key];
    return arguments[0];
}

var fs = require('fs');
if (fs.existsSync("watchdog")) {
    settings.dir = "watchdog/";
}

var contents = fs.readFileSync(settings.dir + 'settings.json');

if(contents){
  var jsonContent = JSON.parse(contents);
  // Einstellung aus Datei lesen
  settings = extend(settings, jsonContent);
}
