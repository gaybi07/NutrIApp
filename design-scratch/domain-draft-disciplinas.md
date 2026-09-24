# BORRADOR — propuesta sin confirmar, no forma parte de CONTEXT.md todavía

This is a brainstorm of possible new glossary terms, written in the same
format CONTEXT.md uses, to prep for a future conversation with the product
owner about supporting disciplines beyond strength training (yoga, aerobic,
pilates, stretching, athletics, team sports). Nothing here is decided, nothing
here should be implemented — it's vocabulary to react to, not a spec.

Two pieces of prior art already in the codebase are worth knowing before
reading the rest: `TrainingSession` (`intensidad` + `minutos` + optional
`tipo: "fuerza" | "aerobico"` + optional freeform `disciplina` string) already
logs a day's activity as a whole, without exercises — and
`AEROBIC_DISCIPLINE_SUGGESTIONS` already lists Yoga, Fútbol, Handball, Vóley
alongside Running and Bici as an open (non-enum) suggestion list. So the app
has already taken a first step toward "whole-session, non-strength" tracking
at the daily-log level. What's missing is the same idea at the *Routine* /
*Trainer Routine* / *live workout* level, which today are hard-wired to
`ejercicios: ExerciseEntry[]`.

---

## 1. A term for "what kind of training this is"

**Training Discipline** (working name — alternatives: *Modality*, *Training
Mode*):
What a Routine, Trainer Routine, or logged session represents at the
highest level — Fuerza, Aeróbico, Yoga, Pilates, Estiramiento, Atletismo, or
a specific team sport (Fútbol, Handball, Vóley, Hockey). Plausible values
would extend the existing `TrainingType` (`"fuerza" | "aerobico"`) rather
than replace it — e.g. splitting "aerobico" into more specific disciplines,
or adding a discipline field alongside it.
_Avoid_: Category, type (too generic once other "type" fields already exist
on these entities), Sport (too narrow — doesn't cover yoga/estiramiento)

How it would relate to `Routine` / `TrainerRoutine`: both are, today,
implicitly "Fuerza" — the `ejercicios: ExerciseEntry[]` field only makes
sense for exercise-based training. Proposal to react to: add an *optional*
`disciplina` field to `Routine`/`TrainerRoutine`, defaulting to "fuerza"
when absent — same pattern already used for `RoutineOrigin` (`undefined` ==
"personal") and `TrainingType` (`undefined` == "fuerza" for old sessions).
The discipline would then decide which tracking shape applies (see #2)
rather than the Routine always being exercise-shaped.

---

## 2. A term for a session tracked as a whole, not exercise-by-exercise

**Session Block** (working name — alternatives: *Freeform Session*,
*Open Session*):
A Routine (or a live workout) that is NOT broken into `ExerciseEntry`
items — instead it's described by duration, intensity, and free-text notes,
the same three fields `TrainingSession` already logs at the day level. The
point of the name is that it's ONE generic shape for any non-exercise
discipline (yoga class, football match, athletics session, pilates class),
not a different schema per sport. A Session Block would NOT invent
football-specific or yoga-specific fields — just duración + intensidad +
notas, exactly like today's `TrainingSession`, reused one level up.
_Avoid_: Cardio session (too narrow — doesn't cover yoga), Match/Class
(sport-specific, contradicts the "one shape for all" goal)

How it differs from today's `ExerciseEntry`-based tracking: `ExerciseEntry`
assumes a name + sets/reps/weight, which presumes discrete, repeatable
movements — meaningless for "played 90 minutes of fútbol" or "60 minutes of
yoga, moderate intensity." A Session Block sidesteps that by not trying to
decompose the activity at all. The minimal new concept needed is really just
"a Routine whose content is a Session Block instead of an `ejercicios`
list" — LiveWorkout, AssignedSession, and WorkoutExecution would each need
an equivalent freeform variant, but the SAME freeform shape would serve
yoga, aerobic, athletics, and team sports alike. Whether a Profe can attach
extra freeform notes/structure per class (e.g. a yoga sequence outline) is
an open question, not something to presuppose here (see #4).

---

## 3. Does `MuscleGroup` make sense outside strength training?

Short answer to react to: **not as-is**. `MuscleGroup` (pecho / espalda /
hombros / piernas / brazos / core) is a strength-training concept — it
measures volume by body region, which only means something when training is
already decomposed into discrete exercises with sets/reps/weight (see
`volumenSemanal` / "Volumen por grupo muscular" in `Settings`/`ActividadBlockId`,
which is computed from exactly this field).

For Session-Block disciplines (yoga, aerobic, team sports), there is no
per-exercise data to tag with a MuscleGroup, so the field simply wouldn't
apply — it should stay optional and scoped to exercise-based disciplines
(Fuerza, and possibly Atletismo if a Profe chooses to log it as sets of
exercises rather than as a Session Block). Nothing here proposes a
replacement concept for non-strength disciplines — that's an open question
for the product owner, not something to invent preemptively (see #4).

_Avoid_ (if this gets named later): "Focus Area" as a forced substitute for
MuscleGroup on every discipline — better to leave it genuinely absent for
Session-Block disciplines than to stretch MuscleGroup's meaning to cover
"legs" for a football match.

---

## 4. Open questions to flag for the product owner before real design

- **Team sports — whose data is this?** Is a Fútbol/Handball/Vóley/Hockey
  session just the account holder's own log (duration + intensity + notes,
  like Session Block above), or does the Profe eventually want per-player
  data (who played, individual performance) — which would be a much bigger
  feature, closer to a team-roster concept than a training log.
- **Yoga/Pilates — class-level or pose-level?** Does tracking stop at
  "60 minutes, moderate intensity, notes," or does the product owner want
  pose/exercise-level detail eventually (which would actually fit the
  *existing* `ExerciseEntry` model reasonably well, just with different
  vocabulary — "postura" instead of "ejercicio")? This changes whether Yoga
  is a Session-Block discipline or an exercise-based one.
- **Atletismo** is ambiguous on its own: sprints/reps look exercise-based;
  a distance run looks Session-Block-shaped. Might need to be a discipline
  that supports BOTH shapes rather than picking one.
- **Does every Profe get to define their own tracking shape**, or does the
  app ship a fixed small set of shapes (Exercise-based vs. Session Block)
  that every discipline maps to one of? The prompt that inspired this draft
  says the owner wants Profes to "adapt to their own discipline" — worth
  clarifying whether that means picking from a fixed menu of shapes, or
  truly custom fields per Profe (much bigger scope).
- **Metrics that assume Fuerza**: `StudentMetrics.volumenSemanal`,
  "Volumen por grupo muscular," and `WorkoutReportItem`'s mejor/similar/peor
  verdict all assume sets×reps×peso. If Session-Block disciplines become
  real, what's the equivalent "how's this student doing" number for a
  Profe running yoga or team-sport sessions — total minutes? Session
  adherence only, with no volume metric at all?
- **Adoption flow**: `TrainerRoutine` → `Routine` "adopt" today copies
  `ejercicios`. What would adopting a Session-Block Trainer Routine copy —
  presumably just the duration/intensity targets — and does that still
  make sense as "adoption" or is it closer to just picking a template?
