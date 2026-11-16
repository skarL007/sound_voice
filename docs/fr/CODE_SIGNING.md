[English](../CODE_SIGNING.md) · **Français**

# Guide de signature de code - VoiceLaunch TTS

> Les exécutables et installateurs Windows doivent être signés avant toute publication.

## Pourquoi la signature de code compte

Sans signature de code, les utilisateurs Windows verront :
- **« Windows a protégé votre ordinateur »** (blocage SmartScreen)
- **« Éditeur inconnu »** dans les invites UAC
- Des faux positifs d'antivirus

Cela empêche environ 80 % des utilisateurs non techniques d'installer l'application.

---

## Options

### Option 1 : certificat de signature de code standard (~200 $/an)

**Idéal pour :** développeurs indépendants, petites équipes

**Fournisseurs :** Sectigo, DigiCert, GoDaddy, SSL.com

**Étapes :**
1. Achetez un **certificat de signature de code standard** (pas EV)
2. Faites valider votre identité ou votre organisation (1 à 3 jours ouvrés)
3. Téléchargez le fichier `.pfx`
4. Construisez avec la signature :
   ```powershell
   $env:WIN_CSC_LINK = "C:\certs\voicelaunch.pfx"
   $env:WIN_CSC_KEY_PASSWORD = "your-password"
   npm run dist:win
   ```

**Résultat :** l'avertissement SmartScreen disparaît après environ 2 semaines de construction de réputation.

---

### Option 2 : certificat de signature de code EV (~400-700 $/an)

**Idéal pour :** contourner SmartScreen immédiatement

**Fournisseurs :** DigiCert, Sectigo

**Étapes :**
1. Achetez un **certificat de signature de code EV**
2. Recevez un jeton USB matériel ou un HSM dans le cloud
3. Installez les pilotes du jeton
4. Construisez avec la signature :
   ```powershell
   $env:WIN_CSC_LINK = "C:\certs\token-config.json"
   $env:CSC_KEY_PASSWORD = "token-PIN"
   npm run dist:win
   ```

**Résultat :** SmartScreen est contourné immédiatement, sans période d'attente de réputation.

---

### Option 3 : Microsoft Store (gratuit)

**Idéal pour :** portée maximale, sans coût de certificat

**Étapes :**
1. Créez un compte Microsoft Partner Center
2. Soumettez le paquet `.msix` (utilisez `electron-builder --win msix`)
3. Passez la validation de Microsoft

**Résultat :** pas de SmartScreen, mises à jour automatiques via le Store, diffusion plus large.

**Contrepartie :** Microsoft prélève 15 % des revenus (en cas de monétisation).

---

## Signature CI/CD avec GitHub Actions

Ajoutez ces secrets à votre dépôt GitHub :

- `WIN_CSC_LINK` - contenu du fichier PFX encodé en Base64
- `WIN_CSC_KEY_PASSWORD` - mot de passe du certificat

Créez `.github/workflows/release.yml` :

```yaml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npm run dist:win
        env:
          WIN_CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
          WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
      - uses: softprops/action-gh-release@v1
        with:
          files: dist/*.exe
```

---

## État actuel

| Build | Signé | SmartScreen |
|-------|-------|-------------|
| `npm run dist:win` sans identifiants de signature | Non | Avertira |
| Build signé avec `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` | Oui | Risque d'avertissement réduit |

---

## Politique de publication - 2026-05-15

1. **Bêta interne ou contrôlée :** un build non signé peut encore circuler en interne, tant que SmartScreen et le support manuel sont traités comme un risque connu.
2. **Publication publique :** la signature reste obligatoire. Ne publiez pas l'installateur publiquement sans certificat configuré dans le pipeline ou dans l'environnement de publication officiel.
3. **Mise à jour automatique :** elle doit rester désactivée. Ne la réactivez pas avant d'avoir validé, au minimum, ces trois verrous :
   - pipeline de publication officiel reproductible ;
   - cible `publish`/release alignée sur le dépôt réel ;
   - installation et parcours de base sur une machine propre.
4. **Bonne séquence :** valider d'abord un vrai build empaqueté de `Piper + Kokoro`, puis une machine propre et le support bêta, et seulement ensuite réactiver la distribution automatique.

## Notes opérationnelles

- Le `2026-05-15`, `cmd /c npm run test` et `cmd /c npm run build` restent au vert dans le dépôt.
- Le `2026-05-15`, `cmd /c npm run dist:win` a été relancé avec succès, l'application empaquetée a de nouveau répondu sur `/health` et `/models`, et le repli automatique de port a été revalidé avec `9472` occupé et le backend actif sur `9473`.
- Cela signifie que le verrou technique d'empaquetage sur cette machine est de nouveau au vert, mais la signature et la mise à jour automatique restent des verrous de publication tant que la machine propre, VB-Cable/Discord/Zoom et le support bêta ne sont pas bouclés.
