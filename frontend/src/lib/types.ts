export type RequestStatus = 'PENDING' | 'CONFIRMED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface District {
  id: string;
  name: string;
}

export interface ElectronicsItem {
  id: string;
  name: string;
  category: string;
  defaultWeight: number;
}

export interface RequestItem {
  id: string;
  electronicsItem?: { name: string; category: string };
  quantity: number;
  estimatedWeight?: number;
}

export interface AvailabilityPreference {
  id: string;
  preferenceType: string;
  value?: string;
}

export interface AvailabilitySlot {
  id: string;
  availableDate: string;
  timeFrom: string;
  timeTo: string;
}

export interface PickupRequest {
  id: string;
  status: RequestStatus;
  user?: { name: string; email: string; phoneNumber?: string };
  address?: {
    district?: { name: string };
    city?: string;
    street: string;
    buildingNumber: string;
    entrance?: string;
    floor?: string;
    apartment?: string;
    additionalNotes?: string;
  };
  items?: RequestItem[];
  estimatedTotalWeight?: number;
  scheduledDate?: string;
  scheduledTimeFrom?: string;
  scheduledTimeTo?: string;
  availabilityPreferences?: AvailabilityPreference[];
  availabilitySlots?: AvailabilitySlot[];
  preferredNote?: string;
}

export interface RouteStop {
  id: string;
  request?: { address?: { street?: string; buildingNumber?: string } };
}

export interface RouteResult {
  stops?: RouteStop[];
  totalEstimatedWeight?: number;
}

export type SchedulerStatus =
  | 'ROUTE_CREATED'
  | 'WAITING'
  | 'WAITING_EXTENDED'
  | 'IN_PROGRESS'
  | 'EMAILS_SENT';

// Shape returned by POST /admin/scheduler/run/:districtId. Which fields are
// present depends on the branch the algorithm took.
export interface SchedulerResult {
  status: SchedulerStatus;
  message?: string;
  currentVol?: number;
  routeId?: string;
  mainCount?: number;
  reserveCount?: number;
  count?: number;
  routeAgeDays?: number;
}
