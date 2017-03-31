
# abas-watchdog

abas watchdog ist eine (electron app)[https://electron.atom.io/] welche
dazu dient die Lizenzverwendung an einem Arbeitsplatz zu überwachen.

Es weist den Anwender darauf hin, falls dieser über einen bestimmten Zeitraum keine Aktivität im abas zeigt,
das er wenn möglich die Lizenz freigeben sollte.

## Funktionsweise

abas-watchdog ruft in einem festen Intervall ein in C# geschriebenes Programm auf
welches nach einem "wineks" Prozess sucht und alle Fenster dieses Prozesses
aufzeichnet (id, Fenstertitel).

Dadurch ist es möglich zu erkenn
- das ein neues Fenster geöffnet wurde
- das eine Aktionen im Fenster durchgeführt wurde (neuen Datensatz geladen, Infosystem ausgeführt,...)
- das ein Fenster geschlossen wurde

## Einstellungen

Die Einstellung erfolgt mittels der `settings.json` im Ordner watchdog.

| Name                  |   Typ  | Beschreibung                                                   | Standard                                   |
|-----------------------|:------:|----------------------------------------------------------------|--------------------------------------------|
| warning_time_min      |   int  | Anzahl der Minuten bis zur Warnung                             |                     25                     |
| error_time_min        |   int  | Anzahl der Minuten bis zur Fehlermeldung                       |                     30                     |
| close_time_min        |   int  | Anzahl der Minuten nach dem schließen eines Fensters           |                      1                     |
| ignore_windows_titles |  Array | Titel der Fenster die keinen Einfluss auf die Lizenz haben     | ["abas ERP Kommandoübersicht", "abas ERP"] |
| refresh_interval_ms   |   int  | Zeit in Millisekunden bis zum nächsten Prüfen der Fensterstati |                    1000                    |
| lang                  | String | Kürzel für die Sprache                                         |                     de                     |

## Installation

1. den release herunterladen
2. in das Verzeichnis der wineks.exe entpacken
3. entsprechendes Kommando ("%watchdog/abas-watchdog.exe") in den Autostart der Kommandoübersicht hinterlegen

Mit der nächsten Anmeldung sollte abas-watchdog mit gestartet sein (trayicon).
