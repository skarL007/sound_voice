[English](../VIRTUAL_MIC.md) · **Français**

# Micro virtuel : guide technique

## Fonctionnement

VoiceLaunch TTS utilise **VB-Audio Virtual Cable** pour acheminer l'audio généré comme s'il s'agissait d'un vrai microphone. Vous pouvez ainsi envoyer la voix synthétisée vers toute application qui accepte une entrée microphone, comme Discord, Zoom et les jeux.

## Architecture

```text
[VoiceLaunch TTS] --audio--> [CABLE Input (VB-Audio)]
                                     |
                                     v
                           [CABLE Output (Virtual Mic)]
                                     |
                                     v
                         [Discord / Zoom / Games]
```

## Installation

### Depuis l'application (recommandé)
1. Ouvrez l'écran **Parler** (ou **Paramètres > Micro virtuel**).
2. Si VB-Cable n'est pas détecté, cliquez sur **Installer le micro virtuel**.
3. Le programme d'installation est inclus dans VoiceLaunch TTS et s'installe tout seul. Si l'installation incluse n'est pas disponible, le lanceur télécharge le programme d'installation officiel de VB-Audio avec une barre de progression, extrait le paquet et ouvre l'installateur.
4. Dans le programme d'installation de VB-Cable, cliquez sur **Install Driver**. Si on vous le demande, redémarrez Windows.
5. Revenez dans VoiceLaunch TTS et cliquez sur **Vérifier l'installation** (nouvelle détection sans redémarrer l'application).
6. Quand **VB-Cable détecté** apparaît, cliquez sur **Activer le micro virtuel**.

Si le téléchargement automatique échoue (réseau ou URL indisponible), le lanceur ouvre le site officiel pour un téléchargement manuel.

> Source : **VB-Cable by VB-Audio** (donationware), https://vb-audio.com/Cable/. Le téléchargement et la redistribution sont autorisés tant que la source reste visible pour l'utilisateur.

### Manuelle
1. Téléchargez depuis : https://vb-audio.com/Cable/
2. Extrayez le ZIP et lancez `VBCABLE_Setup_x64.exe` (ou `VBCABLE_Setup.exe` en 32 bits)
3. Redémarrez l'ordinateur

## Configurer les applications

### Discord
1. Paramètres utilisateur > Voix et vidéo
2. Périphérique d'entrée : **CABLE Output**
3. Désactivez la « Suppression du bruit » et l'« Annulation de l'écho » pour une meilleure qualité

### Zoom
1. Paramètres > Audio
2. Microphone : **CABLE Output**
3. Décochez « Supprimer le bruit de fond »

### Jeux
1. Paramètres audio ou vocaux
2. Microphone : **CABLE Output**

## Modes de fonctionnement

### Appuyer pour parler (PTT)
- Le TTS n'est envoyé au micro virtuel que tant que vous maintenez une touche configurée
- Utile pour éviter les transmissions accidentelles

### Toujours actif
- Tout l'audio généré part directement vers le micro virtuel
- Recommandé pour une conversation continue

## Combiner avec un vrai microphone

Pour utiliser le TTS et la parole réelle en même temps, installez **VoiceMeeter Banana** :
1. Placez votre vrai microphone sur l'entrée 1
2. Placez CABLE Output sur l'entrée 2
3. Sélectionnez VoiceMeeter Output comme microphone dans l'application

## Dépannage

| Problème | Solution |
|----------|----------|
| Aucun son dans l'application | Vérifiez que CABLE Output est sélectionné comme microphone |
| Je n'entends qu'un écho | Désactivez « Écouter ce périphérique » dans le Panneau de configuration du son |
| Mauvaise qualité | Augmentez la fréquence d'échantillonnage de VB-Cable à 48000 Hz |
| Latence élevée | Utilisez des modèles légers comme Piper et Kokoro en mode CPU |
