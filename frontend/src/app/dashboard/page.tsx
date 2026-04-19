'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Recycle, Plus, Clock, CheckCircle2, Truck, XCircle, LogOut,
  Package, CalendarDays, MapPin, ChevronRight, Inbox, Filter, Home, Loader2,
} from 'lucide-react';
import { getMyRequests, logoutUser } from '@/lib/api';

type RequestStatus = 'PENDING' | 'CONFIRMED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

const statusConfig: Record<RequestStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  PENDING:    { label: 'Чакаща',     color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20',   icon: Clock },
  CONFIRMED:  { label: 'Потвърдена', color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20',    icon: CheckCircle2 },
  IN_TRANSIT: { label: 'В транзит',  color: 'text-purple-400',  bg: 'bg-purple-400/10',  border: 'border-purple-400/20',  icon: Truck },
  COMPLETED:  { label: 'Завършена',  color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: CheckCircle2 },
  CANCELLED:  { label: 'Отменена',   color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20',     icon: XCircle },
};

const filterOptions = [
  { value: 'all', label: 'Всички' },
  { value: 'PENDING', label: 'Чакащи' },
  { value: 'CONFIRMED', label: 'Потвърдени' },
  { value: 'IN_TRANSIT', label: 'В транзит' },
  { value: 'COMPLETED', label: 'Завършени' },
  { value: 'CANCELLED', label: 'Отменени' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['myRequests'],
    queryFn: getMyRequests,
  });

  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => router.push('/'),
  });

  const filtered = filter === 'all' ? requests : requests.filter((r: any) => r.status === filter);

  const stats = {
    total: requests.length,
    active: requests.filter((r: any) => ['PENDING', 'CONFIRMED', 'IN_TRANSIT'].includes(r.status)).length,
    completed: requests.filter((r: any) => r.status === 'COMPLETED').length,
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[35%] h-[35%] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

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
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-sm">
            <Home size={16} /> Начало
          </Link>
          <button
            onClick={() => logoutMutation.mutate()}
            className="flex items-center gap-2 text-muted-foreground hover:text-red-400 transition-colors text-sm"
          >
            <LogOut size={16} /> Изход
          </button>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-12 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10 animate-slide-up">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
              Вашите <span className="heading-gradient">Заявки</span>
            </h1>
            <p className="text-muted-foreground text-lg">Следете и управлявайте заявките си за рециклиране.</p>
          </div>
          <Link
            href="/dashboard/new-request"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 whitespace-nowrap self-start sm:self-auto"
          >
            <Plus size={18} /> Нова Заявка
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          {[
            { label: 'Общо заявки', value: stats.total, icon: Package, color: 'text-primary', bg: 'bg-primary/15' },
            { label: 'Активни', value: stats.active, icon: Clock, color: 'text-accent', bg: 'bg-accent/15' },
            { label: 'Завършени', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="glass-card rounded-2xl p-6 flex items-center gap-4">
              <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon size={22} className={color} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
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

        <div className="flex flex-col gap-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          {isLoading ? (
            <div className="glass-card rounded-2xl p-16 flex items-center justify-center">
              <Loader2 size={40} className="animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-center">
              <Inbox size={48} className="text-muted-foreground/40 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Няма намерени заявки</h3>
              <p className="text-muted-foreground max-w-sm">
                {filter === 'all'
                  ? 'Все още нямате заявки. Кликнете „Нова Заявка" за да започнете!'
                  : `Няма заявки със статус "${filterOptions.find((o) => o.value === filter)?.label}".`}
              </p>
            </div>
          ) : (
            filtered.map((request: any) => {
              const status = statusConfig[request.status as RequestStatus];
              const StatusIcon = status.icon;
              const itemsCount = request.items?.reduce((s: number, i: any) => s + i.quantity, 0) ?? 0;

              return (
                <Link key={request.id} href={`/dashboard/${request.id}`} className="glass-card rounded-2xl p-6 hover:-translate-y-0.5 transition-all duration-300 group block">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Recycle size={22} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h3 className="text-white font-semibold truncate">
                            {request.address?.district?.name ?? 'Неизвестен район'}
                          </h3>
                          <span className="text-xs text-muted-foreground font-mono bg-secondary/60 px-2 py-0.5 rounded">
                            {request.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          {request.scheduledDate && (
                            <span className="flex items-center gap-1.5">
                              <CalendarDays size={14} />
                              {new Date(request.scheduledDate).toLocaleDateString('bg-BG', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <MapPin size={14} />
                            {request.address?.street} {request.address?.buildingNumber}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Package size={14} />
                            {itemsCount} бр. • {request.estimatedTotalWeight?.toFixed(1)} кг
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:flex-shrink-0">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${status.bg} ${status.color} border ${status.border}`}>
                        <StatusIcon size={14} />
                        {status.label}
                      </div>
                      <ChevronRight size={20} className="text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 hidden sm:block" />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
