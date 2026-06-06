// Shared singleton — holds the selected ship across scene transitions.
export const SHIPS = [
  { key: 'ship_marauder',     name: 'MARAUDER',     url: 'assets/ships/marauder.png' },
  { key: 'ship_nighthawk',    name: 'NIGHTHAWK',    url: 'assets/ships/nighthawk.png' },
  { key: 'ship_prospector',   name: 'PROSPECTOR',   url: 'assets/ships/prospector.png' },
  { key: 'ship_tempest',      name: 'TEMPEST',      url: 'assets/ships/tempest.png' },
  { key: 'ship_leviathan',    name: 'LEVIATHAN',    url: 'assets/ships/leviathan.png' },
  { key: 'ship_hornet',       name: 'HORNET',       url: 'assets/ships/hornet.png' },
  { key: 'ship_leviathan_16', name: 'LEVIATHAN 16C',url: 'assets/ships/16c/leviathan.png' },
  { key: 'ship_nighthawk_16', name: 'NIGHTHAWK 16C',url: 'assets/ships/16c/nighthawk.png' },
];

// Index into SHIPS; defaults to 0 (MARAUDER).
let selectedIndex = 0;

export function getSelectedShip() {
  if (selectedIndex === null) return null;
  return SHIPS[selectedIndex];
}

export function setSelectedShipIndex(i) {
  selectedIndex = i;
}

export function getSelectedShipIndex() { return selectedIndex; }
