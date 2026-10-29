// All ride-board decisions use Bangladesh time, independent of device timezone.
export function bdNow(at = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(at).reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {});
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), min: Number(p.minute) };
}

export function activeDate(at = new Date()) {
  const n = bdNow(at);
  const day = new Date(`${n.date}T12:00:00Z`);
  if (n.hour >= 21) day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

export function isPast(date, time, at = new Date()) {
  const n = bdNow(at);
  return date < n.date || (date === n.date && time <= `${String(n.hour).padStart(2, '0')}:${String(n.min).padStart(2, '0')}`);
}
