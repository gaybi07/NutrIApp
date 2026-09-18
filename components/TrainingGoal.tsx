import { TrainingGoalInfo } from "@/lib/calculations";
import { Collapsible } from "@/components/Collapsible";
import { SECTION_HELP } from "@/lib/helpText";

export function TrainingGoal({ goal, openOnDesktop }: { goal: TrainingGoalInfo; openOnDesktop?: boolean }) {
  const pct = Math.min(100, Math.round((goal.trainedDaysThisWeek / goal.scheduledDays) * 100));
  const falta = Math.max(0, goal.scheduledDays - goal.trainedDaysThisWeek);

  let mensaje = "";
  let color = "text-textMuted";
  if (goal.onTrack) {
    mensaje = "¡Cumpliste tu plan de esta semana!";
    color = "text-sage";
  } else if (falta === 1) {
    mensaje = "Te falta 1 entrenamiento para cumplir esta semana.";
    color = "text-gold";
  } else {
    mensaje = `Te faltan ${falta} entrenamientos para cumplir esta semana.`;
    color = "text-gold";
  }

  return (
    <Collapsible
      eyebrow="Objetivo"
      title={`Entrenar ${goal.scheduledDays}x por semana`}
      info={SECTION_HELP.objetivoEntreno}
      openOnDesktop={openOnDesktop}
    >
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wide text-textMuted">
          {goal.trainedDaysThisWeek} de {goal.scheduledDays} días esta semana
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wide text-textMuted">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
        <div className={`h-full rounded-full ${goal.onTrack ? "bg-sage" : "bg-gold"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className={`mt-2 text-center text-[12px] ${color}`}>{mensaje}</div>
    </Collapsible>
  );
}
