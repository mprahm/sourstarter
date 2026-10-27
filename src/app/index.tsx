import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, CalendarIcon, ChevronIcon, Mono, PlusIcon, SectionHead } from '../components/ui';
import { clock, dateRange, monthYear, weekdayDay } from '../lib/format';
import { activeDays, computePlan, isFinished, ymd } from '../lib/plan';
import { useNow, useStore } from '../lib/store';
import { F, RADIUS, useColors } from '../lib/theme';
import type { Bake } from '../lib/types';

const hero = require('../../assets/images/hero-loaf.jpg');

type Item = { bake: Bake; live: boolean; first: number; end: number; days: string[]; status: string; next: string };

export default function Breads() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { data, createBake } = useStore();
  const now = useNow(30_000);
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [calOpen, setCalOpen] = useState(false);

  const items = useMemo<Item[]>(
    () =>
      data.bakes
        .map((bake) => {
          const p = computePlan(bake, now);
          const live = !isFinished(bake);
          const cur = p.rows[p.cur];
          let status = '';
          let next = '';
          if (live && cur) {
            next = p.started ? (cur.late ? 'In progress · late' : 'In progress · next ' + clock(cur.start)) : 'Planned · starts ' + clock(cur.start);
            status = cur.step.name + ' · ready ' + weekdayDay(p.end, false) + ' ' + clock(p.end);
          }
          return { bake, live, first: p.rows[0].start, end: p.end, days: activeDays(bake, now), status, next };
        })
        .sort((a, b) => Number(b.live) - Number(a.live) || b.first - a.first),
    [data.bakes, now],
  );

  const shown = filterDay ? items.filter((x) => x.days.includes(filterDay)) : items;
  const months: { label: string; items: Item[] }[] = [];
  for (const x of shown) {
    const label = monthYear(x.first);
    const m = months.find((g) => g.label === label);
    if (m) m.items.push(x);
    else months.push({ label, items: [x] });
  }

  const newBread = () => {
    const b = createBake();
    router.push({ pathname: '/bake/[id]', params: { id: b.id, options: '1' } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }}>
        <View style={s.top}>
          <Text style={[s.brand, { color: c.ink }]}>Handbake</Text>
          <Pressable accessibilityLabel="Filter by date" onPress={() => setCalOpen(true)} style={s.icon} disabled={!items.length}>
            <CalendarIcon color={items.length ? c.ink : c.hair} dot={!!filterDay} />
          </Pressable>
        </View>
        <Image source={hero} accessibilityLabel="A dark-crusted sourdough loaf with open score marks on a wooden board" style={s.hero} resizeMode="cover" />
        <Text style={[s.h1, { color: c.ink }]}>Your breads</Text>

        {filterDay ? (
          <View style={[s.filter, { backgroundColor: c.ink }]}>
            <Text style={{ fontFamily: F.body, fontSize: 14, color: c.bg }}>
              Active on {weekdayDay(new Date(filterDay + 'T12:00').getTime())} · {shown.length} {shown.length === 1 ? 'bake' : 'bakes'}
            </Text>
            <Pressable onPress={() => setFilterDay(null)} style={{ paddingHorizontal: 10, minHeight: 36, justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.semi, fontSize: 14, color: c.bg }}>Clear</Text>
            </Pressable>
          </View>
        ) : null}

        {!items.length ? (
          <Text style={[s.empty, { color: c.mut }]}>No breads yet. Start one with New bread, and the timeline becomes its log.</Text>
        ) : null}

        {months.map((m) => (
          <View key={m.label}>
            <SectionHead label={m.label} note={m.items.length + (m.items.length === 1 ? ' bake' : ' bakes')} style={{ marginTop: 30 }} />
            {m.items.map((x) =>
              x.live ? (
                <Pressable
                  key={x.bake.id}
                  onPress={() => router.push({ pathname: '/bake/[id]', params: { id: x.bake.id } })}
                  style={({ pressed }) => [s.live, { borderBottomColor: c.hair }, pressed && { opacity: 0.6 }]}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Mono style={{ letterSpacing: 0.8, fontSize: 10.5 }}>{x.next.toUpperCase()}</Mono>
                    <Text style={[s.liveName, { color: c.ink }]}>{x.bake.name}</Text>
                    <Text style={[s.note, { color: c.mut }]}>{x.status}</Text>
                  </View>
                  <ChevronIcon color={c.ink} dir="right" />
                </Pressable>
              ) : (
                <Pressable
                  key={x.bake.id}
                  onPress={() => router.push({ pathname: '/bake/[id]', params: { id: x.bake.id } })}
                  style={({ pressed }) => [s.item, { borderBottomColor: c.hair }, pressed && { opacity: 0.6 }]}
                >
                  <View style={s.itemTop}>
                    <Text style={[s.itemName, { color: c.ink }]}>{x.bake.name}</Text>
                    {x.bake.rating ? <Mono>{x.bake.rating}/5</Mono> : null}
                  </View>
                  <Text style={[s.itemDate, { color: c.mut }]}>{dateRange(x.first, x.end)}</Text>
                  {x.bake.logs.slice?.note ? (
                    <Text style={[s.note, { color: c.mut }]} numberOfLines={2}>
                      {x.bake.logs.slice.note}
                    </Text>
                  ) : null}
                </Pressable>
              ),
            )}
          </View>
        ))}
        {filterDay && !shown.length ? <Text style={[s.empty, { color: c.mut }]}>No bakes on this day.</Text> : null}
      </ScrollView>

      <View style={[s.fab, { bottom: insets.bottom + 24 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={newBread}
          style={({ pressed }) => [s.fabBtn, { backgroundColor: c.ink }, pressed && { opacity: 0.8 }]}
        >
          <PlusIcon color={c.bg} size={13} />
          <Text style={{ fontFamily: F.semi, fontSize: 15, color: c.bg }}>New bread</Text>
        </Pressable>
      </View>

      <CalendarSheet
        open={calOpen}
        onClose={() => setCalOpen(false)}
        items={items}
        selected={filterDay}
        onPick={(d) => {
          setFilterDay(d);
          setCalOpen(false);
        }}
      />
    </View>
  );
}

function CalendarSheet({
  open,
  onClose,
  items,
  selected,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  items: Item[];
  selected: string | null;
  onPick: (d: string | null) => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const activity: Record<string, number> = {};
  const liveDays: Record<string, boolean> = {};
  items.forEach((x) =>
    x.days.forEach((d) => {
      activity[d] = (activity[d] ?? 0) + 1;
      if (x.live) liveDays[d] = true;
    }),
  );
  const y = month.getFullYear();
  const mo = month.getMonth();
  const daysIn = new Date(y, mo + 1, 0).getDate();
  const lead = (month.getDay() + 6) % 7;
  const oldest = items.length ? Math.min(...items.map((x) => x.first)) : Date.now();
  const o = new Date(oldest);
  const canPrev = month > new Date(o.getFullYear(), o.getMonth(), 1);
  const canNext = month < new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const monthKey = y + '-' + String(mo + 1).padStart(2, '0');
  const monthBakes = items.filter((x) => x.days.some((d) => d.startsWith(monthKey))).length;

  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close calendar" />
      <View style={[s.sheet, { backgroundColor: c.bg, paddingBottom: insets.bottom + 16, borderColor: c.hair }]}>
        <View style={s.calHead}>
          <View>
            <Text style={[s.calTitle, { color: c.ink }]}>{monthYear(month.getTime())}</Text>
            <Mono>{monthBakes + (monthBakes === 1 ? ' BAKE' : ' BAKES')} THIS MONTH</Mono>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Pressable accessibilityLabel="Previous month" disabled={!canPrev} onPress={() => setMonth(new Date(y, mo - 1, 1))} style={[s.navBtn, { borderColor: c.hair, opacity: canPrev ? 1 : 0.3 }]}>
              <ChevronIcon color={c.ink} dir="left" />
            </Pressable>
            <Pressable accessibilityLabel="Next month" disabled={!canNext} onPress={() => setMonth(new Date(y, mo + 1, 1))} style={[s.navBtn, { borderColor: c.hair, opacity: canNext ? 1 : 0.3 }]}>
              <ChevronIcon color={c.ink} dir="right" />
            </Pressable>
          </View>
        </View>
        <View style={s.grid}>
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((w) => (
            <View key={w} style={s.cell}>
              <Mono style={{ fontSize: 10.5 }}>{w.toUpperCase()}</Mono>
            </View>
          ))}
          {cells.map((d, i) => {
            if (!d) return <View key={'e' + i} style={s.cell} />;
            const k = ymd(new Date(y, mo, d));
            const has = !!activity[k];
            const sel = k === selected;
            const isToday = k === ymd(today);
            return (
              <View key={k} style={s.cell}>
                <Pressable
                  disabled={!has}
                  onPress={() => onPick(sel ? null : k)}
                  accessibilityLabel={d + (has ? ', ' + activity[k] + (activity[k] > 1 ? ' bakes' : ' bake') : ', no bakes')}
                  style={[
                    s.day,
                    has && { backgroundColor: c.soft },
                    liveDays[k] && { borderWidth: 1.5, borderColor: c.ink },
                    sel && { backgroundColor: c.ink },
                  ]}
                >
                  <Text style={{ fontFamily: has ? F.semi : F.light, fontSize: 15, color: sel ? c.bg : has ? c.ink : c.mut }}>{d}</Text>
                  {isToday ? <View style={[s.todayDot, { backgroundColor: sel ? c.bg : c.ink }]} /> : null}
                </Pressable>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Button label="Show all" kind="outline" small style={{ flex: 1 }} onPress={() => onPick(null)} />
          <Button label="Done" small style={{ flex: 1 }} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  brand: { fontFamily: F.display, fontSize: 16, letterSpacing: -0.16 },
  icon: { width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  hero: { width: undefined, marginHorizontal: -20, marginTop: 10, aspectRatio: 4 / 3 },
  h1: { marginTop: 22, fontFamily: F.display, fontSize: 34, lineHeight: 36, letterSpacing: -0.85 },
  filter: { marginTop: 18, borderRadius: 12, paddingLeft: 14, paddingRight: 4, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { fontFamily: F.italic, fontSize: 14, lineHeight: 20, marginTop: 24 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  liveName: { fontFamily: F.display, fontSize: 22, lineHeight: 25, letterSpacing: -0.44 },
  note: { fontFamily: F.italic, fontSize: 13.5, lineHeight: 19 },
  item: { gap: 3, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  itemName: { fontFamily: F.semi, fontSize: 15, lineHeight: 19, flexShrink: 1 },
  itemDate: { fontFamily: F.light, fontSize: 12.5 },
  fab: { position: 'absolute', right: 20 },
  fabBtn: { minHeight: 52, paddingHorizontal: 20, borderRadius: RADIUS, flexDirection: 'row', alignItems: 'center', gap: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { paddingHorizontal: 16, paddingTop: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: StyleSheet.hairlineWidth, gap: 12 },
  calHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calTitle: { fontFamily: F.display, fontSize: 20, letterSpacing: -0.3 },
  navBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2, alignItems: 'center', justifyContent: 'center' },
  day: { width: '100%', height: '100%', borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  todayDot: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2 },
});
