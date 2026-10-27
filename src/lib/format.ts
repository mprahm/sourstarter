const pad = (n: number) => String(n).padStart(2, '0');

export function clock(ms: number) {
  const d = new Date(ms);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

export function dur(min: number) {
  const m = Math.round(min);
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? h + ' h ' + r + ' min' : h + ' h';
}

/** mm:ss, or hh:mm:ss from one hour. */
export function countdown(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor(s / 60) % 60;
  return (h ? pad(h) + ':' : '') + pad(m) + ':' + pad(s % 60);
}

export function weekdayDay(ms: number, withMonth = true) {
  return new Date(ms).toLocaleDateString('en-GB', withMonth ? { weekday: 'short', day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric' });
}

export function monthYear(ms: number) {
  return new Date(ms).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function sameDay(a: number, b: number) {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/** "Sat 18 – Sun 19 Oct", or one date when the bake fits in a day. */
export function dateRange(a: number, b: number) {
  if (sameDay(a, b)) return weekdayDay(a);
  const sameMonth = new Date(a).getMonth() === new Date(b).getMonth();
  return weekdayDay(a, !sameMonth) + ' – ' + weekdayDay(b);
}

export function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
