// System Type
export enum SystemType {
  COD = 'COD',
  DOM = 'DOM',
}

// Ticket Status Lifecycle
export enum TicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
}

// Ticket Priority
export enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

//Issue Received From
export enum ReceivedFrom {
  CLIENT = 'CLIENT',
  CUSTOMER = 'CUSTOMER',
}

// Knowledge Base Visibility
export enum KbVisibility {
  INTERNAL = 'INTERNAL',
  PUBLIC = 'PUBLIC',
}

// Common Sorting Order
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}
