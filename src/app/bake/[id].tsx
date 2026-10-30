import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  alarmsAvailable,
  alarmStatus,
  openExactAlarmSettings,
  openFullScreenSettings,
  openNotificationSettings,
  stopRinging,
  testAlarm,
} from '../../../modules/handbake-alarm';
import { BellIcon, Button, ChevronIcon, Chip, CloseIcon, Mono, PlusIcon, SectionHead, Stepper, Switch } from '../../components/ui';
import { GROUPS, KITCHEN_TEMPS, STEPS } from '../../config/bake-plan';
import { clock, countdown, dur, weekdayDay } from '../../lib/format';
import { baseDur, computePlan, durKey, tempFactor, type Plan, type Row } from '../../lib/plan';
import { useNow, useStore } from '../../lib/store';
import { F, useColors, type Colors } from '../../lib/theme';
import type { Bake } from '../../lib/types';

const SKIP_TEXT = {
  keep: ['Skip this step', 'Its time stays in the plan, so nothing else moves'],
  collapse: ['Skip this step', 'Removes its time, so the next steps move earlier'],
  swap: ['Proof at room temperature instead', 'Replaces the cold proof with a same-day proof'],
} as const;

export default function BakeScreen() {
  const { id, options } = useLocalSearchParams<{ id: string; options?: string }>();
  const store = useStore();
  const bake = store.bake(id);
  const c = useColors();
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const [optionsOpen, setOptionsOpen] = useState(options === '1');
  const [open, setOpen] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS').catch(() => {});
    }
  }, []);

  if (!bake) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: 20, paddingTop: insets.top + 20 }}>
        <BackLink c={c} />
        <Text style={{ fontFamily: F.body, color: c.mut, marginTop: 20 }}>This bread is gone.</Text>
      </View>
    );
  }

  const plan = computePlan(bake, now);
  const cur = plan.rows[plan.cur];
  const update = (fn: (b: Bake) => Bake) => store.updateBake(bake.id, fn);
  const silent = store.data.silent;
  // The current step is open until the baker opens or closes something.
  const openId = open === undefined ? (cur?.step.id ?? null) : open;

  const toggleSkip = (stepId: string) => {
    if (cur?.step.id === stepId) stopRinging();
    update((b) => {
      const skips = { ...b.skips };
      if (skips[stepId]) delete skips[stepId];
      else skips[stepId] = true;
      return { ...b, skips };
    });
  };

  const logNow = () => {
    if (!cur) return;
    store.logStep(bake.id, cur.step.id);
    setOpen(plan.rows[plan.cur + 1]?.step.id ?? null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 28 }}
      >
        <View style={s.top}>
          <BackLink c={c} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Silent mode"
            accessibilityState={{ checked: silent }}
            onPress={() => store.setSilent(!silent)}
            style={s.bell}
          >
            <BellIcon color={c.ink} silent={silent} />
          </Pressable>
        </View>

        <View style={s.titleRow}>
          <Text style={[s.h1, { color: c.ink }]}>{bake.name || 'Untitled bread'}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={optionsOpen ? 'Close dough options' : 'Dough options'}
            onPress={() => setOptionsOpen(!optionsOpen)}
            style={[s.plus, { borderColor: c.ink }]}
          >
            {optionsOpen ? <CloseIcon color={c.ink} /> : <PlusIcon color={c.ink} />}
          </Pressable>
        </View>

        {optionsOpen ? <Options bake={bake} plan={plan} c={c} onDone={() => setOptionsOpen(false)} /> : null}

        <SectionHead
          label={'One loaf · ' + bake.temp + ' °C kitchen'}
          note={'Ready ' + weekdayDay(plan.end, false).split(' ')[0] + ' ' + clock(plan.end)}
          style={{ marginTop: 26 }}
        />

        {cur ? <NextBlock row={cur} plan={plan} now={now} c={c} /> : <DoneBlock c={c} />}

        <Timeline plan={plan} bake={bake} now={now} c={c} openId={openId} setOpen={setOpen} update={update} toggleSkip={toggleSkip} />

        <Terms c={c} />
      </ScrollView>

      {cur ? (
        <View style={[s.bar, { borderTopColor: c.hair, backgroundColor: c.bg, paddingBottom: insets.bottom + 16 }]}>
          <Button label={cur.step.skip === 'swap' ? (cur.step.swapped ? 'Cold proof' : 'Proof warm') : 'Skip'} kind="outline" style={{ paddingHorizontal: 16 }} onPress={() => toggleSkip(cur.step.id)} />
          <Button label={cur.step.action + ' now'} style={{ flex: 1 }} onPress={logNow} />
        </View>
      ) : null}
    </View>
  );
}

function BackLink({ c }: { c: Colors }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={s.back}
      hitSlop={6}
    >
      <ChevronIcon color={c.ink} dir="left" />
      <Text style={{ fontFamily: F.body, fontSize: 14, color: c.ink }}>Breads</Text>
    </Pressable>
  );
}

function NextBlock({ row, plan, now, c }: { row: Row; plan: Plan; now: number; c: Colors }) {
  const diff = (row.planned - now) / 1000;
  const late = plan.started && diff < 0;
  const head = !plan.started ? 'First step at ' + clock(row.planned) : late ? 'Due at ' + clock(row.planned) + ' · late' : 'Next at ' + clock(row.planned);
  return (
    <View style={{ paddingTop: 18, paddingBottom: 4 }}>
      <Mono style={{ fontSize: 10.5, letterSpacing: 0.84 }}>{head.toUpperCase()}</Mono>
      <Text
        accessibilityRole="timer"
        accessibilityLabel={(late ? 'Time overdue for ' : 'Time left until ') + row.step.name}
        style={[s.countdown, { color: c.ink }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {(late ? '+' : '') + countdown(Math.abs(diff))}
      </Text>
      <Text style={[s.nextName, { color: c.ink }]}>{row.step.name}</Text>
    </View>
  );
}

function DoneBlock({ c }: { c: Colors }) {
  return (
    <View style={{ paddingTop: 18, paddingBottom: 4 }}>
      <Mono style={{ fontSize: 10.5, letterSpacing: 0.84 }}>BAKE LOGGED</Mono>
      <Text style={[s.done, { color: c.ink }]}>Enjoy the loaf</Text>
    </View>
  );
}

function Timeline({
  plan,
  bake,
  now,
  c,
  openId,
  setOpen,
  update,
  toggleSkip,
}: {
  plan: Plan;
  bake: Bake;
  now: number;
  c: Colors;
  openId: string | null;
  setOpen: (id: string | null) => void;
  update: (fn: (b: Bake) => Bake) => void;
  toggleSkip: (id: string) => void;
}) {
  const out: React.ReactNode[] = [];
  const day0 = new Date(plan.rows[0].start);
  day0.setHours(0, 0, 0, 0);
  let lastDay = -1;
  let lastGroup: string | undefined;
  plan.rows.forEach((r, i) => {
    const d = Math.floor((r.start - day0.getTime()) / 86_400_000);
    if (d !== lastDay) {
      out.push(<SectionHead key={'d' + d} label={'Day ' + (d + 1)} note={weekdayDay(r.start)} style={{ marginTop: 26 }} />);
      lastDay = d;
    }
    const g = r.step.group;
    if (g && g !== lastGroup) {
      const gs = plan.rows.filter((x) => x.step.group === g);
      const total = gs.reduce((a, x) => a + x.dur, 0);
      out.push(
        <View key={'g' + g} style={s.grp}>
          <Text style={[s.grpLabel, { color: c.mut }]}>{GROUPS[g].toUpperCase()}</Text>
          <Mono>{clock(gs[0].start) + '–' + clock(gs[0].start + total * 60_000)}</Mono>
        </View>,
      );
    }
    lastGroup = g;
    if (plan.started && r.status === 'current' && !r.late) {
      out.push(
        <View key="now" style={s.now}>
          <Mono style={{ color: c.ink, fontSize: 10.5, letterSpacing: 0.84 }}>NOW {clock(now)}</Mono>
          <View style={{ flex: 1, height: 1, backgroundColor: c.ink }} />
        </View>,
      );
    }
    out.push(
      <StepRow
        key={r.step.id}
        row={r}
        next={plan.rows[i + 1]}
        bake={bake}
        c={c}
        open={openId === r.step.id}
        onToggle={() => setOpen(openId === r.step.id ? null : r.step.id)}
        update={update}
        toggleSkip={toggleSkip}
      />,
    );
  });
  return <View style={{ paddingBottom: 28 }}>{out}</View>;
}

function waitText(r: Row, next?: Row) {
  const s = r.step;
  if (r.status === 'skipped' && r.dur === 0) return 'Removed from the plan';
  if (r.dur <= 0) return '';
  // On its own line, so the first line stays short while the duration changes.
  const over = next?.ov ? '\nNext step starts ' + dur(next.ov) + ' before' : '';
  if (r.status === 'skipped') return s.waitLabel ? s.waitLabel + ' · ' + dur(r.dur) : dur(r.dur) + ' kept in the plan';
  if (s.swapped) return 'Proofing ' + dur(r.dur);
  if (s.waitLabel) return s.waitLabel + ' · ' + dur(r.dur) + over;
  return (s.ferment ? 'Fermenting ' + dur(r.dur) : dur(r.dur) + ' until next step') + over;
}

function StepRow({
  row: r,
  next,
  bake,
  c,
  open,
  onToggle,
  update,
  toggleSkip,
}: {
  row: Row;
  next?: Row;
  bake: Bake;
  c: Colors;
  open: boolean;
  onToggle: () => void;
  update: (fn: (b: Bake) => Bake) => void;
  toggleSkip: (id: string) => void;
}) {
  const st = r.step;
  const done = r.status === 'done';
  const skipped = r.status === 'skipped';
  const current = r.status === 'current';
  const nameColor = done || current ? c.ink : c.mut;
  const wait = !done ? waitText(r, next) : '';
  const delta = done ? Math.round((r.start - r.planned) / 60_000) : 0;
  const timeCol = useTimeCol();

  return (
    <View style={[s.row, { borderBottomColor: c.hair }]}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={s.rowHead}>
        <View style={{ width: timeCol, paddingRight: 10 }}>
          <Text numberOfLines={1} style={[s.t, { color: done || current ? c.ink : c.mut, fontFamily: current ? F.semi : F.light }, skipped && s.strike]}>
            {clock(current ? r.planned : r.start)}
          </Text>
          {done && Math.abs(delta) >= 3 ? <Mono style={{ fontSize: 10 }}>{(delta > 0 ? '+' : '−') + dur(Math.abs(delta))}</Mono> : null}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          {skipped ? <Mono style={{ fontSize: 10.5, letterSpacing: 0.84 }}>SKIPPED</Mono> : null}
          {current && r.late ? <Mono style={{ fontSize: 10.5, letterSpacing: 0.84, color: c.ink }}>{dur(r.late).toUpperCase()} LATE</Mono> : null}
          <Text style={[s.nm, { color: nameColor, fontFamily: current ? F.semi : F.body }, skipped && s.strike]}>{st.name}</Text>
          {r.log ? (
            <Text style={[s.it, { color: c.mut }]}>
              {st.action} at {clock(r.log.at)}
              {r.log.note ? ' · ' + r.log.note : ''}
            </Text>
          ) : null}
          {wait ? <Text style={[s.it, { color: current ? c.ink : c.mut }]}>{wait}</Text> : null}
        </View>
      </Pressable>
      {open ? <StepDetail row={r} bake={bake} c={c} update={update} toggleSkip={toggleSkip} /> : null}
    </View>
  );
}

// Width of the time column. It grows with the system font size so times never
// wrap, and the step details indent by the same amount to line up with the names.
function useTimeCol() {
  const { fontScale } = useWindowDimensions();
  return Math.ceil(42 * fontScale) + 10;
}

function StepDetail({
  row: r,
  bake,
  c,
  update,
  toggleSkip,
}: {
  row: Row;
  bake: Bake;
  c: Colors;
  update: (fn: (b: Bake) => Bake) => void;
  toggleSkip: (id: string) => void;
}) {
  const st = r.step;
  const factor = tempFactor(bake.temp);
  const base = baseDur(bake, st);
  const stepDur = (dir: 1 | -1) =>
    update((b) => {
      const step = st.ferment ? st.adjust / factor : st.adjust;
      const grid = st.adjust < 5 ? 1 : 5;
      const nv = Math.max(st.adjust, Math.round((baseDur(b, st) + dir * step) / grid) * grid);
      return { ...b, durs: { ...b.durs, [durKey(st)]: nv } };
    });
  const note = r.log ? r.log.note : (bake.notes[st.id] ?? '');
  const setNote = (text: string) =>
    update((b) =>
      b.logs[st.id] ? { ...b, logs: { ...b.logs, [st.id]: { ...b.logs[st.id], note: text } } } : { ...b, notes: { ...b.notes, [st.id]: text } },
    );
  const editLogTime = () => {
    if (!r.log) return;
    const value = new Date(r.log.at);
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: true,
      onChange: (e: DateTimePickerEvent, d?: Date) => {
        if (e.type !== 'set' || !d) return;
        const at = new Date(value);
        at.setHours(d.getHours(), d.getMinutes(), 0, 0);
        update((b) => ({
          ...b,
          logs: { ...b.logs, [st.id]: { ...b.logs[st.id], at: at.getTime() } },
          start: st.id === STEPS[0].id ? at.getTime() : b.start,
        }));
      },
    });
  };
  const undo = () =>
    update((b) => {
      const logs = { ...b.logs };
      STEPS.slice(r.index).forEach((x) => delete logs[x.id]);
      return { ...b, logs };
    });
  const skip = SKIP_TEXT[st.skip];
  const timeCol = useTimeCol();

  return (
    <View style={[s.detail, { paddingLeft: timeCol }]}>
      <Text style={[s.about, { color: c.ink }]}>{st.about}</Text>
      <View style={[s.meta, { backgroundColor: c.soft }]}>
        {st.typical ? (
          <KV label="Typical" c={c}>
            <Text style={[s.kvVal, { color: c.ink }]}>{st.typical}</Text>
          </KV>
        ) : null}
        {st.adjust ? (
          <KV label="Until next step" c={c}>
            <Stepper value={dur(r.dur)} onDec={() => stepDur(-1)} onInc={() => stepDur(1)} label="Duration" />
          </KV>
        ) : null}
        {st.ferment && factor !== 1 ? <Mono>Scaled for {bake.temp} °C from {dur(base)}</Mono> : null}
        {r.ov ? (
          <KV label="Overlap" c={c}>
            <Text style={[s.kvVal, { color: c.ink }]}>Starts {dur(r.ov)} before the previous step ends</Text>
          </KV>
        ) : null}
        {!r.log ? (
          <KV label={skip[0]} sub={skip[1]} c={c}>
            <Switch on={!!bake.skips[st.id]} onPress={() => toggleSkip(st.id)} label={skip[0]} />
          </KV>
        ) : (
          <KV label="Logged at" c={c}>
            <Button label={clock(r.log.at)} kind="outline" small onPress={editLogTime} style={{ minWidth: 92 }} />
          </KV>
        )}
      </View>
      {st.id === 'slice' ? (
        <View style={{ gap: 6 }}>
          <Mono>RATING</Mono>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Chip key={n} label={n + '/5'} on={bake.rating === n} onPress={() => update((b) => ({ ...b, rating: b.rating === n ? undefined : n }))} />
            ))}
          </View>
        </View>
      ) : null}
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="How did it look, smell, feel?"
        placeholderTextColor={c.mut}
        multiline
        accessibilityLabel="Note for this dough"
        style={[s.input, { borderColor: c.hair, color: c.ink }]}
      />
      {r.log ? (
        <Pressable onPress={undo} style={{ paddingVertical: 8, alignSelf: 'flex-start' }}>
          <Text style={{ fontFamily: F.body, fontSize: 14, color: c.mut, textDecorationLine: 'underline' }}>Undo this log entry and the ones after</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function KV({ label, sub, c, children }: { label: string; sub?: string; c: Colors; children: React.ReactNode }) {
  return (
    <View style={s.kv}>
      <View style={{ flexShrink: 1 }}>
        <Text style={{ fontFamily: F.body, fontSize: 14, color: c.mut }}>{label}</Text>
        {sub ? <Text style={{ fontFamily: F.light, fontSize: 12, color: c.mut }}>{sub}</Text> : null}
      </View>
      <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{children}</View>
    </View>
  );
}

function Options({ bake, plan, c, onDone }: { bake: Bake; plan: Plan; c: Colors; onDone: () => void }) {
  const store = useStore();
  const update = (fn: (b: Bake) => Bake) => store.updateBake(bake.id, fn);
  const [status, setStatus] = useState(alarmStatus());
  const [hint, setHint] = useState('');
  const [pickDate, setPickDate] = useState<'date' | 'time' | null>(null);
  const defaults = store.data.defaults;

  const pickStart = (mode: 'date' | 'time') => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: new Date(bake.start), mode, is24Hour: true, onChange: (e, d) => e.type === 'set' && d && setStart(mode, d) });
    } else setPickDate(mode);
  };
  const setStart = (mode: 'date' | 'time', d: Date) => {
    const x = new Date(bake.start);
    if (mode === 'date') x.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    else x.setHours(d.getHours(), d.getMinutes(), 0, 0);
    update((b) => ({ ...b, start: x.getTime() }));
  };

  const defaultsText = defaults
    ? 'Saved ' + weekdayDay(defaults.savedAt) + '. New breads start from your timings, skipped steps and ' + defaults.temp + ' °C.'
    : 'New breads start from the standard plan.';

  return (
    <View style={[s.options, { borderColor: c.hair }]}>
      <Field label="Bread name" c={c}>
        <TextInput
          value={bake.name}
          onChangeText={(name) => update((b) => ({ ...b, name }))}
          style={[s.input, { minHeight: 44, borderColor: c.hair, color: c.ink }]}
          placeholder="Name this bread"
          placeholderTextColor={c.mut}
          returnKeyType="done"
          selectTextOnFocus
        />
      </Field>

      <Field label="Feed the starter at" c={c}>
        {plan.started ? (
          <Text style={{ fontFamily: F.body, fontSize: 14, color: c.ink }}>
            {weekdayDay(bake.start)} {clock(bake.start)} · locked once the first step is logged
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label={weekdayDay(bake.start)} kind="outline" small onPress={() => pickStart('date')} style={{ flex: 1 }} />
            <Button label={clock(bake.start)} kind="outline" small onPress={() => pickStart('time')} style={{ flex: 1 }} />
          </View>
        )}
        {pickDate ? (
          <DateTimePicker
            value={new Date(bake.start)}
            mode={pickDate}
            is24Hour
            onChange={(e, d) => {
              setPickDate(null);
              if (e.type === 'set' && d) setStart(pickDate, d);
            }}
          />
        ) : null}
      </Field>

      <Field label="Kitchen temperature (scales starter and bulk rise)" c={c}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {KITCHEN_TEMPS.map((t) => (
            <Chip key={t.celsius} label={t.label} on={bake.temp === t.celsius} onPress={() => update((b) => ({ ...b, temp: t.celsius }))} />
          ))}
        </View>
      </Field>

      <Field label="Defaults for new breads" c={c}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Save defaults" kind="outline" small style={{ flex: 1 }} onPress={() => store.saveDefaults(bake)} />
          <Button label="Reset to standard" kind="outline" small style={{ flex: 1 }} onPress={() => store.resetDefaults()} />
        </View>
        <Text style={[s.hint, { color: c.mut }]}>{defaultsText}</Text>
      </Field>

      <Field label="Alarms" c={c}>
        {!alarmsAvailable ? (
          <Text style={[s.hint, { color: c.mut }]}>
            {Platform.OS === 'android'
              ? 'Alarms need the Handbake app itself. Expo Go cannot ring with the app closed.'
              : 'Alarms are only built for Android so far.'}
          </Text>
        ) : (
          <>
            <Button
              label="Test alarm in 10 seconds"
              kind="outline"
              small
              onPress={() => {
                testAlarm(store.data.silent, 10);
                setHint(store.data.silent ? 'A notification arrives in 10 seconds. Silent mode is on.' : 'Rings in 10 seconds. Lock the phone or close the app to try it.');
              }}
            />
            {hint ? <Text style={[s.hint, { color: c.mut }]}>{hint}</Text> : null}
            {status && !status.notifications ? (
              <Fix c={c} text="Notifications are off, so alarms can't show their buttons." label="Allow notifications" onPress={() => openNotificationSettings()} onBack={() => setStatus(alarmStatus())} />
            ) : null}
            {status && !status.exactAlarms ? (
              <Fix c={c} text="Exact alarms are not allowed, so alarms may come late." label="Allow alarms" onPress={() => openExactAlarmSettings()} onBack={() => setStatus(alarmStatus())} />
            ) : null}
            {status && !status.fullScreen ? (
              <Fix c={c} text="Full-screen alarms are off, so the lock screen shows a notification instead." label="Allow full screen" onPress={() => openFullScreenSettings()} onBack={() => setStatus(alarmStatus())} />
            ) : null}
          </>
        )}
      </Field>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          label="Delete this bread"
          kind="outline"
          small
          style={{ flex: 1 }}
          onPress={() =>
            Alert.alert('Delete this bread?', 'Its log is removed from this phone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  store.deleteBake(bake.id);
                  router.replace('/');
                },
              },
            ])
          }
        />
        <Button label="Done" small style={{ flex: 1 }} onPress={onDone} />
      </View>
    </View>
  );
}

function Fix({ c, text, label, onPress, onBack }: { c: Colors; text: string; label: string; onPress: () => void; onBack: () => void }) {
  return (
    <View style={{ gap: 6, marginTop: 8 }}>
      <Text style={[s.hint, { color: c.ink }]}>{text}</Text>
      <Button
        label={label}
        small
        onPress={() => {
          onPress();
          setTimeout(onBack, 1500);
        }}
      />
    </View>
  );
}

function Field({ label, c, children }: { label: string; c: Colors; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: F.body, fontSize: 13, color: c.mut }}>{label}</Text>
      {children}
    </View>
  );
}

const TERMS: [string, string][] = [
  ['Starter', 'The culture of wild yeast and bacteria you keep and feed between bakes.'],
  ['Skipped step', 'A step you turned off for this dough. It stays in the log greyed out. Skipping a hands-on step keeps its time in the plan; skipping a waiting step removes its time, so the next step moves up. Skipping the cold proof switches to a room-temperature proof.'],
  ['Peak', 'The moment the fed starter has risen the most, just before it starts to fall. The best time to mix it in.'],
  ['Autolyse', 'Resting flour and water before adding starter and salt, so gluten develops with less kneading.'],
  ['Bulk fermentation', 'The first rise of the whole dough, from adding the starter until it has grown 50–75%.'],
  ['Stretch & fold', 'A gentle way to build strength during bulk instead of kneading. A set is one round of folds on all sides.'],
  ['Pre-shape and bench rest', 'A loose first rounding of the dough, then a short rest so the gluten relaxes before the final shape.'],
  ['Banneton', 'The proofing basket that holds the loaf’s shape during the final proof.'],
  ['Cold proof', 'Final proof in the fridge, usually overnight. Adds flavour and makes timing flexible.'],
  ['Scoring', 'Cutting the surface just before baking so the loaf expands where you choose.'],
  ['Oven spring', 'The rapid rise in the first minutes of baking.'],
  ['Crumb', 'The inside structure of the bread: open or tight, glossy or dry.'],
];

function Terms({ c }: { c: Colors }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hair }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={s.termsHead}>
        <Text style={{ fontFamily: F.body, fontSize: 14, color: c.mut }}>Terms used</Text>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
          <ChevronIcon color={c.mut} dir="right" />
        </View>
      </Pressable>
      {open
        ? TERMS.map(([t, d]) => (
            <View key={t} style={{ paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.hair }}>
              <Text style={{ fontFamily: F.semi, fontSize: 14.5, color: c.ink }}>{t}</Text>
              <Text style={{ fontFamily: F.light, fontSize: 14, lineHeight: 20, color: c.mut, marginTop: 2 }}>{d}</Text>
            </View>
          ))
        : null}
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  bell: { width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 18 },
  h1: { flexShrink: 1, fontFamily: F.display, fontSize: 34, lineHeight: 36, letterSpacing: -0.85 },
  plus: { width: 30, height: 30, marginBottom: 3, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  options: { marginTop: 18, gap: 18, paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  countdown: { fontFamily: F.displayLight, fontSize: 84, lineHeight: 90, letterSpacing: -3.4, marginTop: 6, fontVariant: ['tabular-nums'] },
  nextName: { fontFamily: F.semi, fontSize: 18, lineHeight: 23, marginTop: 4 },
  done: { fontFamily: F.displayLight, fontSize: 48, lineHeight: 52, letterSpacing: -1.4, marginTop: 6 },
  grp: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 16, paddingBottom: 4 },
  grpLabel: { fontFamily: F.medium, fontSize: 11, letterSpacing: 0.66 },
  now: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10 },
  row: { borderBottomWidth: StyleSheet.hairlineWidth },
  rowHead: { flexDirection: 'row', paddingVertical: 9, minHeight: 44 },
  t: { fontSize: 13, lineHeight: 20, fontVariant: ['tabular-nums'] },
  nm: { fontSize: 14.5, lineHeight: 20 },
  it: { fontFamily: F.italic, fontSize: 13, lineHeight: 18 },
  strike: { textDecorationLine: 'line-through' },
  detail: { paddingBottom: 14, gap: 12 },
  about: { fontFamily: F.light, fontSize: 14.5, lineHeight: 21 },
  meta: { borderRadius: 10, padding: 12, gap: 10 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  kvVal: { fontFamily: F.body, fontSize: 14, textAlign: 'right' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 64, fontFamily: F.body, fontSize: 15, textAlignVertical: 'top' },
  hint: { fontFamily: F.light, fontSize: 13, lineHeight: 18 },
  termsHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  bar: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});

