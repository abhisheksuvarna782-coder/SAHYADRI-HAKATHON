import { format, formatDistanceToNow, parseISO } from 'date-fns';
import axios from 'axios';
import type { BookingStatus, DisruptionType, RecoveryStatus, TransportType } from '@/types';

export function apiErrorMessage(error: unknown, fallback = 'The request could not be completed.'): string {
  if (axios.isAxiosError(error)) {
    const detail: unknown = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function fmt(dateStr?: string | null, pattern = 'dd MMM yyyy, HH:mm'): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), pattern);
  } catch {
    return dateStr;
  }
}

export function fmtTime(dateStr?: string | null): string {
  return fmt(dateStr, 'HH:mm');
}

export function fmtDate(dateStr?: string | null): string {
  return fmt(dateStr, 'dd MMM yyyy');
}

export function fmtRelative(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function fmtDuration(minutes?: number): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function fmtINR(amount?: number): string {
  if (amount === undefined || amount === null) return '₹—';
  const sign = amount < 0 ? '-' : '';
  return `${sign}₹${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function bookingStatusLabel(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = {
    confirmed: 'Confirmed',
    disrupted: 'Disrupted',
    potentially_affected: 'At Risk',
    cancelled: 'Cancelled',
    completed: 'Completed',
    needs_verification: 'Verify',
  };
  return labels[status] || status;
}

export function bookingStatusClass(status: BookingStatus): string {
  const classes: Record<BookingStatus, string> = {
    confirmed: 'badge-confirmed',
    disrupted: 'badge-disrupted',
    potentially_affected: 'badge-affected',
    cancelled: 'badge-rejected',
    completed: 'badge-confirmed',
    needs_verification: 'badge-affected',
  };
  return classes[status] || 'badge';
}

export function recoveryStatusLabel(status: RecoveryStatus): string {
  const labels: Record<RecoveryStatus, string> = {
    pending: 'Pending',
    processing: 'Processing',
    proposed: 'Awaiting Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    expired: 'Expired',
  };
  return labels[status] || status;
}

export function recoveryStatusClass(status: RecoveryStatus): string {
  const classes: Record<RecoveryStatus, string> = {
    pending: 'badge-processing',
    processing: 'badge-processing',
    proposed: 'badge-proposed',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    expired: 'badge-rejected',
  };
  return classes[status] || 'badge';
}

export function transportIcon(type?: TransportType | string): string {
  const icons: Record<string, string> = {
    flight: '✈️',
    train: '🚆',
    bus: '🚌',
    car: '🚗',
    ferry: '⛴️',
  };
  return icons[type || ''] || '🚀';
}

export function disruptionTypeLabel(type: DisruptionType | string): string {
  const labels: Record<string, string> = {
    flight_cancellation: 'Flight Cancellation',
    flight_delay: 'Flight Delay',
    train_delay: 'Train Delay',
    bus_cancellation: 'Bus Cancellation',
    hotel_cancellation: 'Hotel Cancellation',
    train_cancellation: 'Train Cancellation',
  };
  return labels[type] || type;
}

export function scoreColor(score: number): string {
  if (score >= 0.7) return 'text-success-500';
  if (score >= 0.4) return 'text-warning-500';
  return 'text-danger-500';
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
