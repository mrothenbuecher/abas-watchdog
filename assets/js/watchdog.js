const url = require('url')
const path = require('path')
const log = require('electron-log');

const remote = require('electron').remote;

const currentWindow = remote.getCurrentWindow();

var errorInterval = -1;
var windowwashidden = true;

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

var dialog = document.querySelector('dialog');

dialog.querySelector('.close').addEventListener('click', function() {
  dialog.close();
});

if (contents) {

  (function() {
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
            var dialog = document.querySelector('dialog');
            if (!$("dialog").is("[open]")) {
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
          console.log("stop errorInterval");
          clearInterval(errorInterval);
          errorInterval = -1;
        }

        var dialog = document.querySelector('dialog');

        console.log("is open:", $("dialog").is("[open]"));

        if ($("dialog").is("[open]")) {
          console.log("schließen");
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

      // Methode welche die ganze Arbeit übernimmt
      var dog = function() {

        // abas window watcher exe ausführen
        exec(settings.dir + "abas-window-watcher.exe", settings.singleton ? ["singleton"] : [""], function(err, text) {
          if (!err) {
            // Daten aus der abas-window-watcher.exe
            // Liste der offenen Fenster
            var processes = JSON.parse(text);
            $('#windows').html("");

            $.each(processes, function(k, proc) {

              var data = proc.Windows;

              // keine Fenster geöffnet
              if (data.length == 0) {
                //aktuell kein abas offen
                var row = "<tr>";
                row += "<td class=\"text-center\" colspan=\"3\"><b>abas nicht geöffnet</b></td>";
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

                      var status = {};
                      status.windowtitle = foo.Title;
                      status.windowid = foo.ProcessId;
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
                    log.debug("Warnungsdialog: " + settings.warning_time_min + " " + idleTime + " " + lastClosed + " " + settings.close_time_min);
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
                  console.log("errorInterval:", errorInterval);

                  if (settings.error_time_min > 0 && idleTime > settings.error_time_min && lastClosed > settings.close_time_min) {
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
                  if (settings.kill_time_min > 0 && idleTime >= settings.kill_time_min) {
                    exec(settings.dir + "abas-window-watcher.exe", ["kill", JSON.stringify(settings.dont_kill)], function(err, text) {
                      console.log("kill Error:", err, text);
                      log.error("Fehler beim Beenden des Programss: " + err + "\n"+text);
                    });
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
            log.error("Fehler beim ausführen abas-window-watcher.exe "+err);
            toastr['error'](text, err);
          }
        });
      };

      // beim starten einmal ausführen
      //dog();
      // dannach in Zeitlich festen interval
      setInterval(dog, settings.refresh_interval_ms);
    } else {
      log.error("assets/settings.json -> Missing / couldn't read");
      toastr['error']("assets/settings.json", "Missing / couldn't read");
    }
  })();

} else {
  log.error('couldn`t find settings.json');
  toastr['error']('couldn`t find settings.json');
}
