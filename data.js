// Tout le contenu du site est ici : modifie ce fichier, le reste s'adapte.

export const GITHUB_USER = "TimLeRider";

// Dépôts à ne pas afficher dans la section « Sur GitHub ».
export const HIDDEN_REPOS = ["TimLeRider"];

// Descriptions affichées dans « Sur GitHub ». Elles ont priorité sur la description du dépôt.
// Clé = nom exact du dépôt.
export const REPO_DESCRIPTIONS = {
  "badge-reminder": "Outil personnel et indépendant : il calcule, à partir de la date de votre dernier badgeage et du délai que vous choisissez, le nombre de jours qu'il vous reste. Aucune connexion à un système externe : tout repose sur les dates et délais que vous saisissez.",
  "TimLeRider.github.io": "Mon portfolio, développé en HTML, CSS et JavaScript et déployé avec GitHub Actions.",
};

export const DIFF = [
  { t: "hunk", text: "@@ parcours @@" },
  { t: "del", text: "électrotechnique, automatismes, mécatronique" },
  { t: "add", text: "développeur full-stack" },
  { t: "del", text: "automates, LabWindows/CVI" },
  { t: "add", text: "React, TypeScript, Electron, PHP, Python" },
  { t: "ctx", text: "Toulouse, Skyincap, depuis 2025" },
];

export const TIMELINE = [
  {
    when: "Oct. 2025 – aujourd’hui",
    role: "Développeur logiciels",
    org: "Skyincap, Toulouse",
    text: "Éditeur de documents desktop conçu avec Airbus (Electron, TypeScript, Editor.js), avec un moteur de comparaison de versions basé sur Git en local pour visualiser les différences entre documents. Je rédige parfois de la documentation pour le projet, et je travaille avec Jenkins, AWS (infrastructure as code) et des API dans ce cadre.",
  },
  {
    when: "Oct. 2023 – oct. 2025",
    role: "Alternant, Bachelor Concepteur développeur d’applications",
    org: "Skyincap, Toulouse",
    text: "Refonte complète du site Skyincap, site vitrine Guidor en PHP, et application de flashcards pour la Langue des Signes Française en React et Django, de la conception à la mise en ligne.",
  },
  {
    when: "Juin – juil. 2023",
    role: "Stage en développement web",
    org: "ARCESI-EA, Blagnac",
    text: "Module du portail interne de l’entreprise en C# et ASP.NET Core.",
  },
  {
    when: "Sept. 2021 – sept. 2022",
    role: "Alternant, licence pro mécatronique et robotique",
    org: "ACOME, Romagny-Fontenay",
    text: "Amélioration des systèmes de contrôle des process et mise en place d’un système prédictif pour la disponibilité des machines, en LabWindows/CVI et Python.",
  },
];

export const EDUCATION = [
  "Bachelor Concepteur développeur d’applications, CFA FormaSup ARL (2023 – 2025)",
  "Webdesigner, Signes et Formations, Toulouse (2023)",
  "Licence pro Mécatronique et robotique, IUT de Rennes (2021 – 2022)",
  "BTS Conception et réalisation de systèmes automatiques, Rennes (2019 – 2021)",
  "Bac pro Métiers de l’électricité et de ses environnements connectés (2016 – 2019)",
];

export const SKILLS = {
  Front: ["React.js", "TypeScript", "JavaScript", "HTML/CSS"],
  Back: ["PHP", "Python", "Django", "C# / ASP.NET Core", "Firebase"],
  Desktop: ["Electron", "Editor.js", "Git"],
  "DevOps et cloud": ["Jenkins", "AWS", "API"],
  Industriel: ["LabWindows/CVI", "EcoStruxure"],
};

export const PROJECTS = [
  {
    name: "Éditeur de documents desktop",
    meta: "Skyincap pour Airbus, depuis 2025",
    text: "Application Electron avec un moteur de comparaison de versions basé sur Git, exécuté en local. Sur ce projet, je rédige parfois de la documentation pour bien le préparer, et je travaille avec Jenkins, AWS (infrastructure as code) et des API.",
    tech: ["Electron", "TypeScript", "Editor.js", "Git", "Jenkins", "AWS", "API"],
  },
  {
    name: "Refonte du site Skyincap",
    meta: "Alternance, 2023 – 2025",
    text: "Conception, développement et mise en ligne du site de l’entreprise, versionné avec Git.",
    tech: ["JavaScript", "HTML/CSS", "Git"],
  },
  {
    name: "Site vitrine Guidor",
    meta: "Alternance, 2023 – 2025",
    text: "Site responsive en PHP, pris en charge de bout en bout et versionné avec Git.",
    tech: ["PHP", "JavaScript", "HTML/CSS", "Git"],
  },
  {
    name: "Flashcards LSF",
    meta: "Alternance, 2023 – 2025",
    text: "Application web d’apprentissage de la Langue des Signes Française, front-end et back-end, avec Firebase et Git.",
    tech: ["React.js", "Django", "Python", "Firebase", "Git"],
  },
  {
    name: "Maintenance prédictive",
    meta: "ACOME, 2021 – 2022",
    text: "Système prédictif pour améliorer la disponibilité et la fiabilité des machines de production.",
    tech: ["LabWindows/CVI", "Python"],
  },
  {
    name: "Module de portail interne",
    meta: "ARCESI-EA, stage 2023",
    text: "Module intégré au portail de l’entreprise, de la conception à l’implémentation.",
    tech: ["C# / ASP.NET Core"],
  },
];

// Icônes Devicon (jsDelivr). Les technologies sans icône reçoivent une pastille avec leur initiale.
const DEV = "https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons";
export const ICONS = {
  "React.js": `${DEV}/react/react-original.svg`,
  "TypeScript": `${DEV}/typescript/typescript-original.svg`,
  "JavaScript": `${DEV}/javascript/javascript-original.svg`,
  "HTML/CSS": `${DEV}/html5/html5-original.svg`,
  "PHP": `${DEV}/php/php-original.svg`,
  "Python": `${DEV}/python/python-original.svg`,
  "Django": `${DEV}/django/django-plain.svg`,
  "Firebase": `${DEV}/firebase/firebase-original.svg`,
  "C# / ASP.NET Core": `${DEV}/csharp/csharp-original.svg`,
  "Electron": `${DEV}/electron/electron-original.svg`,
  "Git": `${DEV}/git/git-original.svg`,
  "Jenkins": `${DEV}/jenkins/jenkins-original.svg`,
  "AWS": `${DEV}/amazonwebservices/amazonwebservices-plain.svg`,
};
