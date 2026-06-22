import type { AcademicEvent } from '../types';
import { EVENT_CATEGORIES } from '../constants';
import { Dna, Atom, Calculator, Beaker, Stethoscope, Cpu, Languages, Globe2, Palette, Scale, TrendingUp, GraduationCap } from 'lucide-react';

export const parseCategories = (cats: any) => {
  if (Array.isArray(cats)) return cats;
  if (typeof cats === 'string') {
    try {
      const parsed = JSON.parse(cats);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }
  return [];
};

export const parseJsonArray = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [val];
    } catch (e) {
      return [val];
    }
  }
  return [];
};

export const getEventHours = (event: AcademicEvent): number => {
  let start = event.timeStart;
  let end = event.timeEnd;
  if (!start || !end) {
    if (event.time && event.time.includes(' - ')) {
      const parts = event.time.split(' - ');
      start = parts[0]?.trim();
      end = parts[1]?.trim();
    }
  }
  if (!start || !end) return 2.0;
  try {
    const [hS, mS] = start.split(':').map(Number);
    const [hE, mE] = end.split(':').map(Number);
    if (isNaN(hS) || isNaN(mS) || isNaN(hE) || isNaN(mE)) return 2.0;
    const minutes = (hE * 60 + mE) - (hS * 60 + mS);
    if (minutes <= 0) return 2.0;
    return Math.round((minutes / 60) * 10) / 10;
  } catch (e) {
    return 2.0;
  }
};

export const calculateTotalHours = (evs: AcademicEvent[]) => evs.reduce((sum, ev) => sum + getEventHours(ev), 0);

export const getCourseStyle = (courseName: string = '') => {
  const name = courseName.toLowerCase();
  if (name.includes('biologia')) return { icon: Dna, color: 'text-green-600', bg: 'bg-green-500/10', border: 'border-green-500/40', shadow: 'shadow-green-500/20' };
  if (name.includes('física') || name.includes('fisica')) return { icon: Atom, color: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-purple-500/40', shadow: 'shadow-purple-500/20' };
  if (name.includes('matemática') || name.includes('matematica')) return { icon: Calculator, color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/40', shadow: 'shadow-blue-500/20' };
  if (name.includes('química') || name.includes('quimica')) return { icon: Beaker, color: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/40', shadow: 'shadow-red-500/20' };
  if (name.includes('medicina') || name.includes('saúde') || name.includes('enfermagem')) return { icon: Stethoscope, color: 'text-cyan-600', bg: 'bg-cyan-500/10', border: 'border-cyan-500/40', shadow: 'shadow-cyan-500/20' };
  if (name.includes('tecnologia') || name.includes('computação') || name.includes('sistemas') || name.includes('análise')) return { icon: Cpu, color: 'text-indigo-600', bg: 'bg-indigo-500/10', border: 'border-indigo-500/40', shadow: 'shadow-indigo-500/20' };
  if (name.includes('letras') || name.includes('literatura') || name.includes('inglês') || name.includes('português')) return { icon: Languages, color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/40', shadow: 'shadow-amber-500/20' };
  if (name.includes('história') || name.includes('geografia') || name.includes('social')) return { icon: Globe2, color: 'text-orange-600', bg: 'bg-orange-500/10', border: 'border-orange-500/40', shadow: 'shadow-orange-500/20' };
  if (name.includes('artes') || name.includes('design') || name.includes('arquitetura')) return { icon: Palette, color: 'text-pink-600', bg: 'bg-pink-500/10', border: 'border-pink-500/40', shadow: 'shadow-pink-500/20' };
  if (name.includes('direito')) return { icon: Scale, color: 'text-slate-600', bg: 'bg-slate-500/10', border: 'border-slate-500/40', shadow: 'shadow-slate-500/20' };
  if (name.includes('administração') || name.includes('economia') || name.includes('contábeis')) return { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', shadow: 'shadow-emerald-500/20' };
  return { icon: GraduationCap, color: 'text-secondary', bg: 'bg-secondary/5', border: 'border-secondary/20', shadow: 'shadow-secondary/20' };
};

export const CATEGORY_COLORS = [
  { color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { color: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { color: 'text-rose-600', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { color: 'text-cyan-600', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { color: 'text-orange-600', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { color: 'text-indigo-600', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  { color: 'text-pink-600', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  { color: 'text-teal-600', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
];

export const getCategoryStyle = (categoryName: string) => {
  const index = EVENT_CATEGORIES.indexOf(categoryName);
  if (index === -1) return { color: 'text-secondary', bg: 'bg-secondary/5', border: 'border-secondary/10' };
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
};

export const isTestMode = () => localStorage.getItem('testMode') === 'true';

export async function apiPost(path: string, body: any) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Erro na requisição');
  return res.json();
}

export async function apiPatch(path: string, body: any) {
  const res = await fetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Erro na requisição');
  return res.json();
}

export async function apiDelete(path: string) {
  const res = await fetch(path, { method: 'DELETE' });
  if (!res.ok) throw new Error((await res.json()).error || 'Erro na requisição');
  return res.json();
}

export const getEventConfirmationState = (event: AcademicEvent): 'FUTURE' | 'PENDING_CONFIRMATION' | 'AUTO_CONFIRMED' | 'CONFIRMED' | 'CANCELLED' => {
  if (event.status === 'Cancelled') return 'CANCELLED';
  if (event.status === 'Confirmed') return 'CONFIRMED';
  
  const eventDateStr = event.date; // YYYY-MM-DD
  const eventTimeStr = event.timeEnd || event.timeStart || '23:59';
  const eventDateTime = new Date(`${eventDateStr}T${eventTimeStr}:00`);
  const now = new Date();
  
  if (now > eventDateTime) {
    const diffTime = Math.abs(now.getTime() - eventDateTime.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 5) {
      return 'AUTO_CONFIRMED';
    } else {
      return 'PENDING_CONFIRMATION';
    }
  }
  
  return 'FUTURE';
};
