[English](CONTRIBUTING.md) · **Français**

# Contribuer à VoiceLaunch TTS

Merci de votre intérêt ! VoiceLaunch TTS est un outil de communication
assistée : les contributions qui améliorent l'accessibilité, la fiabilité
et la réussite au premier lancement sont particulièrement bienvenues.

## Plateforme

Ce projet fonctionne **uniquement sous Windows 10/11**. Le système de build,
le backend Python et l'installateur NSIS nécessitent Windows. La prise en
charge de Mac et de Linux est prévue pour une prochaine version.

---

## Façons de contribuer

- **Rapports de bogues** : ouvrez une Issue avec le modèle bogue
- **Demandes de fonctionnalités** : ouvrez une Issue avec le modèle fonctionnalité
- **Documentation** : README, docs/, commentaires dans le code
- **Tests** : tests unitaires vitest dans `src/**/*.test.ts`
- **Interface (renderer)** : React/TypeScript dans `src/renderer/`
- **Processus principal d'Electron** : `src/main/`
- **Backend Python** : `src/python/` (nécessite Python 3.12)
- **Design** : les agents `.claude/agents/launcher-designer.md` et `app-flow-designer.md` aident à auditer l'interface et les parcours (design v2 : sobre, sans néon)

---

## Mise en place de l'environnement de développement

### Prérequis

- Windows 10 ou 11 (x64)
- Node.js 20 ou supérieur
- npm 10 ou supérieur
- Python 3.12 (uniquement pour travailler sur le backend ou construire l'installateur)
- Git

### Installer et lancer

```sh
git clone https://github.com/skarL007/sound_voice.git
cd sound_voice
npm install
npm run dev
```

La commande `npm run dev` démarre l'application Electron. Le backend Python
ne démarre **pas** automatiquement en mode développement, sauf si le dossier
`python_dist/` est présent. Sans lui, l'application utilise les voix Edge TTS
du cloud, ce qui suffit pour la plupart des travaux sur l'interface.

### Construire le backend Python (facultatif)

Cette étape nécessite Python 3.12 et prend de 5 à 15 minutes :

```bat
scripts\build-python.bat
```

Cela crée `python_dist\voicelaunch-backend\voicelaunch-backend.exe`.
Le dossier est exclu de git (~200 Mo).

### Lancer les tests

```sh
npm test
```

Tous les tests doivent passer avant qu'une PR puisse être fusionnée. Vous
pouvez aussi lancer la vérification des types TypeScript :

```sh
npm run type-check
```

### Construire l'installateur

```sh
npm run dist:win
```

Cela produit `dist/VoiceLaunch-TTS-Setup-<version>.exe`. Le dossier
`python_dist/` doit être présent.

---

## Liste de contrôle d'une Pull Request

- [ ] `npm test` passe
- [ ] `npm run type-check` réussit sans erreur TypeScript
- [ ] `npm run build` réussit sans erreur
- [ ] Les changements se limitent à une seule responsabilité par PR
- [ ] Le nouveau comportement est couvert par des tests lorsque c'est raisonnable
- [ ] L'accessibilité est préservée (navigation au clavier, focus visible,
      contraste WCAG AA)

---

## Style de code

- TypeScript en mode strict (`tsconfig.json`)
- Tailwind CSS pour le style : pas de `style` en ligne dans la mesure du possible
- Zustand pour l'état : ne vous abonnez qu'aux champs utilisés par le composant
  (voir les sélecteurs existants)
- IPC d'Electron : validez toutes les entrées dans le gestionnaire du
  processus principal avant de les utiliser

---

## Messages de commit

Utilisez les conventional commits :

```
feat: add audio output selector to the settings page
fix: prevent SSRF in the download manager redirect chain
docs: update virtual microphone guide for VRChat PTT
test: add coverage for the cloudAudio playback sequence
```

---

## Failles de sécurité

N'ouvrez **pas** d'Issues publiques pour des vulnérabilités de sécurité. Consultez
[SECURITY.md](SECURITY.md) (en anglais) pour la procédure de divulgation responsable.
