'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  MapPin, Package, Calendar, ChevronRight, ChevronLeft,
  Loader2, Recycle, Plus, Minus, Check, X, Clock, Zap,
} from 'lucide-react';
import { getDistricts, getElectronics, createRequest } from '@/lib/api';
import type { District, ElectronicsItem } from '@/lib/types';

type Step = 1 | 2 | 3;

const DAY_ABBR = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTH_ABBR = ['яну', 'фев', 'мар', 'апр', 'май', 'юни', 'юли', 'авг', 'сеп', 'окт', 'ное', 'дек'];

const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 22; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 22) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getNext14Days(): Date[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i + 1);
    return d;
  });
}

export default function NewRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1 — address
  const [districtId, setDistrictId] = useState('');
  const [city, setCity] = useState('София');
  const [street, setStreet] = useState('');
  const [buildingNumber, setBuildingNumber] = useState('');
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Step 2 — items
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Step 3 — availability
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [weekendsOnly, setWeekendsOnly] = useState(false);
  const [showAfterHour, setShowAfterHour] = useState(false);
  const [globalFrom, setGlobalFrom] = useState('');
  const [globalTo, setGlobalTo] = useState('');
  const [dayOverrides, setDayOverrides] = useState<Record<string, { from: string; to: string }>>({});
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [preferredNote, setPreferredNote] = useState('');

  const next14 = useMemo(() => getNext14Days(), []);

  const { data: districts = [] } = useQuery({ queryKey: ['districts'], queryFn: getDistricts });
  const { data: electronics = [] } = useQuery({ queryKey: ['electronics'], queryFn: getElectronics });

  const categories = [...new Set(electronics.map((e: ElectronicsItem) => e.category))];

  const submitMutation = useMutation({
    mutationFn: createRequest,
    onSuccess: () => router.push('/dashboard'),
  });

  const adjust = (id: string, delta: number) => {
    setQuantities((prev) => {
      const next = (prev[id] ?? 0) + delta;
      if (next <= 0) {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  // Returns true if this day should be treated as unavailable
  const isEffectivelyBlocked = (d: Date) => {
    if (weekendsOnly && d.getDay() !== 0 && d.getDay() !== 6) return true;
    return blockedDates.has(isoDate(d));
  };

  const toggleBlock = (key: string, d: Date) => {
    // Cannot manually toggle weekdays when weekendsOnly is on
    if (weekendsOnly && d.getDay() !== 0 && d.getDay() !== 6) return;
    setBlockedDates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        if (openDay === key) setOpenDay(null);
      }
      return next;
    });
  };

  const setDayTime = (key: string, field: 'from' | 'to', value: string) => {
    setDayOverrides((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const buildSlots = () =>
    next14
      .filter((d) => !isEffectivelyBlocked(d))
      .map((d) => {
        const key = isoDate(d);
        const ov = dayOverrides[key];
        const from = ov?.from || globalFrom;
        const to = ov?.to || globalTo;
        return {
          availableDate: d.toISOString(),
          timeFrom: from || '08:00',
          timeTo: to || '20:00',
          isFlexible: !from && !to,
        };
      });

  const availableCount = next14.filter((d) => !isEffectivelyBlocked(d)).length;

  const totalItems = Object.values(quantities).reduce((s, v) => s + v, 0);
  const step1Valid = districtId && city && street && buildingNumber;
  const step2Valid = totalItems > 0;

  const handleSubmit = () => {
    const items = Object.entries(quantities).map(([electronicsItemId, quantity]) => ({
      electronicsItemId,
      quantity,
    }));
    const slots = buildSlots();

    submitMutation.mutate({
      districtId,
      city,
      street,
      buildingNumber,
      entrance: entrance || undefined,
      floor: floor || undefined,
      apartment: apartment || undefined,
      additionalNotes: additionalNotes || undefined,
      items,
      availabilitySlots: slots.length > 0 ? slots : undefined,
      preferredNote: preferredNote || undefined,
    });
  };

  const stepLabels = [
    { icon: MapPin, label: 'Адрес' },
    { icon: Package, label: 'Техника' },
    { icon: Calendar, label: 'Наличност' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 pt-12 relative overflow-hidden">
      <div className="absolute top-[10%] right-[5%] w-[30%] h-[30%] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[5%] w-[25%] h-[25%] bg-accent/15 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-2xl z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
            <Recycle size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Нова Заявка</h1>
            <p className="text-muted-foreground text-sm">Регистрирайте електроника за рециклиране</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {stepLabels.map(({ icon: Icon, label }, i) => {
            const s = (i + 1) as Step;
            const active = step === s;
            const done = step > s;
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  done ? 'bg-primary/20 text-primary' : active ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'
                }`}>
                  {done ? <Check size={14} /> : <Icon size={14} />}
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{s}</span>
                </div>
                {i < 2 && <div className={`h-px flex-1 transition-colors duration-300 ${done ? 'bg-primary/50' : 'bg-border/50'}`} />}
              </div>
            );
          })}
        </div>

        {/* Step 1 — Address */}
        {step === 1 && (
          <div className="glass-card rounded-3xl p-8 animate-slide-up">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <MapPin size={20} className="text-primary" /> Адрес на събиране
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Квартал *</label>
                <select
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary transition-all"
                >
                  <option value="">Изберете квартал</option>
                  {districts.map((d: District) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Град *</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary transition-all"
                    placeholder="София" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Улица *</label>
                  <input value={street} onChange={(e) => setStreet(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary transition-all"
                    placeholder="ул. Витоша" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Номер *</label>
                  <input value={buildingNumber} onChange={(e) => setBuildingNumber(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary transition-all" placeholder="12" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Вход</label>
                  <input value={entrance} onChange={(e) => setEntrance(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary transition-all" placeholder="А" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Етаж</label>
                  <input value={floor} onChange={(e) => setFloor(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary transition-all" placeholder="3" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Апартамент</label>
                <input value={apartment} onChange={(e) => setApartment(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary transition-all" placeholder="7" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Допълнителни бележки</label>
                <textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} rows={2}
                  className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary transition-all resize-none"
                  placeholder="Например: до синята врата, звъни на домофон 12..." />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setStep(2)} disabled={!step1Valid}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all duration-300">
                Продължи <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Items */}
        {step === 2 && (
          <div className="glass-card rounded-3xl p-8 animate-slide-up">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Package size={20} className="text-primary" /> Вид и брой техника
            </h2>
            <div className="flex flex-col gap-6">
              {categories.map((cat) => (
                <div key={cat as string}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{cat as string}</p>
                  <div className="flex flex-col gap-2">
                    {electronics.filter((e: ElectronicsItem) => e.category === cat).map((item: ElectronicsItem) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/40">
                        <div>
                          <p className="text-white font-medium text-sm">{item.name}</p>
                          <p className="text-muted-foreground text-xs">{item.defaultWeight} кг / бр.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => adjust(item.id, -1)} disabled={!quantities[item.id]}
                            className="w-8 h-8 rounded-full bg-secondary/60 border border-border/50 flex items-center justify-center text-white hover:bg-secondary transition-colors disabled:opacity-30">
                            <Minus size={14} />
                          </button>
                          <span className={`w-8 text-center font-bold text-lg ${quantities[item.id] ? 'text-primary' : 'text-muted-foreground'}`}>
                            {quantities[item.id] ?? 0}
                          </span>
                          <button onClick={() => adjust(item.id, 1)}
                            className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/30 transition-colors">
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {totalItems > 0 && (
              <div className="mt-4 p-3 bg-primary/10 rounded-xl border border-primary/20 text-sm text-primary font-medium">
                Избрани: {totalItems} бр. &mdash;{' '}
                {electronics
                  .filter((e: ElectronicsItem) => quantities[e.id])
                  .reduce((s: number, e: ElectronicsItem) => s + e.defaultWeight * quantities[e.id], 0)
                  .toFixed(1)} кг прибл.
              </div>
            )}
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(1)} className="flex items-center gap-2 px-6 py-3 bg-secondary/50 text-white font-semibold rounded-xl hover:-translate-y-0.5 transition-all duration-300 border border-border/50">
                <ChevronLeft size={18} /> Назад
              </button>
              <button onClick={() => setStep(3)} disabled={!step2Valid}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all duration-300">
                Продължи <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Availability */}
        {step === 3 && (
          <div className="glass-card rounded-3xl p-8 animate-slide-up">
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Calendar size={20} className="text-primary" /> Предпочитания за наличност
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              По желание. Маркирайте дните и часовете, когато <span className="text-white">не</span> сте налични.
            </p>

            {/* Quick options */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={() => setWeekendsOnly(!weekendsOnly)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  weekendsOnly
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-secondary/30 border-border/40 text-white hover:border-primary/30'
                }`}
              >
                <Zap size={15} className="shrink-0" />
                <span className="flex-1 text-left">Само уикенди</span>
                {weekendsOnly && <Check size={13} />}
              </button>
              <button
                onClick={() => {
                  const next = !showAfterHour;
                  setShowAfterHour(next);
                  if (!next) setGlobalFrom('');
                }}
                className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  showAfterHour
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-secondary/30 border-border/40 text-white hover:border-primary/30'
                }`}
              >
                <Clock size={15} className="shrink-0" />
                <span className="flex-1 text-left">Само след час</span>
                {showAfterHour && <Check size={13} />}
              </button>
            </div>

            {/* After-hour quick picker */}
            {showAfterHour && (
              <div className="mb-5 p-4 bg-primary/10 rounded-xl border border-primary/20 flex items-center gap-3">
                <Clock size={16} className="text-primary shrink-0" />
                <span className="text-white text-sm whitespace-nowrap">Достъпен след:</span>
                <select
                  value={globalFrom}
                  onChange={(e) => setGlobalFrom(e.target.value)}
                  className="flex-1 bg-secondary/50 border border-border rounded-lg py-1.5 px-3 text-white text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Изберете час</option>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 2-week calendar */}
            <div className="grid grid-cols-7 gap-1.5 mb-5">
              {next14.map((day) => {
                const key = isoDate(day);
                const blocked = isEffectivelyBlocked(day);
                const autoBlocked = weekendsOnly && day.getDay() !== 0 && day.getDay() !== 6;
                const isOpen = openDay === key;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const hasOverride = !!dayOverrides[key] && !blocked;

                return (
                  <div key={key} className="relative">
                    {/* Day tile */}
                    <button
                      onClick={() => {
                        if (autoBlocked) return;
                        if (blocked) {
                          toggleBlock(key, day);
                        } else {
                          setOpenDay(isOpen ? null : key);
                        }
                      }}
                      title={blocked ? 'Кликни за отблокиране' : 'Кликни за часове'}
                      className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative overflow-hidden
                        ${autoBlocked
                          ? 'bg-secondary/10 text-muted-foreground/25 cursor-default'
                          : blocked
                            ? 'bg-secondary/20 text-muted-foreground/40 cursor-pointer hover:bg-secondary/30'
                            : isOpen
                              ? 'bg-primary/20 border border-primary text-primary ring-1 ring-primary/50'
                              : isWeekend
                                ? 'bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 cursor-pointer'
                                : 'bg-secondary/30 border border-border/30 text-white hover:border-primary/30 cursor-pointer'
                        }
                      `}
                    >
                      <span className="text-[9px] font-semibold opacity-60 leading-none mt-1 select-none">
                        {DAY_ABBR[day.getDay()]}
                      </span>
                      <span className={`font-bold leading-none my-0.5 text-sm select-none ${blocked ? 'line-through opacity-50' : ''}`}>
                        {day.getDate()}
                      </span>
                      <span className="text-[9px] opacity-50 leading-none mb-1 select-none">
                        {MONTH_ABBR[day.getMonth()]}
                      </span>
                      {hasOverride && (
                        <Clock size={8} className="absolute top-1 right-1 text-accent opacity-80" />
                      )}
                      {blocked && !autoBlocked && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <X size={22} className="text-muted-foreground/20" />
                        </div>
                      )}
                    </button>
                    {/* Block / unblock button */}
                    {!blocked && !autoBlocked && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBlock(key, day); }}
                        title="Блокирай деня"
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-secondary/70 border border-border/60 flex items-center justify-center text-muted-foreground/50 hover:bg-red-500/30 hover:text-red-400 hover:border-red-400/40 transition-all z-10"
                      >
                        <X size={8} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-primary/20 border border-primary/30 inline-block" /> Уикенд
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-secondary/30 border border-border/30 inline-block" /> Делничен
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-secondary/20 inline-block opacity-50" /> Блокиран
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={10} className="text-accent" /> Персонални часове
              </span>
            </div>

            {/* Per-day time picker panel */}
            {openDay && (() => {
              const openDayDate = next14.find((d) => isoDate(d) === openDay);
              if (!openDayDate || isEffectivelyBlocked(openDayDate)) return null;
              return (
                <div className="mb-5 p-4 bg-secondary/20 rounded-xl border border-primary/25 animate-slide-up">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white text-sm font-medium flex items-center gap-2">
                      <Clock size={14} className="text-primary" />
                      {openDayDate.getDate()} {MONTH_ABBR[openDayDate.getMonth()]} ({DAY_ABBR[openDayDate.getDay()]}) — персонални часове
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { toggleBlock(openDay, openDayDate); setOpenDay(null); }}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all flex items-center gap-1"
                      >
                        <X size={11} /> Блокирай
                      </button>
                      <button
                        onClick={() => setOpenDay(null)}
                        className="text-xs text-muted-foreground hover:text-white px-2 py-1 rounded-lg hover:bg-secondary/40 transition-all"
                      >
                        Затвори
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Не преди:</label>
                      <select
                        value={dayOverrides[openDay]?.from || ''}
                        onChange={(e) => setDayTime(openDay, 'from', e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-primary"
                      >
                        <option value="">По подразбиране</option>
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Не след:</label>
                      <select
                        value={dayOverrides[openDay]?.to || ''}
                        onChange={(e) => setDayTime(openDay, 'to', e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-primary"
                      >
                        <option value="">По подразбиране</option>
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/50 mt-2">
                    Оставете празно, за да се използва общият диапазон по-долу.
                  </p>
                </div>
              );
            })()}

            {/* Global time range */}
            <div className="p-4 bg-secondary/20 rounded-xl border border-border/30 mb-5">
              <p className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                <Clock size={14} className="text-muted-foreground" />
                Общ часови диапазон
                <span className="text-xs text-muted-foreground font-normal">(за всички налични дни)</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Не преди:</label>
                  <select
                    value={globalFrom}
                    onChange={(e) => setGlobalFrom(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Без ограничение</option>
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Не след:</label>
                  <select
                    value={globalTo}
                    onChange={(e) => setGlobalTo(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Без ограничение</option>
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Availability summary */}
            <div className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl mb-5 ${
              availableCount > 0 ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-400'
            }`}>
              {availableCount > 0 ? <Check size={14} /> : <X size={14} />}
              {availableCount} от 14 дни са налични за вземане
            </div>

            {/* Optional note */}
            <div className="mb-5">
              <label className="text-xs text-muted-foreground mb-1.5 block">Допълнителна бележка (по желание)</label>
              <textarea
                value={preferredNote}
                onChange={(e) => setPreferredNote(e.target.value)}
                rows={2}
                className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-primary transition-all resize-none"
                placeholder="Например: само сутрин, обадете се преди да дойдете..."
              />
            </div>

            {submitMutation.isError && (
              <p className="text-red-400 text-sm mb-4">{(submitMutation.error as Error).message}</p>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="flex items-center gap-2 px-6 py-3 bg-secondary/50 text-white font-semibold rounded-xl hover:-translate-y-0.5 transition-all duration-300 border border-border/50">
                <ChevronLeft size={18} /> Назад
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70"
              >
                {submitMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {submitMutation.isPending ? 'Изпращане...' : 'Подай Заявката'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
