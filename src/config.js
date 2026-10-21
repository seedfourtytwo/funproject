// Toutes les mesures du jeu, en pixels « logiques ».
// Le jeu est dessiné sur un écran imaginaire de 360 de large, puis agrandi
// pour remplir le vrai écran. Changer un réglage ici suffit à le changer partout.

export const VIEW_W = 360;
// La hauteur s'adapte à la forme du téléphone (de 640 à 780), pour éviter les
// grandes bandes noires sur les écrans allongés. Le haut du jeu ne bouge pas :
// seule la prairie de la raquette s'allonge. Calculée une fois au démarrage.
const screenRatio = typeof window === 'undefined' ? 0 : window.innerHeight / window.innerWidth;
export const VIEW_H = 2 * Math.round(Math.min(780, Math.max(640, VIEW_W * screenRatio)) / 2); // pair : 1 pixel d'art = 2 px

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
export const PADDLE_Y = VIEW_H - 44; // haut de la raquette
export const BALL_R = 4;
export const BALL_SPEED = 260; // px par seconde au départ
export const LAUNCH_DELAY = 1; // secondes posée sur la raquette avant de partir
export const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60° depuis la verticale, au bord de la raquette

// Les bonus qui tombent des briques cassées.
export const ITEM_SIZE = 16;
export const ITEM_FALL_SPEED = 110; // px par seconde
export const BIG_PADDLE_W = 84; // champignon : planche plus large...
export const BIG_PADDLE_TIME = 12; // ... pendant 12 s
export const STAR_TIME = 6; // étoile : la fée traverse tout pendant 6 s
export const MAX_LIVES = 5; // cœur : une vie de plus, jusqu'à 5

// Les deux joysticks, en pixels d'écran (ce que le pouce ressent, quelle que
// soit la taille du téléphone). Ils apparaissent là où le pouce se pose :
// moitié gauche de l'écran = la pièce, moitié droite = la planche.
export const STICK_RADIUS_PX = 50; // course du joystick, du centre au bord
export const STICK_TRIGGER = 0.5; // pièce : il faut pousser à mi-course pour agir
export const STICK_DEADZONE = 0.12; // planche : en dessous, elle ne bouge pas
export const REPEAT_DELAY = 0.17; // pièce : tenir à gauche ou à droite répète après 0,17 s...
export const REPEAT_RATE = 0.05; // ... puis une colonne toutes les 0,05 s
export const TAP_SLOP_PX = 12; // un toucher qui bouge moins que ça reste un toucher (rotation)
export const TAP_MS = 250; // et qui dure moins que ça
export const PADDLE_STICK_SPEED = 560; // planche à fond : px logiques par seconde
export const PADDLE_KEY_SPEED = 420; // px logiques par seconde au clavier

// Bouton pause, dans le mur de gauche, en haut.
export const PAUSE_BUTTON = { x: 6, y: 64, w: 38, h: 38 };
