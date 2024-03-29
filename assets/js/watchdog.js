const url = require('url')
const path = require('path')
const log = require('electron-log');

// const remote = require('electron').remote;
const remote = require('@electron/remote');
const app = remote.app

// App wird nicht lokal ausgeführt
// daher abas-window-watcher nach temp kopieren

if (!app.getAppPath().startsWith("C:")) {
  fs.copyFile(settings.dir + "abas-window-watcher.exe", app.getPath("temp") + "\\" + "abas-window-watcher.exe", (err) => {
    if (err) {
      log.error(err);
    }
    console.log('abas-window-watcher.exe was copied to ' + app.getPath("temp") + "\\" + "abas-window-watcher.exe");
    log.info('abas-window-watcher.exe was copied to ' + app.getPath("temp") + "\\" + "abas-window-watcher.exe");
  });

  fs.copyFile(settings.dir + "Newtonsoft.Json.dll", app.getPath("temp") + "\\" + "Newtonsoft.Json.dll", (err) => {
    if (err) {
      log.error(err);
    }
    console.log('Newtonsoft.Json.dll was copied to ' + app.getPath("temp") + "\\" + "Newtonsoft.Json.dll");
    log.info('Newtonsoft.Json.dll was copied to ' + app.getPath("temp") + "\\" + "Newtonsoft.Json.dll");
  });

  fs.copyFile(settings.dir + "Newtonsoft.Json.xml", app.getPath("temp") + "\\" + "Newtonsoft.Json.xml", (err) => {
    if (err) {
      log.error(err);
    }
    console.log('Newtonsoft.Json.xml was copied to ' + app.getPath("temp") + "\\" + "Newtonsoft.Json.xml");
    log.info('Newtonsoft.Json.xml was copied to ' + app.getPath("temp") + "\\" + "Newtonsoft.Json.xml");
  });
}


const currentWindow = remote.getCurrentWindow();

var errorInterval = -1;
var windowwashidden = true;

var es_client = null;

var initEs = function() {
  const {
    Client: Client7
  } = require('es7')

  es_client = new Client7({
    node: settings.elasticsearch.host
  });
};

if (settings.elasticsearch) {
  initEs();
}

// status an elasticsearch senden
var sendStatus = function(status) {
  if (es_client) {

    var d = new Date();
    var n = d.toISOString();

    var os = require("os");
    status.hostname = os.hostname();
    status.timestamp = n;
    status.user = settings.current_user;

    es_client.index({
      index: 'abas-watchdog',
      type: 'status',
      body: status
    });
  }
};

// status an elasticsearch senden
var getLicenceCount = async function(status) {
  if (es_client) {

    // Let's search!
    try {
      const {
        body
      } = await es_client.search({
        index: 'abas',
        body: {
          "size": 1,
          "sort": {
            "timestamp": "desc"
          },
          "query": {
            "match_all": {}
          }
        }
      })

      if (body && body.hits && body.hits.hits && body.hits.hits.length == 1) {
        settings.current_licence_count = body.hits.hits[0]._source.count;
        $('#lic-label').text($.i18n("lic_count") + settings.current_licence_count);
      } else {
        settings.current_licence_count = 0;
        $('#lic-label').text("");
      }
    } catch (e) {
      console.error(e);
      log.error(e);
    }
  }
};

var dialog = document.querySelector('#dialog');

dialog.querySelector('.close').addEventListener('click', function() {
  dialog.close();
});

var settingsdialog = document.querySelector('#settingsdialog');

settingsdialog.querySelector('.close').addEventListener('click', function() {
  settingsdialog.close();
});


var blub;
if (contents) {

  blub = (function() {
    var exec = require('child_process').execFile;
    /*
        const {
          dialog
        } = require('electron').remote;
    */

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

      var makeError = function() {
        if (errorInterval == -1) {
          errorInterval = setInterval(function() {
            if (!$("#dialog").is("[open]")) {
              dialog.showModal();
            }
            currentWindow.show();
            currentWindow.focus();
            windowwashidden = false;
          }, settings.reshow_error_time_sec * 1000);
        }
      };

      var disableDialog = function() {
        if (errorInterval != -1) {
          //console.log("stop errorInterval");
          clearInterval(errorInterval);
          errorInterval = -1;
        }

        //console.log("is open:", $("#dialog").is("[open]"));

        if ($("#dialog").is("[open]")) {
          //console.log("schließen");
          dialog.close();
        }
      };

      var ignore = function(val, array) {
        var ignore = false;
        // prüfen ob der Fenstertitel ignoriert werden soll
        $.each(array, function(i, title) {
          ignore = ignore || val.Title.indexOf(title) !== -1;
        });
        return ignore;
      };

      var ignoreWindow = function(val) {
        return ignore(val, settings.ignore_windows_titles);
      };

      var ignoreAllWindow = function(val) {
        return ignore(val, settings.ignore_all_windows_titles);
      };

      counter = 0;

      // Methode welche die ganze Arbeit übernimmt
      var dog = function() {

        if (!es_client && settings.elasticsearch) {
          initEs();
        }

        var cmd = settings.dir + "abas-window-watcher.exe";

        // Anwendung liegt nicht auf C:, ggf. Netzwerk freigabe daher von temp ausführen

        if (!app.getAppPath().startsWith("C:")) {
          cmd = app.getPath("temp") + "\\" + "abas-window-watcher.exe";
        }

        // abas window watcher exe ausführen
        exec(cmd, settings.singleton ? ["singleton"] : [""], function(err, text) {
          try {

            if (es_client) {
              getLicenceCount();
            }
            /*
            if (es_client && settings.elasticsearch && settings.elasticsearch.start_by && settings.current_licence_count && settings.current_licence_count != 0) {
              if (settings.current_licence_count < settings.elasticsearch.start_by) {
                throw "Jump"
              }
            }
            */
            if (!err) {

              counter++;

              // Daten aus der abas-window-watcher.exe
              // Liste der offenen Fenster
              var processes = JSON.parse(text);
              $('#windows').html("");
              //console.log(processes);
              $.each(processes, function(k, proc) {

                var data = proc.Windows;

                // keine Fenster geöffnet
                if (data.length === 0) {
                  //aktuell kein abas offen
                  var row = "<tr>";
                  row += "<td class=\"text-center\" colspan=\"3\"><b>abas nicht geöffnet</b></td>";
                  row += "</tr>";
                  $('#windows').append(row);
                  $('#activity-label').text("");
                  $('#closed-label').text("");
                  windows = [];
                  notif = null;
                  disableDialog();

                } else {

                  var idleTime = 10000000000000000;
                  var lastClosed = 10000000000000000;

                  // geschlossene Fenster als inaktiv markieren
                  $.each(windows, function(j, foo) {
                    var found = false;
                    // nur als aktiv markierte FEnster prüfen
                    if (foo.active) {
                      $.each(data, function(i, val) {
                        if (foo.ProcessId == val.ProcessId) {
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

                  var ignoreAll = false;

                  // offene Fenster prüfen
                  $.each(data, function(i, val) {

                    // offene Fenster ins elasticsearch übertragen
                    if (settings.elasticsearch && settings.elasticsearch.ticks && (counter % settings.elasticsearch.ticks) == 0) {
                      var status = {};
                      status.windowtitle = val.Title;
                      sendStatus(status);
                    }

                    var found = false;
                    // alle bekannten Fenster durchgehen
                    $.each(windows, function(j, foo) {
                      if (foo.ProcessId == val.ProcessId && foo.Title == val.Title) {
                        // nichts mit dem Fenster passiert
                        val = foo;
                        found = true;
                        // Fenster soll ignoriert werden siehe ignore_all_windows_titles...
                        if (ignoreAllWindow(val)) {
                          val.time = (new Date()).getTime();
                          windows[j] = val;
                        }
                      }
                      if (foo.ProcessId == val.ProcessId && foo.Title != val.Title) {
                        // titel vom Fenster ist anders
                        foo.time = (new Date()).getTime();
                        foo.Title = val.Title;
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
                    if (ignoreAllWindow(val)) {
                      ignoreAll = true;
                    }

                    // wenn es nicht ignoriert werden kann muss geprüft werden
                    // wie lange das Fenster schon aktiv ist
                    var ignore = true;
                    if (!ignoreWindow(val)) {
                      ignore = false;
                      // die idleTime überschreiben falls diese größer ist als die des aktuellen Fensters
                      if (currentTime < idleTime) {
                        idleTime = currentTime;
                      }
                    }

                    var client = "";
                    if (proc.File.includes("wineks")) {
                      var clientreg = /[\\|\/]((?!\\|\/).)*?[\\|\/]wineks\.exe/;
                      client = (clientreg.exec(proc.File)[0] + "").replace("wineks.exe", "").replace(/[\\|\/]/g, "");
                    } else if (proc.File.includes("abasgui")) {
                      var clientreg = /[\\|\/]((?!\\|\/).)*?[\\|\/]abasgui\.exe/;
                      client = (clientreg.exec(proc.File)[0] + "").replace("abasgui.exe", "").replace(/[\\|\/]/g, "");
                    }

                    var row = "<tr>";
                    /*
                    if (ignore) {
                      row += "<td>" + val.Title + "</td>";
                      row += "<td>" + client + "</td>";
                      row += "<td>" + msToTime(currentTime) + "</td>";
                    } else {*/
                    row += "<td>" + val.Title + "</td>";
                    row += "<td>" + client + "</td>";
                    row += "<td>" + msToTime(currentTime) + "</td>";
                    //}
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
                    if (settings.warning_time_min > 0 && idleTime > settings.warning_time_min && lastClosed > settings.close_time_min) {
                      //log.debug("Warnungsdialog: " + settings.warning_time_min + " " + idleTime + " " + lastClosed + " " + settings.close_time_min);
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
                    //console.log("errorInterval:", errorInterval);

                    if (settings.error_time_min > 0 && idleTime > settings.error_time_min && lastClosed > settings.close_time_min) {
                      if (es_client && settings.elasticsearch && settings.elasticsearch.start_by && settings.current_licence_count && settings.current_licence_count != 0) {
                        if (settings.current_licence_count < settings.elasticsearch.start_by) {
                          throw "Jump"
                        }
                      }
                      makeError();
                    } else {
                      disableDialog();
                      // wenn mal die Fehlermeldung angezeigt war nun aber nicht mehr wird watchdog wieder verstecken
                      if (currentWindow && currentWindow.isVisible() && !windowwashidden) {
                        currentWindow.hide();
                        windowwashidden = true;
                      }
                    }

                    // Programm beenden
                    if (settings.kill_time_min > 0) {
                      var kill = idleTime >= settings.kill_time_min;

                      if (es_client && settings.elasticsearch && settings.elasticsearch.start_by && settings.current_licence_count && settings.current_licence_count != 0) {
                        if (settings.current_licence_count < settings.elasticsearch.start_by) {
                          throw "Jump"
                        }
                      }

                      if (kill && settings.error_time_min > 0) {
                        kill = idleTime > settings.error_time_min && lastClosed > settings.close_time_min;
                      }

                      if (kill) {
                        kill = !settings.dont_kill_user.includes(settings.current_user);
                      }

                      if (kill) {
                        exec(settings.dir + "abas-window-watcher.exe", ["kill", JSON.stringify(settings.dont_kill)], function(err, text) {
                          if (err) {
                            //console.log("kill Error:", err, text);
                            log.error("Fehler beim Beenden des Programms: " + err + "\n" + text);
                          }
                        });
                        disableDialog();
                      }
                    }
                  } else {
                    $('#activity-label').text("");
                    if (ignoreAll || errorInterval != -1)
                      disableDialog();
                  }
                }
              });

            } else {
              // sollte ein Fehler Auftretten beim ausführen der exe
              log.error("Fehler beim ausführen abas-window-watcher.exe " + err);
              toastr['error'](text, err);
            }
          } catch (e) {
            if (e === "Jump") {/* überspringen */} else {
              console.error("Ausnahme:", e);
              log.error("Ausnahme:", e);
            }
          } finally {
            setTimeout(dog, settings.refresh_interval_ms);
          }
        });
      };

      // beim starten einmal ausführen
      dog();
      // dannach in Zeitlich festen interval
      // setInterval(dog, settings.refresh_interval_ms);
    } else {
      log.error("assets/settings.json -> Missing / couldn't read");
      toastr['error']("assets/settings.json", "Missing / couldn't read");
    }
  })();

} else {
  log.error('couldn`t find settings.json');
  toastr['error']('couldn`t find settings.json');
}
