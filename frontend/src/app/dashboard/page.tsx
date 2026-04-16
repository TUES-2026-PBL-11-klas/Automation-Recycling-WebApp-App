'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Recycle,
  Plus,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  LogOut,
  Package,
  CalendarDays,
  MapPin,
  ChevronRight,
  Inbox,
  Filter,
  Home,
} from 'lucide-react';

// ── Status config: colors & icons ──────────────────────────────────
type RequestStatus = 'pending' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled';

const statusConfig: Record<
  RequestStatus,
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  pending: {
    label: 'Pending',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    icon: CheckCircle2,
  },
  in_transit: {
    label: 'In Transit',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
    icon: Truck,
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
    icon: XCircle,
  },
};

// ── Mock data (replace with real API calls later) ──────────────────
interface RecyclingRequest {
  id: string;
  title: string;
  category: string;
  status: RequestStatus;
  scheduledDate: string;
  location: string;
  itemCount: number;
}

const mockRequests: RecyclingRequest[] = [
  {
    id: 'REQ-001',
    title: 'Old Laptops & Monitors',
    category: 'Electronics',
    status: 'completed',
    scheduledDate: '2026-04-10',
    location: '123 Main Street',
    itemCount: 5,
  },
  {
    id: 'REQ-002',
    title: 'Phone Batteries Collection',
    category: 'Batteries',
    status: 'in_transit',
    scheduledDate: '2026-04-14',
    location: '456 Oak Avenue',
    itemCount: 12,
  },
  {
    id: 'REQ-003',
    title: 'Printer & Cartridges',
    category: 'Electronics',
    status: 'confirmed',
    scheduledDate: '2026-04-18',
    location: '789 Green Blvd',
    itemCount: 3,
  },
  {
    id: 'REQ-004',
    title: 'Desktop Computer Parts',
    category: 'Electronics',
    status: 'pending',
    scheduledDate: '2026-04-22',
    location: '321 Elm Street',
    itemCount: 8,
  },
  {
    id: 'REQ-005',
    title: 'Cables & Wires Bundle',
    category: 'Wiring',
    status: 'cancelled',
    scheduledDate: '2026-04-05',
    location: '654 Pine Road',
    itemCount: 20,
  },
];

// ── Filter options ─────────────────────────────────────────────────
const filterOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All Requests' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ── Component ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');

  const filteredRequests =
    filter === 'all'
      ? mockRequests
      : mockRequests.filter((r) => r.status === filter);

  const stats = {
    total: mockRequests.length,
    active: mockRequests.filter((r) =>
      ['pending', 'confirmed', 'in_transit'].includes(r.status)
    ).length,
    completed: mockRequests.filter((r) => r.status === 'completed').length,
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.push('/');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* ── Background blobs ── */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[35%] h-[35%] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Top nav ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 sm:px-12 py-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
            <Recycle size={22} className="text-primary" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Eco<span className="heading-gradient">Recycle</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-sm"
          >
            <Home size={16} />
            Home
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-muted-foreground hover:text-red-400 transition-colors text-sm"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-12 py-10">
        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10 animate-slide-up">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
              Your <span className="heading-gradient">Requests</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Track and manage your recycling pickup requests.
            </p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 whitespace-nowrap self-start sm:self-auto">
            <Plus size={18} />
            New Request
          </button>
        </div>

        {/* ── Stats cards ── */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10 animate-slide-up"
          style={{ animationDelay: '0.05s' }}
        >
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center">
              <Package size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/15 rounded-xl flex items-center justify-center">
              <Clock size={22} className="text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-white">{stats.active}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={22} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-white">{stats.completed}</p>
            </div>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div
          className="flex items-center gap-3 mb-6 overflow-x-auto pb-2 animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <Filter size={16} className="text-muted-foreground flex-shrink-0" />
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                filter === opt.value
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'bg-secondary/50 text-muted-foreground hover:text-white hover:bg-secondary/80 border border-border/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* ── Request list ── */}
        <div
          className="flex flex-col gap-4 animate-slide-up"
          style={{ animationDelay: '0.15s' }}
        >
          {filteredRequests.length === 0 ? (
            <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-center">
              <Inbox size={48} className="text-muted-foreground/40 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No requests found</h3>
              <p className="text-muted-foreground max-w-sm">
                {filter === 'all'
                  ? "You haven't created any recycling requests yet. Click \"New Request\" to get started!"
                  : `No requests with status "${filterOptions.find((o) => o.value === filter)?.label}".`}
              </p>
            </div>
          ) : (
            filteredRequests.map((request) => {
              const status = statusConfig[request.status];
              const StatusIcon = status.icon;

              return (
                <div
                  key={request.id}
                  className="glass-card rounded-2xl p-6 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Left: Icon + Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Recycle size={22} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h3 className="text-white font-semibold truncate">
                            {request.title}
                          </h3>
                          <span className="text-xs text-muted-foreground font-mono bg-secondary/60 px-2 py-0.5 rounded">
                            {request.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays size={14} />
                            {new Date(request.scheduledDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin size={14} />
                            {request.location}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Package size={14} />
                            {request.itemCount} items
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status + Arrow */}
                    <div className="flex items-center gap-4 sm:flex-shrink-0">
                      <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${status.bg} ${status.color} border ${status.border}`}
                      >
                        <StatusIcon size={14} />
                        {status.label}
                      </div>
                      <ChevronRight
                        size={20}
                        className="text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 hidden sm:block"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
