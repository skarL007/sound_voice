[English](../ARCHITECTURE.md) · **Français**

# Architecture

VoiceLaunch TTS est une application de bureau Electron avec un backend Python
inclus. Ce document sert de carte aux contributeurs : le modèle de processus,
les deux chemins de routage audio, la poignée de main d'authentification du
backend et la chaîne de construction.

## Modèle de processus

```
┌─────────────────────────────────────────────────────────────┐
│ Electron main process  (src/main)                            │
│  • app lifecycle, frameless window, global shortcuts         │
│  • Edge TTS client over WebSocket  (edge-tts-client.ts)      │
│  • spawns + supervises the Python backend (python-manager)   │
│  • download manager, VB-Cable install, auto-updater          │
└───────────────┬──────────────────────────┬──────────────────┘
                │ contextBridge (preload)   │ spawn + HTTP :9472
                ▼                           ▼
┌───────────────────────────┐   ┌──────────────────────────────┐
│ Renderer (src/renderer)   │   │ Python backend (src/python)  │
│  React + Tailwind + Zustand│   │  FastAPI, PyInstaller bundle │
│  • Speak / Shortcuts /    │   │  • local TTS inference       │
│    Settings, compact mode │   │  • Piper / Kokoro / XTTS     │
│  • cloud audio playback   │   │  • virtual mic (sounddevice) │
│    + setSinkId routing    │   │  • hardware probe, cloning   │
└───────────────────────────┘   └──────────────────────────────┘
```

- **Main** (`src/main`) : Node/Electron. Il gère la fenêtre, les gestionnaires
  IPC (`ipc-handlers.ts`), le client WebSocket Edge TTS, le superviseur du
  backend Python (`python-manager.ts`), les téléchargements de modèles et de
  VB-Cable, ainsi que la mise à jour.
- **Preload** (`src/preload/index.ts`) : le seul pont. Il expose au renderer
  une API fixe et typée via `contextBridge` ; le renderer n'a aucun accès à Node
  (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`).
- **Renderer** (`src/renderer`) : React 19 + Tailwind + Zustand. Trois routes
  (Parler `/`, Raccourcis `/shortcuts`, Paramètres `/settings`) plus un mode
  compact toujours au premier plan. L'état et les paramètres sont conservés par
  le processus main.
- **Backend** (`src/python`) : FastAPI sur `127.0.0.1:9472` (le port s'incrémente
  s'il est occupé). Empaqueté en `voicelaunch-backend.exe` autonome via
  PyInstaller ; en développement, il peut tourner depuis les sources avec un
  interpréteur Python 3.12.

## Les deux chemins de routage audio

C'est le point le plus important à comprendre. Il existe **deux chemins de
lecture indépendants**, choisis selon le moteur qui a synthétisé l'audio.

### 1. Chemin cloud (Edge TTS) : rendu dans le renderer

Le chemin par défaut. Le processus main récupère l'audio auprès de Microsoft
Edge TTS via un WebSocket (`edge-tts-client.ts`) et le renvoie au renderer en
base64. Le renderer le décode avec l'API Web Audio et le diffuse vers un ou
plusieurs périphériques de sortie grâce à `MediaStreamDestination` +
`<audio>.setSinkId()` (`src/renderer/src/utils/cloudAudio.ts`) :

- la sortie du **micro virtuel** (`CABLE Input`), pour que Discord et les jeux l'entendent, et
- une sortie de **retour** facultative pour vous entendre vous-même.

Le backend Python n'intervient pas du tout dans la lecture cloud.

### 2. Chemin local (Piper/Kokoro/XTTS) : rendu dans le backend

Quand un moteur local synthétise, le renderer appelle `tts:play`, le processus
main envoie un POST à `/play`, et le backend lit l'audio via `sounddevice` vers
le périphérique VB-Cable (`src/python/virtual_mic.py`). Le backend renvoie des
diagnostics de routage (`routedToVirtualMic`, `fallbackReason`, `deviceName`)
que l'interface affiche quand la voix n'a pas atteint le câble.

### Pourquoi deux chemins

Le chemin cloud ne touche jamais Python : le garder dans le renderer évite
d'imposer le backend sur le chemin critique du mode par défaut, qui privilégie
le en ligne. Le chemin local a besoin d'entrées/sorties audio natives, qui
vivent naturellement dans Python. Ils sont séparés volontairement ;
l'`engineRouter` décide quel moteur s'exécute, et chaque moteur gère sa propre
lecture.

### Routage des moteurs (mode Auto)

`src/renderer/src/utils/engineRouter.ts` est une fonction pure qui choisit le
moteur pour chaque énoncé : en ligne + Edge opérationnel → Edge ; hors ligne ou
Edge en période de repos après échec → Kokoro ou Piper selon le niveau du
matériel et la longueur du texte ; rien d'installé → une invite exploitable. Un
choix explicite `cloud`/`local` l'emporte toujours sur Auto.

## Poignée de main d'authentification du backend

Le backend écoute uniquement en local, mais localhost n'est pas privé : tout
processus local ou toute page web malveillante pourrait envoyer un POST à
`:9472`. Pour fermer cette surface :

1. Au lancement, `python-manager.ts` génère un jeton aléatoire par session et
   l'injecte dans le backend via la variable d'environnement
   `VOICELAUNCH_BACKEND_TOKEN`.
2. Un middleware FastAPI rejette toute requête sans en-tête
   `X-VoiceLaunch-Token` correspondant (401), sauf `GET /health`. Le WebSocket
   `/ws/tts-stream` vérifie aussi le jeton.
3. Le renderer ne voit jamais le jeton. Tous les appels au backend passent par
   le processus main (`backendFetch` dans `ipc-handlers.ts`), qui ajoute l'en-tête.

Quand la variable d'environnement est absente (exécutions autonomes en
développement, pytest, scripts de test rapide), le backend tourne sans
authentification sur localhost, par commodité.

## Construction et empaquetage

- **Renderer/main/preload** : `electron-vite` construit vers `out/`.
- **Backend Python** : `scripts/build-python-venv.bat` produit un bundle
  PyInstaller autonome (`python_dist/voicelaunch-backend/voicelaunch-backend.exe`,
  Python 3.12). La version empaquetée n'inclut que Piper et Kokoro.
- **VB-Cable** : `scripts/fetch-vbcable.ps1` télécharge le pack de pilotes,
  vérifie son SHA-256 et l'extrait dans `assets/vbcable/`. `scripts/before-pack.cjs`
  le garantit avant l'empaquetage ; `electron-builder.yml` l'intègre dans
  `resources/vbcable/` et `build/installer.nsh` l'installe silencieusement (avec élévation).
- **Installateur** : `npm run dist:win` lance electron-builder (NSIS). Voir le
  skill `dist-win-release` et [RELEASE_VALIDATION.md](RELEASE_VALIDATION.md).

## Posture de sécurité (résumé)

- Electron : isolation de contexte, sandbox, pas d'intégration Node, une CSP
  restrictive (`src/renderer/index.html`), `openExternal` validé, aucun appel
  de canal arbitraire.
- Backend : authentification par jeton de session, validation de `modelId` sur
  `install-deps`, assainissement des chemins audio, corps d'erreur génériques
  (aucune fuite d'exception), plafond de 5000 caractères pour la synthèse.
- Téléchargements : HTTPS uniquement avec limite de redirections ; les
  téléchargements de modèles exigent un SHA-256 épinglé dans
  `assets/model-registry.json`, faute de quoi ils sont bloqués ; VB-Cable est
  vérifié par somme de contrôle.

Voir [SECURITY.md](../../SECURITY.md) (en anglais) pour la procédure de signalement
et les versions prises en charge.
