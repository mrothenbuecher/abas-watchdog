var jsonfile = require('jsonfile');
// default Settings
var settings = {
    "warning_time_min": 10,
    "error_time_min": 15,
    "close_time_min": 1,
    "kill_time_min": 0,
    "singleton": false,
    "ignore_windows_titles": ["abas ERP Kommandoübersicht", "abas ERP", "bitte warten"],
    "refresh_interval_ms": 1000,
    "lang": "de",
    "dir":""
};

var fs = require('fs');
if (fs.existsSync("watchdog")) {
    settings.dir = "watchdog/";
}

// Einstellung aus Datei lesen
jQuery.extend(settings, jsonfile.readFileSync(settings.dir+'settings.json'));

(function() {
    var exec = require('child_process').execFile;
    const {
        dialog
    } = require('electron').remote;

    if (settings) {
        var windows = [];

        var notif = null;

        function msToTime(s) {
            // Pad to 2 or 3 digits, default is 2
            function pad(n, z) {
                z = z || 2;
                return ('00' + n).slice(-z);
            }

            var ms = s % 1000;
            s = (s - ms) / 1000;
            var secs = s % 60;
            s = (s - secs) / 60;
            var mins = s % 60;
            var hrs = (s - mins) / 60;

            return pad(hrs) + ':' + pad(mins);
        }

        // Methode welche die ganze Arbeit übernimmt
        var dog = function() {

            var ignoreWindow = function(val) {
                var ignore = false;
                // prüfen ob der Fenstertitel ignoriert werden soll
                $.each(settings.ignore_windows_titles, function(i, title) {
                    ignore = ignore || val.windowtitle.indexOf(title) !== -1 ;
                });
                return ignore;
            };

            // abas window watcher exe ausführen
            exec(settings.dir+"abas-window-watcher.exe", settings.singleton?["singleton"]:[""], function(err, text) {
                if (!err) {
                    var data = JSON.parse(text);
                    $('#windows').html("");
                    if (data.length == 0) {
                        //aktuell kein abas offen
                        var row = "<tr>";
                        row += "<td class=\"text-center\" colspan=\"2\"><b>abas nicht geöffnet</b></td>";
                        row += "</tr>";
                        $('#windows').append(row);
                        $('#activity-label').text("");
                        $('#closed-label').text("");
                    } else {

                        var idleTime = 10000000000000000;
                        var lastClosed = 10000000000000000;

                        // geschlossene Fenster als inaktiv markieren
                        $.each(windows, function(j, foo) {
                            var found = false;
                            // nur als aktiv markierte FEnster prüfen
                            if (foo.active) {
                                $.each(data, function(i, val) {
                                    if (foo.id == val.id) {
                                        found = true;
                                    }
                                });
                                // fenster nicht mehr gefunden scheinbar nicht mehr offen
                                if (!found) {
                                    // Zeitpunkt des schließens feststellen
                                    foo.time = (new Date()).getTime();
                                    // als inaktiv markieren
                                    foo.active = false;
                                    windows[j] = foo;
                                }
                            } else {
                                // für das Inaktive Fenster den Zeitraum seit dem Schließen berechnen
                                var currentTime = ((new Date()).getTime() - foo.time);

                                if (!ignoreWindow(foo)) {
                                    if (currentTime < lastClosed) {
                                        lastClosed = currentTime;
                                    }
                                }

                            }
                        });

                        $.each(data, function(i, val) {

                            var found = false;
                            // alle bekannten Fenster durchgehen
                            $.each(windows, function(j, foo) {
                                if (foo.id == val.id && foo.windowtitle == val.windowtitle) {
                                    // nichts mit dem Fenster passiert
                                    val = foo;
                                    found = true;
                                }
                                if (foo.id == val.id && foo.windowtitle != val.windowtitle) {
                                    // titel vom Fenster ist anders
                                    foo.time = (new Date()).getTime();
                                    foo.windowtitle = val.windowtitle;
                                    windows[j] = foo;
                                    val = foo;
                                    found = true;
                                }
                            });
                            // Fenster neu
                            if (!found) {
                                val.time = (new Date()).getTime();
                                val.active = true;
                                windows.push(val);
                            }

                            var currentTime = ((new Date()).getTime() - val.time);

                            // wenn es nicht ignoriert werden kann muss geprüft werden
                            // wie lange das Fenster schon aktiv ist
                            var ignore = true;
                            if (!ignoreWindow(val)) {
                                ignore = false;
                                if (currentTime < idleTime) {
                                    idleTime = currentTime;
                                }
                            }

                            var row = "<tr>";
                            if(ignore){
                              row += "<td colspan=\"2\">" + val.windowtitle + "</td>";
                            }else{
                              row += "<td>" + val.windowtitle + "</td>";
                              row += "<td>" + msToTime(currentTime) + "</td>";
                            }
                            row += "</tr>";
                            $('#windows').append(row);

                        });

                        if (lastClosed != 10000000000000000) {
                            $('#closed-label').text($.i18n("last_closed") + msToTime(lastClosed));

                        }else{
                            $('#closed-label').text("");
                        }

                        if (idleTime != 10000000000000000) {
                            $('#activity-label').text($.i18n("last_activity") + msToTime(idleTime));

                            // Umrechung in Minuten
                            idleTime = idleTime / 1000 / 60.0;
                            lastClosed = lastClosed / 1000 / 60.0;

                            // Warnung ausgeben
                            if (idleTime > settings.warning_time_min && lastClosed > settings.close_time_min) {
                                if (!notif) {
                                    notif = new window.Notification($.i18n("dialog_title"), {
                                        body: $.i18n("dialog_warning"),
                                        silent: false
                                    });
                                    notif.onclick = function() {
                                        notif = null;
                                    };
                                }
                            }
                            // Fehler ausgeben
                            if (idleTime > settings.error_time_min && lastClosed > settings.close_time_min) {
                                dialog.showErrorBox($.i18n("dialog_title"), $.i18n("dialog_error"));
                            }

                            // Programm beenden
                            if (settings.kill_time_min > 0 && idleTime > settings.kill_time_min) {
                                  exec(settings.dir+"abas-window-watcher.exe kill", function(err, text) {});
                            }
                        } else {
                            $('#activity-label').text("");
                        }

                    }
                } else {
                    // sollte ein Fehler Auftretten beim ausführen der exe
                    toastr['error'](text, err);
                }
            });
        };

        // beim starten einmal ausführen
        dog();
        // dannach in Zeitlich festen interval
        setInterval(dog, settings.refresh_interval_ms);
    } else {
        dialog.showErrorBox("assets/settings.json", "Missing / couldn't read");
    }
})();
