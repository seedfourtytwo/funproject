# Brick Tetris

Un Tetris à l'envers et un casse-brique sur le même écran de téléphone.
Les pièces montent et se collent au plafond ; une fée rebondit sur une planche
et casse les briques. Une ligne pleine s'efface avec un gros bonus.

En ligne : https://brick-tetris.christopher-k.workers.dev

## Jouer

- **En haut** : glisse à gauche ou à droite pour bouger la pièce, touche pour la
  tourner, glisse vers le haut pour la lancer jusqu'au plafond.
- **En bas** : glisse pour bouger la planche. Elle suit ton doigt sans sauter.
- La fée casse les briques du tas et celles de la pièce qui bouge (plus de
  points). Casse les quatre cases d'une pièce avant qu'elle se colle : bonus.
- Combo : chaque série de 3 briques cassées sans que la fée touche la planche
  multiplie les points, jusqu'à ×5.
- Des bonus tombent parfois des briques : cœur (une vie, jusqu'à 5),
  champignon (planche plus large 12 s), étoile (la fée traverse tout 6 s).
- Perdu quand le tas descend jusqu'en bas de la grille, ou quand toutes les
  fées sont tombées dans l'herbe.
- Au clavier (pour tester sur PC) : flèches gauche / droite, flèche haut pour
  lancer, Z / X pour tourner, A / D pour la planche, P pour la pause.

Sur iPhone ou Android : ouvre l'adresse, puis « Ajouter à l'écran d'accueil ».
Le jeu s'ouvre alors en plein écran et marche même sans réseau.

## Le faire tourner sur ton PC

Il faut [Node.js](https://nodejs.org) (version 22 ou plus).

```bash
npm install
```

```bash
npm run dev -- --host
```

Puis ouvre l'adresse affichée. Chaque fois que tu enregistres un fichier, la
page se met à jour toute seule.

- **Android** (câble ou débogage sans fil) : `adb reverse tcp:5173 tcp:5173`,
  puis `localhost:5173` dans Chrome sur le téléphone. La console du téléphone
  s'affiche sur le PC dans `brave://inspect`.
- **iPhone** : même Wi-Fi que le PC, puis ouvre `http://<adresse-du-PC>:5173`
  dans Safari (l'adresse « Network » que Vite affiche). Pas besoin de compte
  développeur Apple : c'est une page web.

## Tests

```bash
npm test
```

Les règles du jeu (gravité inversée, lignes, rebonds, gestes, score) sont
testées sans navigateur. Si tu changes une règle, change le test avec.

## Mettre en ligne

```bash
npm run deploy
```

Construit le jeu dans `dist/` et l'envoie sur Cloudflare (il faut être
connecté avec `npx wrangler login`). Le dépôt GitHub reste privé.

## Comment c'est rangé

| Fichier | Rôle |
|---|---|
| `src/config.js` | Toutes les mesures et réglages (tailles, vitesses, gestes) |
| `src/main.js` | La boucle de jeu et les écrans : titre, partie, pause, fin |
| `src/tetris.js` | La grille, les 7 pièces, rotation, lignes, gravité inversée |
| `src/breakout.js` | La planche, la fée (balle), les rebonds et les briques cassées |
| `src/rules.js` | Le score et la difficulté |
| `src/input.js` | Les doigts (gestes, deux pouces à la fois) et le clavier |
| `src/render.js` | Tout le dessin, 60 fois par seconde |
| `src/sprites.js` | Le pixel art, dessiné en code au démarrage |
| `src/fx.js` | Éclats, étincelles, tremblement, flash, vibrations |
| `src/audio.js` | Les sons 8 bits, fabriqués en direct |
| `public/` | Icônes, manifeste (installation) et `sw.js` (hors ligne) |

## Trois idées pour lire le code

**La boucle.** Le navigateur appelle `frame()` avant chaque image. Le jeu
avance par petits pas fixes de 1/120 s (`update`), puis dessine (`drawFrame`).
Ainsi la fée va à la même vitesse sur un vieux téléphone et sur un neuf.

**Un écran imaginaire.** Tout est dessiné sur un écran de 360 pixels de large,
puis agrandi pour remplir le vrai écran. Les dessins ne dépendent donc pas du
téléphone.

**Des événements.** Quand la fée casse une brique, `breakout.js` ne touche pas
au score : il renvoie « case cassée ». `main.js` décide quoi en faire (points,
son, éclats). Chaque fichier a un seul travail.
