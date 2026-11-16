[English](../VOICE_CLONING.md) · **Français**

# Clonage de voix : guide utilisateur

## Qu'est-ce que le clonage de voix ?

Le clonage de voix permet au système d'apprendre les caractéristiques d'une voix à partir d'un court extrait audio (6 à 30 secondes), puis de synthétiser de nouvelles phrases avec cette même voix.

## Modèles qui prennent en charge le clonage

| Modèle | Durée de référence | Temps de traitement | Licence |
|--------|--------------------|---------------------|---------|
| **XTTS v2** | 6 secondes | 2 à 4 secondes | CPML (non commerciale) |
| **Fish Speech** | 10 à 30 secondes | 3 à 5 secondes | Apache 2.0 (usage commercial autorisé) |

## Pas à pas dans le lanceur

### 1. Enregistrer ou importer un audio
- **Enregistrer** : utilisez le microphone de votre ordinateur dans un environnement calme
- **Importer** : glissez un fichier WAV, MP3 ou OGG (minimum 6 s, maximum 60 s)

### 2. Valider l'audio
Le système vérifie automatiquement :
- La durée (3 à 60 secondes)
- Le niveau de bruit (SNR)
- La fréquence d'échantillonnage

### 3. Configurer
- Choisissez le modèle de clonage
- Donnez un nom à la voix (par exemple « Ma voix », « La voix de Jean »)
- Ajoutez une description facultative

### 4. Traiter
Cliquez sur « Lancer le clonage ». Le système extrait les caractéristiques de la voix et enregistre l'embedding.

### 5. Utiliser
La voix clonée apparaît dans l'onglet « Parler » comme voix disponible.

## Conseils pour de meilleurs résultats

1. **Environnement calme** : évitez les bruits de fond, les ventilateurs, etc.
2. **Distance constante** : gardez le microphone à environ 15 cm de votre bouche
3. **Parole naturelle** : lisez un texte sur un ton de conversation
4. **Évitez les sifflantes excessives** : ne parlez pas trop près du microphone
5. **Durée idéale** : 10 à 15 secondes est le juste milieu pour XTTS v2

## Texte d'exemple pour l'enregistrement

> « Bonjour, je m'appelle [votre nom]. J'enregistre cet échantillon de voix pour l'utiliser dans un assistant vocal. La technologie d'intelligence artificielle peut aider beaucoup de personnes à mieux communiquer. »

## Limites

- **XTTS v2** : usage non commercial sans licence distincte
- **Fish Speech** : la qualité peut varier avec des accents très marqués
- Les deux nécessitent un GPU avec au moins 4 Go de VRAM
- Les voix très chuchotées ou criées tendent à être clonées avec moins de fidélité
