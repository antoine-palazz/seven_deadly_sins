# Les Sept Péchés — L'Épreuve d'Antoine

Une expérience immersive de mini-jeux basée sur les sept péchés capitaux. Entièrement en français, avec une atmosphère sombre et psychologique.

## Concept

Le joueur incarne **Antoine**, choisi par une entité mystérieuse pour subir 7 épreuves — chacune représentant un péché capital. Chaque épreuve révèle un fragment numérique. Les 7 fragments combinés forment un code final à présenter lors du **Jugement Final**.

## Les 7 Épreuves

| # | Péché | Mécanique |
|---|-------|-----------|
| 1 | **Orgueil** | Tri de nombres avec détection de faux |
| 2 | **Avarice** | Jeu de risque et accumulation |
| 3 | **Luxure** | Labyrinthe mouvant avec nombres premiers |
| 4 | **Envie** | Défi de réaction contre des fantômes IA |
| 5 | **Gourmandise** | Équilibre d'absorption de nombres |
| 6 | **Colère** | Précision de timing |
| 7 | **Paresse** | Grille logique sous distorsion temporelle |

## Stack Technique

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4** (palette sombre : noir, rouge sang, or mat)
- **Framer Motion** (animations, transitions, glitch)
- **Zustand** (gestion d'état + persistence localStorage)
- **Web Audio API** (drone ambient, battement de cœur, effets)

## Lancer Localement

```bash
# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build production
npm run build && npm start
```

Le site sera accessible sur `http://localhost:3000`.

## Structure du Projet

```
app/                    Pages (App Router)
  page.tsx              Page d'accueil / menu
  trial/[sin]/page.tsx  Pages des épreuves (dynamique)
  judgment/page.tsx     Page du jugement final
src/
  components/           Composants UI réutilisables
  games/                7 mini-jeux indépendants
  store/                Store Zustand (progression)
  utils/                Audio, helpers, fragments
  data/                 Métadonnées des épreuves
```

## Fonctionnalités

- Sauvegarde automatique (localStorage)
- Reprise de progression
- Épreuves débloquées séquentiellement
- Responsive (mobile portrait, paysage, tablette, desktop)
- Support tactile + clavier
- Son ambiental procédural (Web Audio API)
- Bouton mute persistant
- Animations 60fps avec Framer Motion
