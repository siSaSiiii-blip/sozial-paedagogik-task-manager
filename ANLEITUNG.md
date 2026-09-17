# Aufgaben-App – Einrichtung auf GitHub Pages

Kein Server, keine Datenbank mehr. Die App läuft komplett im Browser und
speichert die Aufgaben als `tasks.json` in einem privaten GitHub-Repository.

---

## Schritt 1: Privates Daten-Repository anlegen

Auf GitHub ein **neues, privates** Repository erstellen, z. B. `aufgaben-daten`.

- Sichtbarkeit: **Private**
- Kann leer bleiben – die Datei `tasks.json` legt die App beim ersten
  Speichern selbst an.

---

## Schritt 2: Fine-grained Personal Access Token erstellen

GitHub → **Settings** → **Developer settings** → **Personal access tokens**
→ **Fine-grained tokens** → **Generate new token**.

| Feld | Wert |
|---|---|
| Repository access | **Only select repositories** → nur das Daten-Repo aus Schritt 1 |
| Repository permissions | **Contents: Read and write** – sonst nichts |
| Expiration | 90 Tage |

Token erzeugen und **sofort kopieren** – er wird danach nicht mehr angezeigt.

> Der Token ist wie ein Passwort für genau dieses eine Repository. Nicht per
> E-Mail oder Chat unverschlüsselt herumschicken, wenn es sich vermeiden lässt.

---

## Schritt 3: Pages-Repository anlegen und veröffentlichen

1. Ein zweites Repository anlegen: `sozial-paedagogik-task-manager`
   (öffentlich oder privat, enthält nur Code, keine Aufgaben-Daten).
2. Diesen Projektordner hineinpushen (`git push`).
3. Im Pages-Repo: **Settings** → **Pages** → **Source** auf
   **"GitHub Actions"** stellen.
4. Bei jedem Push auf `main` baut und veröffentlicht der Workflow
   (`.github/workflows/deploy.yml`) die Seite automatisch. Die URL steht
   danach unter **Settings → Pages**.

---

## Schritt 4: Token in der App eintragen

Die App-URL öffnen. Beim ersten Öffnen fragt sie nach:

- **Access-Token** (aus Schritt 2)
- **Repository** – als `dein-nutzername/aufgaben-daten` (aus Schritt 1)
- **Branch** – normalerweise `main`

Die App merkt sich das lokal im Browser. Für den Kollegen: **denselben
Token** und dieselben Angaben geben, damit ihr auf derselben `tasks.json`
arbeitet.

---

## Schritt 5: Token bei Verlust sofort widerrufen

Falls der Token verloren geht oder in falsche Hände gerät: GitHub →
**Settings** → **Developer settings** → **Personal access tokens** →
**Fine-grained tokens** → den betroffenen Token öffnen → **Revoke**. Der
Zugriff ist sofort weg. Danach einfach einen neuen Token nach Schritt 2
erzeugen und in der App neu eintragen.

---

## Hinweise

- Die Sicherheit liegt beim Token und der Privatsphäre des Daten-Repos. Die
  App warnt sichtbar, falls das Daten-Repo aus Versehen nicht privat ist.
- Speichern läuft automatisch, kurz nach der letzten Änderung (kein Klick
  nötig). Der Status ("Speichert…" / "Gespeichert") steht oben rechts.
- Ändert jemand anderes die Liste gleichzeitig, meldet die App das deutlich
  und überschreibt nichts blind – einfach neu laden.
- **"Abmelden"** löscht nur den Token aus diesem Browser, ändert aber nichts
  am Token selbst (der bleibt gültig, bis er abläuft oder widerrufen wird).
