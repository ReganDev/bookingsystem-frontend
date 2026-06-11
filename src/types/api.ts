export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'

export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF'

export interface User {
  id: string
  businessId: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  phone?: string
  role: UserRole
  isActive: boolean
}

export interface Business {
  id: string
  name: string
  slug: string
  description?: string
  email?: string
  phone?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  timezone?: string
  currency?: string
  logoUrl?: string
  bookingAdvanceDays?: number
  bookingNoticeHours?: number
  cancellationNoticeHours?: number
  slotDurationMinutes?: number
  bufferMinutes?: number
  isActive?: boolean
}

export interface TimeSlot {
  startDatetime: string
  endDatetime: string
}

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY'

export interface ScheduleBreak {
  id?: string
  startTime: string
  endTime: string
  label?: string
}

export interface Schedule {
  id: string
  businessId: string
  userId?: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  isActive: boolean
  breaks: ScheduleBreak[]
}

export interface ScheduleRequest {
  userId?: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  isActive?: boolean
  breaks?: ScheduleBreak[]
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: User
  business: Business
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  businessName: string
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  timezone?: string
  currency?: string
}

export interface Service {
  id: string
  businessId: string
  name: string
  description?: string
  durationMinutes: number
  price?: number
  color?: string
  displayOrder?: number
  isActive: boolean
}

export interface ServiceRequest {
  name: string
  description?: string
  durationMinutes: number
  price?: number
  color?: string
  displayOrder?: number
  isActive?: boolean
}

export interface Customer {
  id: string
  businessId: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  phone?: string
  notes?: string
}

export interface CustomerRequest {
  email: string
  firstName: string
  lastName: string
  phone?: string
  notes?: string
}

export interface Booking {
  id: string
  businessId: string
  status: BookingStatus
  startDatetime: string
  endDatetime: string
  price?: number
  customerNotes?: string
  internalNotes?: string
  customer: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  service: {
    id: string
    name: string
    durationMinutes: number
    price?: number
    color?: string
  }
  staff?: {
    id: string
    firstName: string
    lastName: string
    fullName: string
  }
}

export interface BookingRequest {
  customerId: string
  serviceId: string
  staffId?: string
  startDatetime: string
  customerNotes?: string
  internalNotes?: string
}

export interface PublicBookingRequest {
  customer: CustomerRequest
  serviceId: string
  startDatetime: string
  customerNotes?: string
}

export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface ApiError {
  message?: string
  error?: string
  status?: number
  errors?: Record<string, string>
  fieldErrors?: Record<string, string>
}
