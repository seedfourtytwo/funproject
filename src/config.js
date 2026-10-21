// Toutes les mesures du jeu, en pixels « logiques ».
// Le jeu est dessiné sur un écran imaginaire de 360 × 640, puis agrandi
// pour remplir le vrai écran. Changer un réglage ici suffit à le changer partout.

export const VIEW_W = 360;
export const VIEW_H = 640;

// Pas de temps fixe de la physique : 120 mises à jour par seconde,
// quelle que soit la vitesse d'affichage du téléphone.
export const STEP = 1 / 120;

// Le terrain : une bande centrale bordée de deux murs.
export const COLS = 10;
export const ROWS = 14;
export const CELL = 26;
export const FIELD_X = (VIEW_W - COLS * CELL) / 2; // 50
export const FIELD_W = COLS * CELL; // 260
export const GRID_TOP = 56; // le plafond, sous le bandeau du score
export const GRID_BOTTOM = GRID_TOP + ROWS * CELL; // 420 : fin de la zone haute

// Le casse-brique.
export const PADDLE_W = 56;
export const PADDLE_H = 10;
export const PADDLE_Y = 596; // haut de la raquette
export const BALL_R = 4;
export const BALL_SPEED = 260; // px par seconde au départ
export const LAUNCH_DELAY = 1; // secondes posée sur la raquette avant de partir
export const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60° depuis la verticale, au bord de la raquette

// Gestes, en pixels d'écran (ce que le doigt ressent, quelle que soit la taille du téléphone).
export const MOVE_STEP_PX = 30; // glisser de 30 px = la pièce bouge d'une colonne
export const SWIPE_UP_PX = 60; // glisser vers le haut de 60 px = chute instantanée
export const TAP_SLOP_PX = 12; // un toucher qui bouge moins que ça reste un toucher
export const TAP_MS = 300; // et qui dure moins que ça
export const PADDLE_SENSITIVITY = 1.2; // la raquette va un peu plus vite que le doigt
export const PADDLE_KEY_SPEED = 420; // px logiques par seconde au clavier
