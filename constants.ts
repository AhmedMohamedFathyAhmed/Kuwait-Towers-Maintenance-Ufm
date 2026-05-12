import { Category, ChecklistItem, TowerName, Shift } from './types';

export const TOWERS = [
  TowerName.KIPCO,
  TowerName.AL_SHAHEED,
  TowerName.AL_MADINA,
  TowerName.KBC_PARKING
];

export const CATEGORIES = [
  Category.HVAC,
  Category.ELECTRICAL_FIRE_ALARM,
  Category.PLUMBING_FIREFIGHTING,
  Category.CIVIL_CARPENTRY,
  Category.FIT_OUT
];

export const SHIFTS: Shift[] = ['Day', 'Night'];

// Initial seeds for the autocomplete history
export const DEFAULT_LOCATIONS = [
  "All Mechanical Floors",
  "Outside Towers",
  "Basement 1",
  "Basement 2",
  "Ground Floor",
  "Roof Top",
  "Pump Room",
  "Main Entrance",
  "KBC Parking Entrance",
  "3rd Floor",
  "57th Floor",
  "Offices Area"
];

export const DEFAULT_REASONS = [
  "As per routine check",
  "As per PPM schedule",
  "Wear and tear",
  "Broken / Damaged",
  "Water leakage",
  "Short circuit",
  "End of life",
  "Tenant Request",
  "System Error",
  "Door was not closing",
  "Mechanism jammed"
];

export const DEFAULT_PARTS = [
  "None",
  "-",
  "LED Bulb 9W",
  "Door Handle Kit",
  "Door Closer",
  "Marble Slab",
  "Rubber Washer",
  "Silicon Sealant",
  "60x60 Ceiling Tile",
  "Fan Motor",
  "Capacitor"
];

export const DEFAULT_EXECUTED_BY = [
  "UFM Technicians",
  "Abdulrahman",
  "Uttam",
  "Mohammed Arif",
  "Mehtab Alam",
  "Contractor Team"
];

// This is the "Checklist" database for the Description field.
export const COMMON_TASKS: ChecklistItem[] = [
  // CIVIL & CARPENTRY
  { 
    label: "Replaced broken marble", 
    category: Category.CIVIL_CARPENTRY, 
    defaultReason: "Marble was broken / Damaged",
    defaultParts: "Marble Slab"
  },
  { 
    label: "Repaired door handle", 
    category: Category.CIVIL_CARPENTRY, 
    defaultReason: "Mechanism jammed",
    defaultParts: "Door Handle Kit"
  },
  { 
    label: "Repaired door closing mechanism", 
    category: Category.CIVIL_CARPENTRY, 
    defaultReason: "Door was not closing",
    defaultParts: "Door Closer"
  },
  { 
    label: "Painting touch-up", 
    category: Category.CIVIL_CARPENTRY, 
    defaultReason: "Scratches on wall",
    defaultParts: "Paint, Brushes"
  },
  { 
    label: "Replaced ceiling tile", 
    category: Category.CIVIL_CARPENTRY, 
    defaultReason: "Water damage / Stain",
    defaultParts: "60x60 Ceiling Tile"
  },

  // HVAC
  { 
    label: "Routine Check: Mechanical Floors", 
    category: Category.HVAC, 
    defaultReason: "As per routine check",
    defaultParts: "None"
  },
  { 
    label: "Cleaned AHU filters", 
    category: Category.HVAC, 
    defaultReason: "Routine Maintenance",
    defaultParts: "-"
  },
  { 
    label: "Replaced FCU motor", 
    category: Category.HVAC, 
    defaultReason: "Motor burnt out",
    defaultParts: "Fan Motor"
  },
  { 
    label: "Weekly PPM carried out", 
    category: Category.HVAC, 
    defaultReason: "As per PPM schedule",
    defaultParts: "None"
  },

  // ELECTRICAL
  { 
    label: "Routine Check: Outside Tower Lights", 
    category: Category.ELECTRICAL_FIRE_ALARM, 
    defaultReason: "As per routine check",
    defaultParts: "None"
  },
  { 
    label: "Replaced burnt light bulb", 
    category: Category.ELECTRICAL_FIRE_ALARM, 
    defaultReason: "End of life",
    defaultParts: "LED Bulb 9W"
  },
  { 
    label: "Reset tripped breaker", 
    category: Category.ELECTRICAL_FIRE_ALARM, 
    defaultReason: "Overload",
    defaultParts: "-"
  },

  // PLUMBING
  { 
    label: "Checked and drained hose reel pipe", 
    category: Category.PLUMBING_FIREFIGHTING, 
    defaultReason: "Water leakage in fire cabinet",
    defaultParts: "None"
  },
  { 
    label: "Fixed leaking faucet", 
    category: Category.PLUMBING_FIREFIGHTING, 
    defaultReason: "Worn washer",
    defaultParts: "Rubber Washer"
  },
  { 
    label: "Unclogged drain", 
    category: Category.PLUMBING_FIREFIGHTING, 
    defaultReason: "Debris blockage",
    defaultParts: "Chemical Cleaner"
  },

  // FIT-OUT
  { 
    label: "Partition wall adjustment", 
    category: Category.FIT_OUT, 
    defaultReason: "Tenant Request",
    defaultParts: "Gypsum screws"
  },
];