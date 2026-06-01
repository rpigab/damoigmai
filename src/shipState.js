// Shared singleton — holds the selected ship across scene transitions.
export const SHIPS = [
  { key: 'ship_marauder',     name: 'MARAUDER',     url: 'https://rpigab.github.io/pixelagen/sprites/256-dithered/64x64/marauder.png' },
  { key: 'ship_nighthawk',    name: 'NIGHTHAWK',    url: 'https://rpigab.github.io/pixelagen/sprites/256-dithered/64x64/nighthawk.png' },
  { key: 'ship_prospector',   name: 'PROSPECTOR',   url: 'https://rpigab.github.io/pixelagen/sprites/256-dithered/64x64/prospector.png' },
  { key: 'ship_tempest',      name: 'TEMPEST',      url: 'https://rpigab.github.io/pixelagen/sprites/256-dithered/64x64/tempest.png' },
  { key: 'ship_leviathan',    name: 'LEVIATHAN',    url: 'https://rpigab.github.io/pixelagen/sprites/256-dithered/64x64/leviathan.png' },
  { key: 'ship_hornet',       name: 'HORNET',       url: 'https://rpigab.github.io/pixelagen/sprites/256-dithered/64x64/hornet.png' },
  { key: 'ship_leviathan_16', name: 'LEVIATHAN 16C',url: 'https://rpigab.github.io/pixelagen/sprites/16colors/64x64/leviathan.png' },
  { key: 'ship_nighthawk_16', name: 'NIGHTHAWK 16C',url: 'https://rpigab.github.io/pixelagen/sprites/16colors/64x64/nighthawk.png' },
];

// Index into SHIPS; null = use procedural 'player' sprite.
let selectedIndex = null;

export function getSelectedShip() {
  if (selectedIndex === null) return null;
  return SHIPS[selectedIndex];
}

export function setSelectedShipIndex(i) {
  selectedIndex = i;
}

export function getSelectedShipIndex() { return selectedIndex; }
