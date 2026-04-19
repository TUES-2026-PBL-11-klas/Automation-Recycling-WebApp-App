'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, Package, CalendarDays, Clock, CheckCircle2,
  Truck, XCircle, Recycle, Scale, Loader2, Calendar, StickyNote,
} from 'lucide-react';
import { getRequest, cancelRequest } from '@/lib/api';

type RequestStatus = 'PENDING' | 'CONFIRMED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

const statusConfig: Record<RequestStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  PENDING:    { label: 'Чакаща',     color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20',   icon: Clock },
  CONFIRMED:  { label: 'Потвърдена', color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20',    icon: CheckCircle2 },
  IN_TRANSIT: { label: 'В транзит',  color: 'text-purple-400',  bg: 'bg-purple-400/10',  border: 'border-purple-400/20',  icon: Truck },
  COMPLETED:  { label: 'Завършена',  color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: CheckCircle2 },
  CANCELLED:  { label: 'Отменена',   color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20',     icon: XCircle },
};

const prefLabels: Record<string, string> = {
  WEEKENDS_ONLY:   'Само уикенди',
  WEEKDAYS_ONLY:   'Само делнични дни',
  MORNINGS_ONLY:   'Само сутрин (до 12:00)',
  AFTERNOONS_ONLY: 'Само следобед (след 12:00)',
  AFTER_HOUR:      'След определен час',
};

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: request, isLoading, isError } = useQuery({
    queryKey: ['request', id],
    queryFn: () => getRequest(id),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRequests'] });
      router.push('/dashboard');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !request) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Заявката не е намерена.</p>
        <Link href="/dashboard" className="text-primary hover:underline text-sm">← Назад към таблото</Link>
      </div>
    );
  }

  const st = statusConfig[request.status as RequestStatus];
  const StatusIcon = st.icon;
  const totalItems = request.items?.reduce((s: number, i: any) => s + i.quantity, 0) ?? 0;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[35%] h-[35%] bg-primary/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 sm:px-12 py-10">

        {/* Back */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-sm mb-8">
          <ArrowLeft size={16} /> Назад към таблото
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/15 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Recycle size={28} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{request.address?.district?.name}</h1>
              <p className="text-muted-foreground text-sm font-mono">{id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${st.bg} ${st.color} border ${st.border} self-start`}>
            <StatusIcon size={15} />
            {st.label}
          </div>
        </div>

        <div className="flex flex-col gap-5 animate-slide-up" style={{ animationDelay: '0.05s' }}>

          {/* Scheduled date */}
          {request.scheduledDate && (
            <div className="glass-card rounded-2xl p-5 flex items-center gap-4 border-blue-400/20 bg-blue-400/5">
              <div className="w-10 h-10 bg-blue-400/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <CalendarDays size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Насрочено посещение</p>
                <p className="text-white font-semibold">
                  {new Date(request.scheduledDate).toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                {(request.scheduledTimeFrom || request.scheduledTimeTo) && (
                  <p className="text-blue-400 text-sm">{request.scheduledTimeFrom} – {request.scheduledTimeTo}</p>
                )}
              </div>
            </div>
          )}

          {/* Address */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-primary" />
              <h2 className="text-white font-semibold">Адрес на събиране</h2>
            </div>
            <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Квартал</p>
                <p className="text-white">{request.address?.district?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Град</p>
                <p className="text-white">{request.address?.city}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Улица</p>
                <p className="text-white">{request.address?.street} {request.address?.buildingNumber}</p>
              </div>
              {request.address?.entrance && (
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Вход / Етаж / Ап.</p>
                  <p className="text-white">
                    {[request.address.entrance && `Вх. ${request.address.entrance}`, request.address.floor && `Ет. ${request.address.floor}`, request.address.apartment && `Ап. ${request.address.apartment}`].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
              {request.address?.additionalNotes && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs mb-0.5">Бележки</p>
                  <p className="text-white">{request.address.additionalNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-primary" />
                <h2 className="text-white font-semibold">Техника</h2>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Package size={13} /> {totalItems} бр.</span>
                <span className="flex items-center gap-1"><Scale size={13} /> {request.estimatedTotalWeight?.toFixed(1)} кг</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {request.items?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/30">
                  <div>
                    <p className="text-white text-sm font-medium">{item.electronicsItem?.name}</p>
                    <p className="text-muted-foreground text-xs">{item.electronicsItem?.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-primary font-bold">×{item.quantity}</p>
                    <p className="text-muted-foreground text-xs">{item.estimatedWeight?.toFixed(1)} кг</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Availability preferences */}
          {request.availabilityPreferences?.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-primary" />
                <h2 className="text-white font-semibold">Предпочитания за наличност</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {request.availabilityPreferences.map((pref: any) => (
                  <span key={pref.id} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm">
                    {prefLabels[pref.preferenceType] ?? pref.preferenceType}
                    {pref.value && ` — ${pref.value}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Availability slots */}
          {request.availabilitySlots?.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={16} className="text-primary" />
                <h2 className="text-white font-semibold">Конкретни дати за наличност</h2>
              </div>
              <div className="flex flex-col gap-2">
                {request.availabilitySlots.map((slot: any) => (
                  <div key={slot.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/30 text-sm">
                    <span className="text-white">{new Date(slot.availableDate).toLocaleDateString('bg-BG', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span className="text-muted-foreground">{slot.timeFrom} – {slot.timeTo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          {request.preferredNote && (
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <StickyNote size={16} className="text-primary" />
                <h2 className="text-white font-semibold">Бележка</h2>
              </div>
              <p className="text-muted-foreground text-sm">{request.preferredNote}</p>
            </div>
          )}

          {/* Meta */}
          <p className="text-xs text-muted-foreground/50 text-center">
            Създадена на {new Date(request.createdAt).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>

          {/* Cancel */}
          {['PENDING', 'CONFIRMED'].includes(request.status) && (
            <button
              onClick={() => { if (confirm('Сигурни ли сте, че искате да отмените тази заявка?')) cancelMutation.mutate(); }}
              disabled={cancelMutation.isPending}
              className="w-full py-3 rounded-xl border border-red-400/30 bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {cancelMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              Отмени заявката
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
