const url = require('url')
//const path = require('path')

const remote = require('electron').remote;
const BrowserWindow = remote.BrowserWindow;

var errorwindow = null;

var es_client = null;

if (settings.elasticsearch) {
    var elasticsearch = require('elasticsearch');

    es_client = new elasticsearch.Client({
        host: settings.elasticsearch.host
    });
}

// status an elasticsearch senden
var sendStatus = function(status) {
    if (es_client) {

        var d = new Date();
        var n = d.toISOString();

        var os = require("os");
        status.hostname = os.hostname();
        status.timestamp = n;

        es_client.index({
            index: 'abas-watchdog',
            type: 'status',
            body: status
        });

    }
};

if (contents) {

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

                var makeError = function() {
                    if (!errorwindow) {
                        errorwindow = new BrowserWindow({
                            width: 500,
                            height: 300,
                            icon: __dirname + '/images/abas.ico'
                        });
                        errorwindow.setMenu(null);

                        errorwindow.loadURL(url.format({
                            pathname: path.join(__dirname, 'error.html'),
                            protocol: 'file:',
                            slashes: true
                        }));

                        //errorwindow.openDevTools();

                        errorwindow.on('close', function(e) {
                            e.preventDefault();
                            errorwindow = null;
                            //TODO Log
                        });
                    }
                };

                var ignore = function(val, array) {
                    var ignore = false;
                    // prüfen ob der Fenstertitel ignoriert werden soll
                    $.each(array, function(i, title) {
                        ignore = ignore || val.windowtitle.indexOf(title) !== -1;
                    });
                    return ignore;
                };

                var ignoreWindow = function(val) {
                    return ignore(val, settings.ignore_windows_titles);
                };

                var ignoreAllWindow = function(val) {
                    return ignore(val, settings.ignore_all_windows_titles);
                };

                // abas window watcher exe ausführen
                exec(settings.dir + "abas-window-watcher.exe", settings.singleton ? ["singleton"] : [""], function(err, text) {
                    if (!err) {
                        // Daten aus der abas-window-watcher.exe
                        // Liste der offenen Fenster
                        var data = JSON.parse(text);
                        $('#windows').html("");
                        // keine Fenster geöffnet
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

                                        var status = {};
                                        status.windowtitle = foo.windowtitle;
                                        status.windowid = foo.id;
                                        status.windowstatus = "closed";

                                        sendStatus(status);

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

                            var ignoreAll = false;

                            // offene Fenster prüfen
                            $.each(data, function(i, val) {

                                var found = false;
                                // alle bekannten Fenster durchgehen
                                $.each(windows, function(j, foo) {
                                    if (foo.id == val.id && foo.windowtitle == val.windowtitle) {
                                        // nichts mit dem Fenster passiert
                                        val = foo;
                                        found = true;
                                        // Fenster soll ignoriert werden siehe ignore_all_windows_titles...
                                        if(ignoreAllWindow(val)){
                                          val.time = (new Date()).getTime();
                                          windows[j] = val;
                                        }
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

                                // prüfen ob durch dieses Fenster
                                // alle anderen Fenster auch ignoriert werden müssen
                                if(ignoreAllWindow(val)){
                                  ignoreAll = true;
                                }

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
                                if (ignore) {
                                    row += "<td colspan=\"2\">" + val.windowtitle + "</td>";
                                } else {
                                    row += "<td>" + val.windowtitle + "</td>";
                                    row += "<td>" + msToTime(currentTime) + "</td>";
                                }
                                row += "</tr>";
                                $('#windows').append(row);

                            });

                            if (lastClosed != 10000000000000000 && !ignoreAll) {
                                $('#closed-label').text($.i18n("last_closed") + msToTime(lastClosed));

                            } else {
                                $('#closed-label').text("");
                            }

                            if (idleTime != 10000000000000000 && !ignoreAll) {
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
                                    makeError();
                                }

                                // Programm beenden
                                if (settings.kill_time_min > 0 && idleTime >= settings.kill_time_min) {
                                    exec(settings.dir + "abas-window-watcher.exe",["kill"], function(err, text) {
										console.log("kill Error:",err,text);
									});
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

} else {
    toastr['error']('couldn`t find settings.json');
}
