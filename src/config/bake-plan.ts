// ─────────────────────────────────────────────────────────────────────────────
//  HANDBAKE BAKE PLAN
//
//  This is the one file to edit when you want to change the standard bake.
//  Every new bread starts from these values (unless you have pressed
//  "Save defaults" in the app, which stores your own changes on the phone).
//
//  All times are in MINUTES. Keep the steps in the order you bake them.
//
//  Per step:
//    name      What the timeline and the alarm call the step.
//    action    Text on the "… now" button, and in the log ("Folded at 15:12").
//    minutes   How long until the NEXT step starts.
//    adjust    How many minutes the – and + buttons change it by (0 = fixed).
//    typical   A hint shown when the step is opened.
//    about     The longer description shown when the step is opened.
//    skip      What skipping the step does:
//                'keep'     a hands-on step: its time stays, nothing moves
//                'collapse' a waiting step: its time is removed, later steps move up
//                'swap'     replaced by the `swap` step below (only the cold proof)
//    overlap   Optional. Start this many minutes before the previous step ends.
//    ferment   Optional. true = scaled by kitchen temperature (see KITCHEN_TEMPS).
//    group     Optional. Groups steps under a heading ('bulk' or 'bake').
//    waitLabel Optional. Replaces "45 min until next step" under the step.
//
//  After editing, the change shows immediately in a development build and in
//  the next APK you build.
// ─────────────────────────────────────────────────────────────────────────────

export type SkipKind = 'keep' | 'collapse' | 'swap';

export type StepConfig = {
  id: string;
  name: string;
  action: string;
  minutes: number;
  adjust: number;
  typical?: string;
  about: string;
  skip: SkipKind;
  overlap?: number;
  ferment?: boolean;
  group?: 'bulk' | 'bake';
  waitLabel?: string;
  /** Used instead of name/about when the autolyse is skipped. */
  ifAutolyseSkipped?: { name: string; about: string };
  /** The step that replaces this one when skipped with skip: 'swap'. */
  swap?: { name: string; action: string; minutes: number; adjust: number; typical?: string; about: string; ferment?: boolean };
};

export const STEPS: StepConfig[] = [
  {
    id: 'feed',
    name: 'Feed the starter',
    action: 'Fed',
    minutes: 360,
    adjust: 30,
    typical: '4–12 h, until it peaks',
    about: 'Mix starter with fresh flour and water, for example 1:2:2 by weight. It is ready at peak: doubled, domed and bubbly on top.',
    skip: 'collapse',
    ferment: true,
  },
  {
    id: 'autolyse',
    name: 'Autolyse',
    action: 'Mixed',
    minutes: 60,
    adjust: 15,
    typical: '30 min – 2 h',
    about: 'Mix only the flour and water until no dry bits remain, then cover. Gluten starts forming on its own, so the dough needs less work later.',
    skip: 'keep',
    overlap: 60, // starts 1 h before the starter peaks
  },
  {
    id: 'mix',
    name: 'Add starter and salt',
    action: 'Mixed',
    minutes: 30,
    adjust: 5,
    typical: '5–15 min of work',
    about: 'Add the active starter, then the salt with a splash of reserved water. Pinch and fold until fully combined. Bulk fermentation starts the moment the starter goes in.',
    skip: 'keep',
    group: 'bulk',
    ifAutolyseSkipped: {
      name: 'Mix the dough',
      about: 'Mix flour, water and active starter until no dry bits remain, then add the salt with a splash of reserved water. Pinch and fold until fully combined. Bulk fermentation starts now.',
    },
  },
  {
    id: 'fold1',
    name: 'Stretch & fold, set 1',
    action: 'Folded',
    minutes: 30,
    adjust: 5,
    typical: 'every 30–45 min',
    about: 'With wet hands, lift one side of the dough and fold it over itself. Turn the bowl and repeat on all four sides. Coil folds work just as well.',
    skip: 'keep',
    group: 'bulk',
  },
  {
    id: 'fold2',
    name: 'Stretch & fold, set 2',
    action: 'Folded',
    minutes: 30,
    adjust: 5,
    typical: 'every 30–45 min',
    about: 'Same as set 1. The dough should already feel smoother and hold its shape a little longer.',
    skip: 'keep',
    group: 'bulk',
  },
  {
    id: 'fold3',
    name: 'Stretch & fold, set 3',
    action: 'Folded',
    minutes: 30,
    adjust: 5,
    typical: 'every 30–45 min',
    about: 'Be gentler now. Stop folding early if the dough is already strong and holds a tight ball.',
    skip: 'keep',
    group: 'bulk',
  },
  {
    id: 'fold4',
    name: 'Stretch & fold, set 4',
    action: 'Folded',
    minutes: 150, // the rest of bulk fermentation, untouched
    adjust: 15,
    typical: '1½–3½ h until bulk is done',
    about: 'Last set. After this, leave the dough alone until bulk is done: it has grown 50–75%, feels airy, jiggles when you shake the bowl, and shows bubbles on the sides and top. Judge the dough, not the clock.',
    skip: 'keep', // skipping only skips the fold; the rise time stays
    group: 'bulk',
    ferment: true,
    waitLabel: 'Rest of bulk, untouched',
  },
  {
    id: 'preshape',
    name: 'Pre-shape',
    action: 'Pre-shaped',
    minutes: 20,
    adjust: 5,
    typical: '20–40 min bench rest',
    about: 'Turn the dough onto an unfloured bench and gently round it with a bench scraper. Leave it uncovered while it relaxes.',
    skip: 'collapse',
    waitLabel: 'Bench rest',
  },
  {
    id: 'shape',
    name: 'Final shape',
    action: 'Shaped',
    minutes: 10,
    adjust: 5,
    typical: '5–10 min',
    about: 'Shape with good surface tension and place seam-up in a floured banneton. Rice flour sticks the least.',
    skip: 'collapse',
  },
  {
    id: 'proof',
    name: 'Cold proof',
    action: 'In the fridge',
    minutes: 840,
    adjust: 60,
    typical: '8–48 h at 3–5 °C',
    about: 'Cover the banneton and refrigerate. Cold slows the yeast while flavour keeps developing, and a cold loaf is easier to score.',
    skip: 'swap',
    waitLabel: 'In the fridge',
    swap: {
      name: 'Room-temperature proof',
      action: 'Proofing',
      minutes: 120,
      adjust: 15,
      typical: '1–3 h, until it springs back slowly when poked',
      about: 'Cover the banneton and leave it on the counter. The loaf is ready when a floured fingertip leaves a dent that springs back slowly.',
      ferment: true,
    },
  },
  {
    id: 'preheat',
    name: 'Preheat oven',
    action: 'Oven on',
    minutes: 30,
    adjust: 15,
    typical: '45–60 min',
    about: 'Heat the oven to 250 °C with the Dutch oven inside. This starts while the loaf is still proofing.',
    skip: 'collapse',
    overlap: 60, // starts 1 h before the proof ends
  },
  {
    id: 'bakeon',
    name: 'Score and bake, lid on',
    action: 'In the oven',
    minutes: 15,
    adjust: 1,
    typical: '20 min at 250 °C',
    about: 'Turn the loaf out onto parchment, score it, and lower it into the hot pot. The lid traps steam so the loaf can expand freely.',
    skip: 'keep',
    group: 'bake',
  },
  {
    id: 'bakeoff',
    name: 'Bake, lid off',
    action: 'Lid off',
    minutes: 15,
    adjust: 1,
    typical: '20–30 min at 230 °C',
    about: 'Remove the lid and lower the heat to 230 °C. Bake until deep brown. The inside should reach about 96–98 °C.',
    skip: 'keep',
    group: 'bake',
  },
  {
    id: 'cool',
    name: 'Cool on a rack',
    action: 'Out of the oven',
    minutes: 60,
    adjust: 15,
    typical: '1–2 h',
    about: 'The crumb is still cooking as it cools. Slicing early gives a gummy interior.',
    skip: 'collapse',
  },
  {
    id: 'slice',
    name: 'Slice and rate',
    action: 'Sliced',
    minutes: 0,
    adjust: 0,
    about: 'Note how it turned out: oven spring, crumb, crust colour, sourness. This becomes the reference for your next bake.',
    skip: 'keep',
  },
];

/** Headings for grouped steps. */
export const GROUPS = { bulk: 'Bulk fermentation', bake: 'Bake' } as const;

/**
 * Kitchen temperature choices. `factor` multiplies the steps marked
 * ferment: true (starter and the rest of bulk). 24 °C is the baseline.
 */
export const KITCHEN_TEMPS = [
  { celsius: 21, label: 'Cool 21 °C', factor: 1.4 },
  { celsius: 24, label: 'Warm 24 °C', factor: 1.0 },
  { celsius: 27, label: 'Hot 27 °C', factor: 0.7 },
];
export const DEFAULT_TEMP = 24;

/** Snooze length on the alarm, in minutes. */
export const SNOOZE_MINUTES = 5;
