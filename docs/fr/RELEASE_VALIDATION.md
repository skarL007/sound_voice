[English](../RELEASE_VALIDATION.md) · **Français**

# Protocole de validation des versions : micro virtuel (Discord + jeux)

C'est le dernier contrôle manuel avant d'étiqueter une version publique. Il
valide la promesse centrale du produit : **la voix générée fonctionne comme un
microphone dans Discord et dans n'importe quel jeu**, sur une machine qui n'a
jamais vu le projet.

Exécutez-le sur l'installateur NSIS candidat à la publication (`dist/*.exe`),
pas sur un build de développement.

## Environnement

- [ ] Machine ou VM Windows 11 propre (ni VB-Cable, ni Python, ni Node installés)
- [ ] **Compte Windows standard (non administrateur)** : l'élévation UAC doit
      être demandée, pas implicite
- [ ] Discord installé et connecté à un compte de test, plus un second compte
      sur un autre appareil pour écouter
- [ ] Un jeu avec chat vocal installé (par exemple CS2, Valorant ou Fortnite)

## 1. Installation

- [ ] Lancer l'installateur depuis un compte standard ; l'invite UAC apparaît
      et, une fois acceptée, l'installation se termine sans erreur
- [ ] Le pilote VB-Cable est installé silencieusement par l'installateur
      (vérifier dans les paramètres Son que `CABLE Input (VB-Audio Virtual Cable)`
      existe) ; redémarrer si Windows le demande
- [ ] Note SmartScreen : le parcours « Informations complémentaires → Exécuter
      quand même » fonctionne et correspond aux instructions du README
- [ ] Le SHA-256 de l'installateur téléchargé correspond à la valeur publiée
      dans la release GitHub (`Get-FileHash -Algorithm SHA256 <fichier>`)

## 2. Premier lancement / didacticiel

- [ ] L'application s'ouvre sur l'écran Parler ; le didacticiel apparaît
- [ ] L'indicateur d'état du backend passe à prêt (ou l'application reste
      entièrement utilisable via le cloud si le backend est encore en
      préchauffage)
- [ ] L'étape micro du didacticiel détecte VB-Cable (la vérification en direct
      passe au vert)
- [ ] L'activation du micro virtuel sélectionne automatiquement `CABLE Input`
      sans choix manuel du périphérique

## 3. Discord : les trois façons de parler

Dans Discord : Paramètres → Voix → Périphérique d'entrée = `CABLE Output (VB-Audio Virtual
Cable)`, rejoindre un salon vocal avec le second compte à l'écoute.

- [ ] **Bouton Parler principal** : saisir une phrase, cliquer sur Parler → le
      second compte l'entend
- [ ] **Raccourci global avec l'application réduite** : déclencher un raccourci
      vocal → le second compte l'entend (c'est le test de non-régression de
      l'échec silencieux du câble nul)
- [ ] **Déclenchement rapide en vue compacte** : passer en mode compact,
      déclencher une phrase rapide → le second compte l'entend
- [ ] Retour audio : avec le retour activé, l'utilisateur local entend aussi la
      voix sur ses haut-parleurs

## 4. Chat vocal en jeu

- [ ] Dans les paramètres audio du jeu, définir le périphérique d'entrée sur `CABLE Output`
- [ ] Déclencher un raccourci vocal pendant que le jeu a le focus (application
      en arrière-plan) → les coéquipiers entendent la voix TTS
- [ ] L'audio du jeu (sortie) n'est pas affecté

## 5. Cas d'échec (ne doivent jamais être silencieux)

- [ ] Refuser l'autorisation du microphone quand elle est demandée → l'application
      affiche un avertissement explicite (pas le silence) et explique comment corriger
- [ ] Désinstaller/désactiver VB-Cable, redémarrer l'application → l'état du micro
      indique « non détecté » avec des indications ; la parole est toujours lue sur
      le haut-parleur par défaut
- [ ] Activer le micro virtuel sans câble disponible → une notification
      d'avertissement apparaît à la prise de parole (« la voix sera lue sur les
      haut-parleurs, pas dans Discord »)

## 6. Repli hors ligne (routage automatique des moteurs)

- [ ] Avec la source vocale sur Auto et Piper installé : couper le Wi-Fi →
      la parole suivante sort du moteur local et atteint toujours Discord
- [ ] La ligne d'état affiche la décision de routage (par exemple « Auto → Piper (hors ligne) »)
- [ ] Reconnecter → la parole suivante revient à la voix Edge (en ligne)

## 7. Test rapide du backend empaqueté

Depuis le dossier d'installation :

- [ ] `scripts/smoke-packaged-backend.ps1` réussit, y compris le point d'accès
      `/mic/status` (le backend empaqueté n'est pas périmé)

## Validation

| Contrôle | Machine | Windows | Résultat | Date |
|----------|---------|---------|----------|------|
| Protocole complet | | | | |

Une version n'est publiée que lorsque chaque case ci-dessus est cochée sur au
moins une machine propre.
