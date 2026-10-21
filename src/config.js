// Toutes les mesures du jeu, en pixels « logiques ».
// Le jeu est dessiné sur un écran imaginaire de 360 × 640, puis agrandi
// pour remplir le vrai écran. Changer un réglage ici suffit à le changer partout.

export const VIEW_W = 360;
export const VIEW_H = 640;

// Pas de temps fixe de la physique : 120 mises à jour par seconde,
// quelle que soit la vitesse d'affichage du téléphone.
export const STEP = 1 / 120;
