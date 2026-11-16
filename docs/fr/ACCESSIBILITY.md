[English](../ACCESSIBILITY.md) · **Français**

# Accessibilité - VoiceLaunch TTS

## Mission

VoiceLaunch TTS est conçu pour les personnes qui s'appuient sur la communication assistée, les personnes non parlantes et toute personne qui a besoin de transformer du texte en parole avec plus de rapidité, d'autonomie et de confidentialité. L'objectif du produit est d'offrir un outil gratuit, local et pratique pour communiquer grâce à la parole synthétisée.

## Fonctionnalités d'accessibilité

### Navigation au clavier
- **Tab** : passer d'un élément à l'autre
- **Entrée/Espace** : activer les boutons et les contrôles
- **Échap** : fermer les fenêtres modales et flottantes
- **Maj+Tab** : revenir en arrière

### Raccourcis globaux
- **Ctrl+Shift+F** : donner le focus à la fenêtre et au champ de parole principal
- **Ctrl+Shift+S** : arrêter l'audio immédiatement
- **Ctrl+Shift+V** : ouvrir le communicateur compact et donner le focus à la saisie de texte
- **Ctrl+Shift+1 à 9** : dire les 9 premières phrases rapides enregistrées
- **Ctrl+Shift+M** : activer ou désactiver le micro virtuel

### Interface
- **Contraste élevé** : couleurs conformes au contraste WCAG AA
- **Grandes polices** : lisibles sur les écrans haute résolution
- **Focus visible** : indicateurs de focus clairs pour la navigation au clavier
- **Mode sombre** : interface sombre pour réduire la fatigue visuelle

### Modes d'utilisation
- **Fenêtre flottante** : toujours au premier plan pour un accès rapide
- **Clavier virtuel** : saisie de texte sans clavier physique
- **Phrases rapides personnalisables** : enregistrez vos phrases fréquentes et adaptez-les à votre vocabulaire
- **Historique persistant** : réutilisez d'anciennes phrases même après avoir fermé l'application
- **Brouillon persistant** : le texte en cours peut rester disponible d'une session à l'autre
- **Mode compact avec récents** : accès rapide au texte, aux phrases enregistrées et aux phrases récentes

## Matériel requis accessible

| Configuration | Modèles disponibles | Performances |
|---------------|---------------------|--------------|
| PC de base (CPU, 4 Go de RAM) | Piper | Parcours principal le plus sûr |
| Portable milieu de gamme (8 Go de RAM) | Piper, Kokoro | Bonne expérience avec le MVP local |
| Ordinateur de bureau avec NVIDIA/CUDA validé | Piper, Kokoro, XTTS v2 | Fonctionnalité avancée débloquée après la première parole |
| AMD sous Windows | Piper, Kokoro | Parcours garanti dans le MVP actuel |

## Utilisation avec des dispositifs de communication assistée

VoiceLaunch TTS répond déjà au mieux à ces usages :
- **Clavier physique** : saisie directe + raccourcis globaux
- **Clavier virtuel à l'écran** : saisie assistée sans clavier physique
- **Fenêtre compacte toujours au premier plan** : communication rapide pendant les appels, les jeux et les conversations

Il peut aussi être intégré avec :
- **Oculomètres** : sélection de phrases par le regard
- **Contacteurs** : commande à un seul bouton
- **Tablettes tactiles** : interface optimisée pour le tactile

## Scénarios réels prioritaires

- **Répondre rapidement par oui/non** sans réécrire toute la phrase
- **Demander de l'aide** avec un raccourci global ou une phrase enregistrée
- **Répéter une phrase fréquente** depuis l'historique persistant
- **Utiliser votre voix comme micro virtuel** dans Discord, Zoom, les jeux et les appels
- **Retrouver votre texte après une erreur ou une interruption**, sans perdre le message

## Confidentialité

- **100 % hors ligne** : aucune donnée vocale ne quitte l'ordinateur
- **Voix locales** : le clonage et la synthèse s'exécutent sur le matériel de l'utilisateur
- **Aucun compte** : ni inscription ni connexion internet requises
