# Registro Nutricional

A personal nutrition, activity, and pantry tracker with an optional trainer/student relationship layered on top. A user logs meals, training, sleep, and pantry stock day by day; a trainer can be linked to a student to assign routines and review progress.

## Language

### Day & Meals

**DayEntry**:
The record for a single calendar date, holding that day's meal totals, training, sleep, and step data together.
_Avoid_: Log, record, entry

**Meal**:
One of the day's five eating occasions: desayuno, almuerzo, merienda, cena, colación. Each has its own macro totals and optional itemized breakdown.
_Avoid_: Comida (when meaning "food" generically — use Meal for the occasion, Product/Item for what's eaten)

**Meal Item**:
A single food entry within a Meal's itemized breakdown; the items' macros must sum to the Meal's totals.
_Avoid_: Product (a Meal Item may reference a Product, but is not one)

**Meal Memory**:
A remembered, previously logged meal description (kept per device), used to suggest repeating a past meal without calling the AI again.
_Avoid_: Meal history, past meal

**Meal Preparation**:
A reusable combination of ingredients a person prepares regularly — structure only, no fixed quantities. Distinct from a Meal Memory, which remembers one whole described occurrence.
_Avoid_: Recipe (a Recipe is quantity-precise; a Meal Preparation is not), template

### Pantry

**Alacena**:
The household's current stock of food items ("pantry"). Distinct from Purchase History, which is what was bought and when.
_Avoid_: Inventory (used in code, but Alacena is the product-facing term), stock

**Purchase Record**:
A historical, priced record of something bought — kept separately from the Alacena, which reflects current stock only.
_Avoid_: Purchase, receipt line

**Household**:
A group of users sharing one Alacena, Purchase History, and week plan.
_Avoid_: Family, group

### Plan & Gating

**Client Plan**:
The subscription tier on a student/individual account — Básico, Premium, or Premium+. Premium vs Premium+ differ only in how many trainer links are allowed (1 vs 2); the feature set is otherwise identical.
_Avoid_: Subscription, tier (when ambiguous with Trainer Plan Tier)

**Básico**:
The default, unpaid Client Plan. Meal/activity/expense tabs and several dashboard blocks are locked; a Básico user also cannot link to a trainer.
_Avoid_: Free plan

**Trainer Plan Tier**:
The tier on a Trainer Application — Gratis or Pago — governing only the trainer's maximum number of students. Feature set is identical between tiers.
_Avoid_: Trainer plan (ambiguous with Client Plan), subscription

### Account Modes

One account can hold more than one of these at once — they are not mutually exclusive tiers, they are lenses on the same account depending on what it's doing right now.

**Alumno**:
An account with an active Trainer Link — their Routines, workout data, and reports are visible to (and partly driven by) their Trainer. Requires a non-Básico Client Plan.
_Avoid_: Student (used in code/types; "Alumno" is the product-facing term), cliente

**Autoentrenador**:
An account with NO active Trainer Link — manages 100% of their own Routines and workout logging solo, with nothing driven by a Trainer. This is the default mode for any account, Básico or not; only Alumno requires linking out of it.
_Avoid_: Self-trainer, standalone user, "sin profe" (imprecise — doesn't name the mode itself)

**Profe**:
An account with an approved Trainer Application — sees the Trainer Panel and manages Trainer Routines, Training Plans, and their students' reports. Called "Trainer" in code/types; "Profe" is the product-facing term.
_Avoid_: Coach, entrenador (used informally in code/UI strings — keep "Profe" as the one canonical term going forward)

### Trainer ↔ Student

**Trainer Application**:
A user's request to become a trainer, reviewed and approved or rejected by an admin.
_Avoid_: Trainer signup, trainer request

**Trainer Invite Code**:
A short code an approved trainer generates and shares so a student can request a link.
_Avoid_: Invite, join code

**Trainer Link Request**:
A student's pending request (via an Invite Code) to link to a trainer, awaiting the trainer's response. A student has at most one pending request at a time.
_Avoid_: Link request, join request

**Trainer Link**:
The active (or finished) relationship between one trainer and one student, created when a Trainer Link Request is accepted. A student has at most one active Trainer Link.
_Avoid_: Connection, pairing

**Routine**:
A named set of exercises. A Routine is either Personal (the student's own) or Assigned (adopted from a Trainer Routine).
_Avoid_: Workout plan, program

**Trainer Routine**:
An entry in a trainer's routine library (Draft, Published, or Archived), not yet tied to any student until adopted.
_Avoid_: Template routine

**Training Plan**:
A trainer's weekly schedule mapping each weekday to a Trainer Routine, for one student.
_Avoid_: Weekly plan, schedule

**Assigned Session**:
A single day's materialized instance of a Training Plan entry, carrying a frozen snapshot of the routine and its own status (Planned, Moved, In Progress, Completed, Expired, Cancelled).
_Avoid_: Scheduled workout

**Workout Execution**:
The record produced when a student completes an Assigned Session.
_Avoid_: Completed workout

**Routine Incident**:
A note logged during a live routine — a skipped or swapped exercise, an extra set, an off-plan exercise, or a comment — that the trainer can mark as seen.
_Avoid_: Incident, workout note

**Trainer Comment**:
A one-way message from trainer to student, which the student can mark as read.
_Avoid_: Note, observation

**Student Report**:
A generated weekly snapshot of a student's activity and incidents (Draft, Generated, or Sent), which survives even after the Trainer Link ends.
_Avoid_: Weekly report (fine informally, but "Student Report" is the canonical entity)

## AI Assistance

**AI Cache**:
A shared (cross-user) store of previous AI results keyed by the normalized prompt and input, so identical requests skip calling the AI again.
_Avoid_: Response cache

**Gemini-first fallback**:
The pattern used by every AI-backed route: try Gemini (free) first; on failure or rate limit, fall back to Anthropic (Claude) with the same prompt, if configured.
_Avoid_: AI fallback (when the specific Gemini→Anthropic order matters)
