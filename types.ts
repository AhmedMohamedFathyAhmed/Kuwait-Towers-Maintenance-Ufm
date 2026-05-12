
export enum TowerName {
  KIPCO = 'Kipco Tower',
  AL_SHAHEED = 'Shaheed Tower',
  AL_MADINA = 'City Tower',
  KBC_PARKING = 'KBC Parking'
}

export enum Category {
  HVAC = 'HVAC',
  ELECTRICAL_FIRE_ALARM = 'ELECTRICAL & FIRE ALARM',
  PLUMBING_FIREFIGHTING = 'PLUMBING & FIREFIGHTING',
  CIVIL_CARPENTRY = 'CIVIL & CARPENTRY',
  FIT_OUT = 'Fit-out'
}

export enum Status {
  DONE = 'Done',
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  WAITING_FOR_PARTS = 'Waiting for Parts',
  OBSERVATION = 'Observation',
  HOLD = 'Hold',
  CANCELLED = 'Cancelled'
}

export type Shift = 'Day' | 'Night';

export interface MaintenanceRecord {
  id: string;
  description: string;
  reasonOfFailure: string; // Can include Ticket No.
  partsReplaced: string;
  location: string;
  category: Category;
  status: Status;
  date: string;
  building: string; // e.g., Kipco Tower
  shift: Shift;
  executedBy: string;
  note: string;
  images?: string[]; // Array of Base64 strings
}

export interface ChecklistItem {
  label: string;
  category: Category;
  defaultReason?: string;
  defaultParts?: string;
}

export interface ReportHeaderInfo {
  preparedBy: string;
  daySupervisor: string;
  nightSupervisor: string;
  reportDate: string;
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  description: string; // Item Name/Desc
  category: Category | string;
  made: string; // Country or Brand
  unit: string; // pcs, kg, etc.
  
  requiredQty: number; // The target/min level
  receivedQty: number; // Total bought/entered
  issuedQty: number;   // Total used/dispensed
  // availableQty is calculated: receivedQty - issuedQty
  
  rackNo: string;
  remarks: string;
  lastUpdated: string;
}

// Internal Transaction Interface for Audit Trail
export interface ExternalTransaction {
  id: string;
  itemId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  transUnit: string; // The unit used IN THIS TRANSACTION (e.g. 'EACH' vs 'SET')
  date: string;
  building: string; // Tower allocation
  reference: string; // Invoice No (IN) or Floor/Site (OUT)
  party: string; // Supplier (IN) or Receiver (OUT)
  companyId: string; // Added Company ID
  remarks: string;
  timestamp: number;
}
