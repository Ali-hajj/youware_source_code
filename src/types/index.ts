export interface Venue {
  id: string;
  name: string;
  type: string;
  color: string;
  icon?: string;
}

export type VenueType = 'restaurant' | 'bar' | 'banquet' | string;

export type EventStatus = 'confirmed' | 'pending' | 'cancelled' | 'closed';

export type PaymentMethod = 'cash' | 'credit_card' | 'check';

export type PaymentStatus = 'paid' | 'unpaid';

export type DiscountType = 'percentage' | 'fixed';

export type PricingMode = 'person' | 'menu' | 'custom';

export type UserRole = 'admin' | 'manager' | 'host' | 'operator';

export interface AppUser {
  id: string;
  username: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  isDefaultAdmin?: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  method: PaymentMethod | string; // Allow custom payment methods
  date: string;
  notes?: string;
}

export interface PricingDetails {
  mode: PricingMode;
  menuItems: MenuItem[];
  personCount: number;
  pricePerPerson: number;
  customPlatters: MenuItem[]; // For custom pricing mode
  subtotal: number;
  discount: {
    type: DiscountType;
    value: number;
    amount: number;
  };
  taxRate: number;
  taxAmount: number;
  includeTax: boolean;
  total: number;
  deposits: PaymentRecord[];
  amountPaid: number;
  remainingBalance: number;
}

export interface EventUserSummary {
  userId: string;
  displayName?: string | null;
  role?: UserRole | null;
}

export interface Event {
  id: string;
  title: string;
  venue: VenueType;
  venueId?: string; // ID reference for custom venues
  color?: string; // Custom event color
  date: string; // ISO date string
  startTime: string; // 24-hour format HH:mm
  endTime: string; // 24-hour format HH:mm
  status: EventStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | string;
  contact: {
    name: string;
    phone: string;
    email: string;
  };
  pricing?: PricingDetails;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: EventUserSummary;
  updatedBy?: EventUserSummary;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface EventFilters {
  venue?: VenueType;
  status?: EventStatus;
  paymentStatus?: PaymentStatus;
  searchQuery?: string;
  dateRange?: DateRange;
}

export interface EventStats {
  confirmed: number;
  pending: number;
  cancelled: number;
  closed: number;
  paid: number;
  unpaid: number;
  totalRevenue: number;
  totalOutstanding: number;
}

export interface PaymentAnalytics {
  totalPaid: number;
  totalUnpaid: number;
  totalDeposits: number;
  averageEventValue: number;
  paymentMethodBreakdown: Record<PaymentMethod, number>;
  dailyRevenue: Record<string, number>;
  monthlyRevenue: Record<string, number>;
  yearlyRevenue: Record<string, number>;
}

export interface AppSettings {
  storeName: string;
  storeEmail?: string;
  storePhone?: string;
  storeAddress?: string;
  applicationTitle: string;
  applicationSubtitle: string;
  logo?: string;
  selectedVenue?: string;
  themeColor: string;
  backgroundColor: string;
  textColor: string;
  highlightTextColor: string;
  dbHost?: string;
  dbUser?: string;
  dbPassword?: string;
  dbName?: string;
}

export type LicensePlanType = 'monthly' | 'yearly';
export type LicenseStatus = 'active' | 'expired' | 'disabled';

export interface License {
  id: string;
  serialNumber: string;
  userName: string;
  planType: LicensePlanType;
  startDate: string;
  expiryDate: string;
  status: LicenseStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseCheckResult {
  valid: boolean;
  reason?: string;
  user?: string;
  expiry?: string;
  plan?: LicensePlanType;
  status?: LicenseStatus;
}

export interface ColorPreset {
  id: string;
  name: string;
  color: string;
}

export interface InvoiceData {
  eventId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address?: string;
  };
  eventDetails: {
    title: string;
    date: string;
    time: string;
    venue: string;
  };
  lineItems: MenuItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  amountPaid: number;
  remainingBalance: number;
  notes?: string;
  terms?: string;
}

export interface CalendarShare {
  id: string;
  name: string;
  email: string;
  permissions: 'view' | 'edit';
  createdAt: string;
  lastSyncAt?: string;
  active: boolean;
}