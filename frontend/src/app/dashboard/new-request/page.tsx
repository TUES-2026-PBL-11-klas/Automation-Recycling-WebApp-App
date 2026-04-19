'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MapPin, Package, Calendar, ChevronRight, ChevronLeft, Loader2, Recycle, Plus, Minus, Check } from 'lucide-react';
import { getDistricts, getElectronics, createRequest } from '@/lib/api';

type Step = 1 | 2 | 3;

const PREFERENCES = [
  { value: 'WEEKENDS_ONLY', label: 'Само уикенди' },
  { value: 'WEEKDAYS_ONLY', label: 'Само делнични' },
  { value: 'MORNINGS_ONLY', label: 'Само сутрин (до 12:00)' },
  { value: 'AFTERNOONS_ONLY', label: 'Само следобед (след 12:00)' },
];

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
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [afterHour, setAfterHour] = useState('');
  const [preferredNote, setPreferredNote] = useState('');

  const { data: districts = [] } = useQuery({ queryKey: ['districts'], queryFn: getDistricts });
  const { data: electronics = [] } = useQuery({ queryKey: ['electronics'], queryFn: getElectronics });

  const categories = [...new Set(electronics.map((e: any) => e.category))];

  const submitMutation = useMutation({
    mutationFn: createRequest,
    onSuccess: () => router.push('/dashboard'),
  });

  const adjust = (id: string, delta: number) => {
    setQuantities((prev) => {
      const next = (prev[id] ?? 0) + delta;
      if (next <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const togglePref = (val: string) => {
    setSelectedPreferences((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]
    );
  };

  const totalItems = Object.values(quantities).reduce((s, v) => s + v, 0);

  const step1Valid = districtId && city && street && buildingNumber;
  const step2Valid = totalItems > 0;

  const handleSubmit = () => {
    const items = Object.entries(quantities).map(([electronicsItemId, quantity]) => ({
      electronicsItemId,
      quantity,
    }));

    const prefs = selectedPreferences.map((p) => ({
      preferenceType: p,
      ...(p === 'AFTER_HOUR' && afterHour ? { value: afterHour } : {}),
    }));

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
      availabilityPreferences: prefs.length > 0 ? prefs : undefined,
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
                  {districts.map((d: any) => (
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
                    {electronics.filter((e: any) => e.category === cat).map((item: any) => (
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
                  .filter((e: any) => quantities[e.id])
                  .reduce((s: number, e: any) => s + e.defaultWeight * quantities[e.id], 0)
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
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Calendar size={20} className="text-primary" /> Предпочитания за наличност
            </h2>
            <p className="text-muted-foreground text-sm mb-6">По желание. Можете да пропуснете тази стъпка.</p>
            <div className="flex flex-col gap-3 mb-6">
              {PREFERENCES.map((pref) => (
                <button key={pref.value} onClick={() => togglePref(pref.value)}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${
                    selectedPreferences.includes(pref.value)
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-secondary/30 border-border/40 text-white hover:border-primary/30'
                  }`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedPreferences.includes(pref.value) ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`}>
                    {selectedPreferences.includes(pref.value) && <Check size={11} className="text-white" />}
                  </div>
                  {pref.label}
                </button>
              ))}
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Допълнителна бележка за наличността</label>
              <textarea value={preferredNote} onChange={(e) => setPreferredNote(e.target.value)} rows={2}
                className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary transition-all resize-none"
                placeholder="Например: достъпен само между 10:00 и 14:00..." />
            </div>
            {submitMutation.isError && (
              <p className="text-red-400 text-sm mt-4">{(submitMutation.error as Error).message}</p>
            )}
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(2)} className="flex items-center gap-2 px-6 py-3 bg-secondary/50 text-white font-semibold rounded-xl hover:-translate-y-0.5 transition-all duration-300 border border-border/50">
                <ChevronLeft size={18} /> Назад
              </button>
              <button onClick={handleSubmit} disabled={submitMutation.isPending}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70">
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
