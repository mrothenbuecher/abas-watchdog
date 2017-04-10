
# abas-watchdog

abas watchdog ist eine [electron app](https://electron.atom.io/) welche
dazu dient die Lizenzverwendung an einem Arbeitsplatz zu überwachen.

Es weist den Anwender darauf hin, falls dieser über einen bestimmten Zeitraum keine Aktivität im abas zeigt,
das er wenn möglich die Lizenz freigeben sollte.

## Funktionsweise

abas-watchdog ruft in einem festen Intervall ein in C# geschriebenes Programm auf
welches nach einem "wineks" Prozess sucht und alle Fenster dieses Prozesses
aufzeichnet (id, Fenstertitel).

Dadurch ist es möglich zu erkennen
- das ein neues Fenster geöffnet wurde
- das eine Aktionen im Fenster durchgeführt wurde (neuen Datensatz geladen, Infosystem ausgeführt,...)
- das ein Fenster geschlossen wurde

## Einstellungen

Die Einstellung erfolgt mittels der `settings.json` im Ordner watchdog.

| Name                  |   Typ  | Beschreibung                                                                                         | Standardwert                                   |
|-----------------------|:------:|------------------------------------------------------------------------------------------------------|------------------------------------------------|
| warning_time_min      |   int  | Anzahl der Minuten (inaktiv) bis zur Warnung                                                         |                       10                       |
| error_time_min        |   int  | Anzahl der Minuten (inaktiv) bis zur Fehlermeldung                                                   |                       15                       |
| close_time_min        |   int  | Anzahl der Minuten nach dem schließen eines Fensters nach dem wieder Warnungen,Fehler usw.           |                        1                       |
| kill_time_min         |   int  | Anzahl der Minuten (inaktiv) nach dem abas geschlossen wird                                          |                        0                       |
| singleton             |  bool  | Es darf nur eine Instanz von abas geöffnet sein andere werden geschlossen                            |                      false                     |
| ignore_windows_titles |  Array | Titel, Teilzeicheketten der Fenster die bei der Inaktivitätsbetrachtung ignoriert werden             | ["abas ERP Kommandoübersicht", "abas ERP", "bitte warten"] |
| refresh_interval_ms   |   int  | Zeit in Millisekunden bis zum nächsten Prüfen der Fensterstati                                       |                    500                         |
| lang                  | String | Kürzel für die Sprache                                                                               |                     de                         |
| allow_devtools        |  bool  | vom Traymenü aus sollen die Entwicklungswerkzeuge anzeigbar sein?                                    |                     false                      |
| allow_quit            |  bool  | vom Traymenü aus das Programm beenden                                                                |                     true                       |

## Installation

1. den release herunterladen
2. in das Verzeichnis der wineks.exe entpacken der "watchdog" Ordner liegt im gleichen Verzeichniss wie die wineks.exe
3. entsprechendes Kommando ("%watchdog/abas-watchdog.exe") in den Autostart der Kommandoübersicht hinterlegen

Mit der nächsten Anmeldung sollte abas-watchdog mit gestartet sein (trayicon).

## Credit

[icon](https://github.com/mrothenbuecher/abas-watchdog/blob/master/images/abas.png) by [abas](http://abas-erp.com/)
