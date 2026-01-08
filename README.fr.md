# Uxnote

[English](README.md) | [Français](README.fr.md)

Uxnote est une barre d'annotation pour maquettes et sites web. Ajoutez un seul script pour obtenir des surlignages, des marqueurs d'elements, des cartes numerotees, des couleurs personnalisees, un mode focus assombri, l'import/export et un envoi par email. Sans plugin et sans backend.

## Pour qui
- Agences et freelances : les clients commentent directement sur la page, puis vous exportez un fichier de revue propre.
- Equipes produit et UX : validez dans le navigateur la ou l'interface vit, sans toucher au code existant.

## Fonctions principales
- Surlignages de texte et epingles d'elements avec pastilles numerotees.
- Couleurs unifiees ou par type, plus un voile assombri activable.
- Import et export dans un fichier JSON unique (titre + date), avec re-import.
- Envoi par email pour partager les retours avec les developpeurs.

## Comment ca fonctionne
1. Injectez le script sur chaque page (ou via un tag manager global).
2. Partagez l'URL avec votre client.
3. Les clients annotent le texte ou les elements ; tout apparait dans le panneau Uxnote.
4. Exportez le JSON ou envoyez par email pour collecter et traiter les retours.

## Installation (copier/coller)
Placez le script juste avant `</body>` pour que le DOM soit pret. Si vous devez le mettre dans `<head>`, ajoutez `defer`.

```html
<script src="https://uxnote.ninefortyone.studio/uxnote-tool/uxnote.js"></script>
```

## Options de la balise script
Le builder de la landing expose ces options :
- `colorForHighlight` ou `colorForTextHighlight` + `colorForElementHighlight`
- `isBackdropVisible`
- `isToolOnTopAtLaunch`
- `isToolVisibleAtFirstLaunch`
- `data-mailto` (destinataire pour l'export email)

Vous pouvez aussi bloquer des zones avec `data-uxnote-ignore`, et re-activer un enfant avec `data-uxnote-allow`.

## Stockage et donnees
Les annotations sont stockees dans `localStorage` pour l'origine courante et par URL. Aucune donnee n'est envoyee a un serveur sauf si vous exportez un fichier JSON ou envoyez des annotations par email.

## Notes de compatibilite
- Fonctionne sur staging, previews ou localhost tant que le script se charge et que `localStorage` est autorise.
- Pour les SPA, les changements de route peuvent demander un rechargement ou une re-init pour afficher les annotations de la nouvelle URL.
- Si la CSP est stricte, autorisez l'origine du script Uxnote et les styles inline (ou ajoutez un nonce/hash).
- Les iframes same-origin fonctionnent si vous injectez Uxnote dans le document de l'iframe.

## Licence
Uxnote est publie sous licence MIT. Voir `LICENSE`.

## Structure du projet
- `index.html` - landing page et texte de documentation.
- `assets/` - styles de la landing et donnees de langue.
- `uxnote-tool/uxnote.js` - script Uxnote.
- `uxnote-tool/ressources/` - icones et logos.
