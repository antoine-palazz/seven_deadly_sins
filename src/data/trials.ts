export interface Trial {
  id: string;
  index: number;
  name: string;
  sin: string;
  subtitle: string;
  description: string;
  color: string;
  icon: string;
  fragment: number;
  fragmentHint: string;
  reversed: boolean;
}

export const TRIALS: Trial[] = [
  {
    id: 'orgueil',
    index: 0,
    name: 'Orgueil',
    sin: 'L\'Illusion du Contrôle',
    subtitle: 'Premier Péché',
    description:
      'Antoine croyait tout maîtriser. Pour le sauver, prouve que tu vois au-delà des apparences. Certains nombres mentent — un imposteur clignote toujours vers le même autre nombre. Trouve-les avant que le temps ne s\'écoule.',
    color: '#C0A000',
    icon: '👑',
    fragment: 37,
    fragmentHint: 'Gravé dans le miroir de l\'orgueil',
    reversed: false,
  },
  {
    id: 'avarice',
    index: 1,
    name: 'Avarice',
    sin: 'L\'Algorithme de la Cupidité',
    subtitle: 'Deuxième Péché',
    description:
      'L\'avidité a consumé Antoine. Pour briser cette chaîne, accumule assez de points sans tout perdre. Chaque choix rapproche de la victoire... ou de l\'effondrement.',
    color: '#2E8B57',
    icon: '💰',
    fragment: 64,
    fragmentHint: 'Inscrit dans le grand livre de la corruption',
    reversed: false,
  },
  {
    id: 'luxure',
    index: 2,
    name: 'Luxure',
    sin: 'Le Labyrinthe des Distractions',
    subtitle: 'Troisième Péché',
    description:
      'Antoine s\'est égaré dans un dédale de désirs. Traverse ce labyrinthe mouvant pour le retrouver. Seuls les nombres premiers sont des pas sûrs — un faux pas et l\'obscurité t\'engloutit.',
    color: '#DC143C',
    icon: '🌹',
    fragment: 19,
    fragmentHint: 'Coordonnées gravées dans un cœur fracturé',
    reversed: false,
  },
  {
    id: 'envie',
    index: 3,
    name: 'Envie',
    sin: 'L\'Épreuve de la Comparaison',
    subtitle: 'Quatrième Péché',
    description:
      'Des fantômes d\'Antoine te défient. Ils sont rapides, précis, impitoyables. Surpasse-les en vitesse et en acuité pour prouver que tu mérites de le sauver.',
    color: '#4B0082',
    icon: '👁',
    fragment: 51,
    fragmentHint: 'Un nombre inversé — retourne-le quand viendra le jugement',
    reversed: true,
  },
  {
    id: 'gourmandise',
    index: 4,
    name: 'Gourmandise',
    sin: 'Le Puzzle de l\'Excès',
    subtitle: 'Cinquième Péché',
    description:
      'L\'excès dévore Antoine. Maintiens l\'équilibre entre la famine et la surcharge. Absorbe les bons nombres, évite les poisons, et survis assez longtemps pour le délivrer.',
    color: '#D2691E',
    icon: '🍷',
    fragment: 82,
    fragmentHint: 'Dissimulé sous l\'indice calorique',
    reversed: false,
  },
  {
    id: 'colere',
    index: 5,
    name: 'Colère',
    sin: 'L\'Épreuve de la Précision',
    subtitle: 'Sixième Péché',
    description:
      'La rage aveugle Antoine. Pour le calmer, frappe les cibles avec une précision chirurgicale. Chaque erreur alimente sa fureur. Ignore les leurres. Vise juste.',
    color: '#FF4500',
    icon: '🔥',
    fragment: 45,
    fragmentHint: 'Fragment caché dans la pierre fissurée',
    reversed: false,
  },
  {
    id: 'paresse',
    index: 6,
    name: 'Paresse',
    sin: 'La Chambre de Distorsion Temporelle',
    subtitle: 'Septième Péché',
    description:
      'Antoine sombre dans l\'inertie. Le temps se distord autour de lui. Résous cette grille logique avant que le temps ne s\'effondre — mais méfie-toi, tout ment dans cette chambre.',
    color: '#708090',
    icon: '⏳',
    fragment: 23,
    fragmentHint: 'Dernier fragment gravé dans la poussière évanescente',
    reversed: false,
  },
];

export const SIN_ORDER = [
  'orgueil',
  'avarice',
  'luxure',
  'envie',
  'gourmandise',
  'colere',
  'paresse',
] as const;

export type SinId = (typeof SIN_ORDER)[number];
