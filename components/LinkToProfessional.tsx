"use client";

import { Routine } from "@/lib/types";
import { StudentLinkSection } from "@/components/TrainerPanel";
import { OwnPatientLinkSection } from "@/components/NutricionistaPanel";

/**
 * Punto de entrada único para vincularse como CLIENTE (Alumno/Paciente) a
 * un profesional -- antes esto solo se encontraba adentro de las pantallas
 * de "Ser entrenador"/"Ser nutricionista" (pensadas para el que SE POSTULA
 * como profesional), lo cual no era intuitivo para alguien que solo quiere
 * usar un código que le pasó su Profe o Nutricionista. Reusa las mismas
 * secciones de siempre (con código de invitación, reportes, comentarios),
 * solo que ahora también son accesibles desde un ítem de menú propio.
 */
export function LinkToProfessional({
  authenticated,
  routines,
  onSaveRoutines,
}: {
  authenticated: boolean;
  routines: Routine[];
  onSaveRoutines: (routines: Routine[]) => void;
}) {
  return (
    <div>
      <div className="font-display italic text-lg text-gold mb-1">Vincularme a un profesional</div>
      <div className="mb-3 text-xs text-textMuted">
        Pedile el código a tu Profe o Nutricionista -- podés vincularte a los dos a la vez si tu plan lo permite.
      </div>
      <StudentLinkSection authenticated={authenticated} routines={routines} onSaveRoutines={onSaveRoutines} />
      <div className="mt-5 border-t border-border pt-3">
        <OwnPatientLinkSection authenticated={authenticated} />
      </div>
    </div>
  );
}
