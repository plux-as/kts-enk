
export interface ChecklistItem {
  id: string;
  name: string;
  categoryId: string;
}

export interface ChecklistCategory {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export interface Soldier {
  id: string;
  name: string;
  role: string;
}

export interface SquadSettings {
  squadName: string;
  soldiers: Soldier[];
}

export interface ItemStatus {
  soldierId: string;
  status: 'fulfilled' | 'missing' | 'unchecked';
  description?: string;
}

export interface SessionItemData {
  categoryId: string;
  itemId: string;
  statuses: ItemStatus[];
}

export interface ChecklistSession {
  id: string;
  date: string;
  timestamp: number;
  squadName: string;
  soldiers: Soldier[];
  data: SessionItemData[];
}

export interface SessionSummary {
  id: string;
  date: string;
  timestamp: number;
  squadName: string;
  soldierSummaries: SoldierSummary[];
}

export interface SoldierSummary {
  soldier: Soldier;
  missingItems: MissingItem[];
}

export interface MissingItem {
  categoryName: string;
  itemName: string;
  description?: string;
}
