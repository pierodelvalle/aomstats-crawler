// Trainable myth units per civilization, by in-game name.
const MYTH_UNITS = {
  Greeks: ['Centaur', 'Minotaur', 'Cyclops', 'Lykaon', 'Hydra', 'Manticore', 'Nemean Lion', 'Hamadryad', 'Medusa', 'Colossus', 'Chimera', 'Siren'],
  Egyptians: ['Sphinx', 'Wadjet', 'Anubite', 'Petsuchos', 'Scarab', 'Scorpion Man', 'Mummy', 'Avenger'],
  Norse: ['Valkyrie', 'Troll', 'Einheri', 'Draugr', 'Frost Giant', 'Battle Boar', 'Mountain Giant', 'Rock Giant', 'Fire Giant', 'Fenris Wolf Brood', 'Fafnir'],
  Atlanteans: ['Promethean', 'Automaton', 'Behemoth', 'Satyr', 'Centimanus', 'Argus', 'Lampades'],
  Chinese: ['Qilin', 'Yazi', 'Qiongqi', 'Taowu', 'Taotie', 'Baihu', 'Pixiu', 'Hundun'],
  Japanese: ['Kitsune', 'Kamaitachi', 'Wanyūdō', 'Jorogumo', 'Tengu', 'Raiju', 'Oni', 'Shinigami', 'Asura'],
  Aztecs: ['Centzon Totochtin', 'Maquizcoatl', 'Chaneque', 'Ayotochtli', 'Obsidian Butterfly', 'Tzitzimitl', 'Quinametzin', 'Ahuizotl', 'Tunkuluchu', 'Soul Guide'],
};

// "Wanyūdō" and the parser's "Wanyudo" both become "wanyudo".
const normalize = name => name.normalize('NFD').replace(/[^a-zA-Z]/g, '').toLowerCase();

const MYTH_UNIT_KEYS = new Set(Object.values(MYTH_UNITS).flat().map(normalize));

const isMythUnit = name => MYTH_UNIT_KEYS.has(normalize(name));

export {
  MYTH_UNITS,
  isMythUnit,
};
