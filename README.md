# Graphical Visualisation Technologies

Dieses Repository ist als gemeinsame Portfolio-Webseite für zehn Einsendeaufgaben aufgebaut.

## Struktur

- `index.html`: zentrale Indexseite des Semesters
- `aufgabe-01/`: erste Einsendeaufgabe
- spätere Aufgaben werden analog als `aufgabe-02/` bis `aufgabe-10/` ergänzt

## Aufgabe 01 lokal starten

Öffne im Projektordner ein Terminal und starte einen lokalen Webserver, zum Beispiel:

```bash
python3 -m http.server 8000
```

Danach im Browser öffnen:

`http://localhost:8000`

Alternativ kann in Visual Studio Code die Erweiterung "Live Server" verwendet werden.

## GitHub Pages

Für ein reines HTML, CSS und JavaScript Projekt kann GitHub Pages direkt aus dem Repository veröffentlicht werden.

Empfohlene Einstellung:

1. Repository auf GitHub anlegen und Dateien hochladen bzw. pushen.
2. `Settings` öffnen.
3. `Pages` auswählen.
4. Unter `Build and deployment` als Source `Deploy from a branch` wählen.
5. Branch `main` und Ordner `/(root)` auswählen.
6. Speichern.

Die Webseite nutzt relative Pfade, damit sie auch als GitHub Project Page in einem Unterpfad funktioniert.

## Abgabecheck Aufgabe 01

- L: exakt ein Bild nach links
- R: exakt ein Bild nach rechts
- A: automatische Rotation starten und stoppen
- Buttons funktionieren zusätzlich
- Scheibe läuft zyklisch über alle 24 Bilder
- Roboter-Sprite-Sheet ist animiert
- Browserkonsole enthält keine Fehler
- Seite ist unter der finalen GitHub-Pages-URL erreichbar
- Quellenhinweis ist auf der Webseite sichtbar
