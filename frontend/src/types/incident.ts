export type IncidentStatus = 'Pending' | 'Verified' | 'Resolved';

export interface Incident {
  id: number;
  foodItem: string;
  user: string;
  date: string;
  predicted: number;
  actual: number | null;
  status: IncidentStatus;
  image: string;
  note?: string;
}
