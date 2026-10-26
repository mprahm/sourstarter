import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { F, RADIUS, useColors } from '../lib/theme';

/** Small uppercase heading over a hairline rule, with an optional mono note on the right. */
export function SectionHead({ label, note, style }: { label: string; note?: string; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[styles.sh, { borderBottomColor: c.hair }, style]}>
      <Text style={[styles.shLabel, { color: c.ink }]} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
      {note ? <Text style={[styles.mono, { color: c.mut }]}>{note.toUpperCase()}</Text> : null}
    </View>
  );
}

export function Mono({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[styles.mono, { color: c.mut }, style]}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'outline';
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const c = useColors();
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        primary ? { backgroundColor: c.ink } : { borderWidth: 1, borderColor: c.ink },
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      <Text style={[styles.btnText, small && { fontSize: 14 }, { color: primary ? c.bg : c.ink }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.chip, { borderColor: on ? c.ink : c.hair, backgroundColor: on ? c.ink : 'transparent' }]}
    >
      <Text style={{ fontFamily: F.body, fontSize: 14, color: on ? c.bg : c.ink }}>{label}</Text>
    </Pressable>
  );
}

/** − value + */
export function Stepper({ value, onDec, onInc, label }: { value: string; onDec: () => void; onInc: () => void; label: string }) {
  const c = useColors();
  return (
    <View style={[styles.stepper, { borderColor: c.hair }]}>
      <Pressable accessibilityLabel={label + ', shorter'} onPress={onDec} style={styles.stepBtn} hitSlop={4}>
        <Text style={[styles.stepSign, { color: c.ink }]}>−</Text>
      </Pressable>
      <Text style={[styles.stepVal, { color: c.ink }]}>{value}</Text>
      <Pressable accessibilityLabel={label + ', longer'} onPress={onInc} style={styles.stepBtn} hitSlop={4}>
        <Text style={[styles.stepSign, { color: c.ink }]}>+</Text>
      </Pressable>
    </View>
  );
}

export function Switch({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      onPress={onPress}
      hitSlop={6}
      style={[styles.switch, { borderColor: on ? c.ink : c.hair, backgroundColor: on ? c.ink : 'transparent' }]}
    >
      <View style={[styles.knob, { backgroundColor: on ? c.bg : c.mut, left: on ? 23 : 3 }]} />
    </Pressable>
  );
}

const stroke = { fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function BellIcon({ color, silent }: { color: string; silent: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" stroke={color} {...stroke} />
      <Path d="M10 20.5a2 2 0 0 0 4 0" stroke={color} {...stroke} />
      {silent ? <Path d="M4 3.5l16 17" stroke={color} {...stroke} /> : null}
    </Svg>
  );
}

export function PlusIcon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path d="M8 2v12M2 8h12" stroke={color} {...stroke} strokeWidth={1.6} />
    </Svg>
  );
}

export function CloseIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 16 16">
      <Path d="M3 3l10 10M13 3L3 13" stroke={color} {...stroke} strokeWidth={1.6} />
    </Svg>
  );
}

export function ChevronIcon({ color, dir }: { color: string; dir: 'left' | 'right' }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} stroke={color} {...stroke} />
    </Svg>
  );
}

export function CalendarIcon({ color, dot }: { color: string; dot?: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Rect x={3.5} y={5} width={17} height={15} rx={1} stroke={color} {...stroke} strokeWidth={1.4} />
      <Path d="M3.5 10h17M8 3v4M16 3v4" stroke={color} {...stroke} strokeWidth={1.4} />
      {dot ? <Rect x={15} y={13} width={4} height={4} rx={2} fill={color} /> : null}
    </Svg>
  );
}

export const styles = StyleSheet.create({
  sh: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shLabel: { fontFamily: F.medium, fontSize: 11, letterSpacing: 0.66, flexShrink: 1 },
  mono: { fontFamily: F.mono, fontSize: 11, letterSpacing: 0.5 },
  btn: { minHeight: 56, borderRadius: RADIUS, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnSmall: { minHeight: 44 },
  btnText: { fontFamily: F.semi, fontSize: 16 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10 },
  stepBtn: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontFamily: F.mono, fontSize: 18 },
  stepVal: { minWidth: 84, textAlign: 'center', fontFamily: F.mono, fontSize: 14 },
  switch: { width: 52, height: 32, borderRadius: 999, borderWidth: 1 },
  knob: { position: 'absolute', top: 3, width: 24, height: 24, borderRadius: 12 },
});
