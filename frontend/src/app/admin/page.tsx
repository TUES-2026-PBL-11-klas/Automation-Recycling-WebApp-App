'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Recycle, LogOut, Users, Package, Clock, CheckCircle2, Truck, XCircle,
  Trash2, CalendarDays, Filter, Loader2, MapPin, Home, Route, X, Check,
} from 'lucide-react';
import Link from 'next/link';
import {
  adminGetRequests, adminUpdateRequest, adminDeleteRequest,
  adminGetDistricts, adminScheduleRoute, logoutUser,
} from '@/lib/api';
import type { District, PickupRequest, RequestItem, RouteResult, RouteStop } from '@/lib/types';

type RequestStatus = 'PENDING' | 'CONFIRMED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

const statusConfig: Record<RequestStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  PENDING:    { label: 'Чакаща',     color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20',   icon: Clock },
  CONFIRMED:  { label: 'Потвърдена', color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20',    icon: CheckCircle2 },
  IN_TRANSIT: { label: 'В транзит',  color: 'text-purple-400',  bg: 'bg-purple-400/10',  border: 'border-purple-400/20',  icon: Truck },
  COMPLETED:  { label: 'Завършена',  color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: CheckCircle2 },
  CANCELLED:  { label: 'Отменена',   color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20',     icon: XCircle },
};

const STATUS_OPTIONS: RequestStatus[] = ['PENDING', 'CONFIRMED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'];

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');

  // Per-request scheduling
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTimeFrom, setScheduleTimeFrom] = useState('');
  const [scheduleTimeTo, setScheduleTimeTo] = useState('');

  // Schedule Route modal
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeDistrictId, setRouteDistrictId] = useState('');
  const [routeDate, setRouteDate] = useState('');
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['adminRequests', statusFilter, districtFilter],
    queryFn: () => adminGetRequests({ status: statusFilter || undefined, districtId: districtFilter || undefined }),
  });

  const { data: districts = [] } = useQuery({ queryKey: ['adminDistricts'], queryFn: adminGetDistricts });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => adminUpdateRequest(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminRequests'] }); setSchedulingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: adminDeleteRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminRequests'] }),
  });

  const routeMutation = useMutation({
    mutationFn: adminScheduleRoute,
    onSuccess: (data) => {
      setRouteResult(data);
      queryClient.invalidateQueries({ queryKey: ['adminRequests'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => router.push('/'),
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r: PickupRequest) => r.status === 'PENDING').length,
    confirmed: requests.filter((r: PickupRequest) => r.status === 'CONFIRMED').length,
    completed: requests.filter((r: PickupRequest) => r.status === 'COMPLETED').length,
  };

  const handleScheduleRequest = (id: string) => {
    updateMutation.mutate({ id, data: { status: 'CONFIRMED', scheduledDate: scheduleDate || undefined, scheduledTimeFrom: scheduleTimeFrom || undefined, scheduledTimeTo: scheduleTimeTo || undefined } });
  };

  const handleScheduleRoute = () => {
    if (!routeDistrictId || !routeDate) return;
    setRouteResult(null);
    routeMutation.mutate({ districtId: routeDistrictId, routeDate });
  };

  const closeRouteModal = () => { setShowRouteModal(false); setRouteResult(null); setRouteDistrictId(''); setRouteDate(''); };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Schedule Route Modal */}
      {showRouteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeRouteModal} />
          <div className="relative z-10 w-full max-w-md glass-card rounded-3xl p-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/15 rounded-xl flex items-center justify-center">
                  <Route size={20} className="text-accent" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">Насрочи Маршрут</h2>
                  <p className="text-muted-foreground text-xs">Групира потвърдените заявки по квартал</p>
                </div>
              </div>
              <button onClick={closeRouteModal} className="text-muted-foreground hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {routeResult ? (
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-400/20 rounded-xl flex items-start gap-3">
                  <Check size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-emerald-400 font-semibold text-sm">Маршрутът е създаден успешно!</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {routeResult.stops?.length ?? 0} спирки • {routeResult.totalEstimatedWeight?.toFixed(1)} кг общо
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {routeResult.stops?.map((stop: RouteStop, i: number) => (
                    <div key={stop.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border/30 text-sm">
                      <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <span className="text-white">
                        {stop.request?.address?.street} {stop.request?.address?.buildingNumber}
                      </span>
                    </div>
                  ))}
                </div>
                <button onClick={closeRouteModal} className="w-full py-3 bg-accent/20 text-accent border border-accent/30 rounded-xl font-medium hover:bg-accent/30 transition-colors">
                  Затвори
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Квартал *</label>
                  <select value={routeDistrictId} onChange={(e) => setRouteDistrictId(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent transition-all">
                    <option value="">Изберете квартал</option>
                    {districts.map((d: District) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Дата на маршрута *</label>
                  <input type="date" value={routeDate} onChange={(e) => setRouteDate(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent transition-all" />
                </div>

                <div className="p-3 bg-secondary/30 rounded-xl border border-border/40 text-xs text-muted-foreground">
                  Ще групира всички <span className="text-blue-400 font-medium">Потвърдени</span> заявки от избрания квартал. Ако няма достатъчно, ще включи и съседните квартали. Заявките ще минат в статус <span className="text-purple-400 font-medium">В транзит</span>.
                </div>

                {routeMutation.isError && (
                  <p className="text-red-400 text-sm">{(routeMutation.error as Error).message}</p>
                )}

                <button onClick={handleScheduleRoute} disabled={!routeDistrictId || !routeDate || routeMutation.isPending}
                  className="w-full py-3 bg-accent text-white font-semibold rounded-xl shadow-lg shadow-accent/20 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {routeMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Route size={18} />}
                  {routeMutation.isPending ? 'Създаване...' : 'Създай Маршрут'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <nav className="relative z-20 flex items-center justify-between px-6 sm:px-12 py-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/15 rounded-xl flex items-center justify-center">
            <Recycle size={22} className="text-accent" />
          </div>
          <div>
            <span className="text-xl font-bold text-white tracking-tight">Eco<span className="text-accent">Recycle</span></span>
            <span className="ml-2 text-xs font-semibold bg-accent/20 text-accent px-2 py-0.5 rounded-full">ADMIN</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-sm">
            <Home size={16} /> Начало
          </Link>
          <button onClick={() => logoutMutation.mutate()} className="flex items-center gap-2 text-muted-foreground hover:text-red-400 transition-colors text-sm">
            <LogOut size={16} /> Изход
          </button>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 animate-slide-up">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
              Административен <span className="text-accent">Панел</span>
            </h1>
            <p className="text-muted-foreground text-lg">Управлявайте всички заявки за рециклиране.</p>
          </div>
          <button onClick={() => setShowRouteModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-accent/15 text-accent border border-accent/30 font-semibold rounded-xl hover:bg-accent/25 hover:-translate-y-0.5 transition-all duration-300 whitespace-nowrap self-start sm:self-auto">
            <Route size={18} /> Насрочи Маршрут
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          {[
            { label: 'Общо', value: stats.total, icon: Package, color: 'text-white', bg: 'bg-white/10' },
            { label: 'Чакащи', value: stats.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
            { label: 'Потвърдени', value: stats.confirmed, icon: CheckCircle2, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { label: 'Завършени', value: stats.completed, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="glass-card rounded-2xl p-5 flex items-center gap-3">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Filter size={16} className="text-muted-foreground" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-secondary/50 border border-border rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-accent transition-all">
            <option value="">Всички статуси</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
          </select>
          <select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)}
            className="bg-secondary/50 border border-border rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-accent transition-all">
            <option value="">Всички квартали</option>
            {districts.map((d: District) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {/* Requests list */}
        <div className="flex flex-col gap-3 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          {isLoading ? (
            <div className="glass-card rounded-2xl p-16 flex items-center justify-center">
              <Loader2 size={40} className="animate-spin text-accent" />
            </div>
          ) : requests.length === 0 ? (
            <div className="glass-card rounded-2xl p-16 text-center">
              <p className="text-muted-foreground">Няма намерени заявки.</p>
            </div>
          ) : (
            requests.map((req: PickupRequest) => {
              const st = statusConfig[req.status as RequestStatus];
              const StatusIcon = st.icon;
              const isScheduling = schedulingId === req.id;

              return (
                <div key={req.id} className="glass-card rounded-2xl p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${st.bg} ${st.color} border ${st.border}`}>
                          <StatusIcon size={12} /> {st.label}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded">
                          {req.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
                        <span className="font-medium text-white">{req.user?.name}</span>
                        <span>{req.user?.email}</span>
                        {req.user?.phoneNumber && <span>{req.user.phoneNumber}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin size={12} /> {req.address?.district?.name} — {req.address?.street} {req.address?.buildingNumber}</span>
                        <span className="flex items-center gap-1"><Package size={12} /> {req.items?.reduce((s: number, i: RequestItem) => s + i.quantity, 0)} бр. • {req.estimatedTotalWeight?.toFixed(1)} кг</span>
                        {req.scheduledDate && (
                          <span className="flex items-center gap-1 text-blue-400">
                            <CalendarDays size={12} />
                            {new Date(req.scheduledDate).toLocaleDateString('bg-BG')}
                            {req.scheduledTimeFrom && ` ${req.scheduledTimeFrom}–${req.scheduledTimeTo ?? ''}`}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {req.items?.map((item: RequestItem) => (
                          <span key={item.id} className="text-xs bg-secondary/50 text-muted-foreground px-2 py-0.5 rounded-full border border-border/40">
                            {item.electronicsItem?.name} ×{item.quantity}
                          </span>
                        ))}
                      </div>

                      {isScheduling && (
                        <div className="mt-3 p-4 bg-secondary/30 rounded-xl border border-border/40 flex flex-wrap gap-3 items-end">
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">Дата</label>
                            <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                              className="bg-secondary/50 border border-border rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">От час</label>
                            <input type="time" value={scheduleTimeFrom} onChange={(e) => setScheduleTimeFrom(e.target.value)}
                              className="bg-secondary/50 border border-border rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">До час</label>
                            <input type="time" value={scheduleTimeTo} onChange={(e) => setScheduleTimeTo(e.target.value)}
                              className="bg-secondary/50 border border-border rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-accent" />
                          </div>
                          <button onClick={() => handleScheduleRequest(req.id)} disabled={updateMutation.isPending}
                            className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-50">
                            {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Запази'}
                          </button>
                          <button onClick={() => setSchedulingId(null)} className="px-4 py-2 bg-secondary/50 text-muted-foreground border border-border/40 rounded-lg text-sm hover:text-white transition-colors">
                            Отказ
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
                      <select value={req.status} onChange={(e) => updateMutation.mutate({ id: req.id, data: { status: e.target.value } })}
                        className="bg-secondary/50 border border-border rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none focus:border-accent transition-all">
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                      </select>
                      <button onClick={() => { setSchedulingId(isScheduling ? null : req.id); setScheduleDate(req.scheduledDate ? new Date(req.scheduledDate).toISOString().split('T')[0] : ''); setScheduleTimeFrom(req.scheduledTimeFrom ?? ''); setScheduleTimeTo(req.scheduledTimeTo ?? ''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-400/20 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors">
                        <CalendarDays size={12} /> Насрочи
                      </button>
                      <button onClick={() => { if (confirm('Изтрий заявката?')) deleteMutation.mutate(req.id); }} disabled={deleteMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-400/20 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50">
                        <Trash2 size={12} /> Изтрий
                      </button>
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
