# Qué se comparte entre Entrenador y Nutricionista

Type: grilling
Status: resolved

## Question

El usuario delegó esta decisión explícitamente ("eso velo vos a ver si sirve o no"), pero sigue siendo una decisión real de arquitectura que conviene fijar con criterio antes de construir, no descubrir a mitad de camino.

Resolver (principalmente investigación + criterio propio, con codebase-design; confirmar con el usuario el resultado, no cada paso):
- ¿Qué UI/lógica es genuinamente común entre Entrenador y Nutricionista? Candidatos: el dashboard de "necesita tu atención" (solicitudes pendientes, algo sin ver), el sistema de reportes semanales (`Report`/`generate_student_report`), comentarios trainer→student.
- ¿Se muestran como sub-tabs dentro de una misma solapa "Profesional" (con un selector Entrenador/Nutricionista arriba), o quedan como dos solapas separadas que comparten componentes por debajo pero se ven distintas?
- ¿Cómo afecta esto al modelo de "Cuenta" que ya armamos hoy (una persona puede ser Profe Y Nutricionista Y Alumno/Paciente de otro, todo a la vez)?

Depende de que [el modelo de datos del Plan Nutricional](01-modelo-plan-nutricional.md) esté resuelto (no se puede decidir qué se comparte hasta saber qué forma tiene cada lado).

## Blocked by

01

## Answer

Decisión propia (delegada por el usuario), con criterio de codebase-design sobre lo que ya existe en `TrainerPanel.tsx`/`CONTEXT.md`.

**Solapas separadas, no una sola "Profesional" con selector.** Profe y Nutricionista quedan como dos tabs independientes (`"entrenador"` y `"nutricionista"` en `MainTab`), cada una gateada por su propia aprobación (`isApprovedTrainer` / `isApprovedNutritionist`), igual que hoy. Motivo: una misma persona puede ser Profe de un grupo de Alumnos Y Nutricionista de un grupo de Pacientes totalmente distinto (confirmado por el patrón ya escrito en `CONTEXT.md`: "Account Modes... lenses on the same account, not mutually exclusive"). Meter ambos roles bajo un selector agrega una capa de UI sin beneficio real, ya que las listas de gente vinculada son independientes.

**Lo que sí se comparte es el shell, no el contenido**: el dashboard de 3 `StatTile` + "Necesita tu atención" que ya se armó en `TrainerPanel.tsx` se generaliza a un componente reusable (mismo layout, stats distintas: Alumnos/Rutinas/Incidencias para Entrenador, Pacientes/Planes pendientes/Reportes para Nutricionista). El sistema de `Student Report` (`generate_student_report`) y `Trainer Comment` son **el mismo dato, la misma tabla, el mismo componente** en ambos lados — no hay razón de dominio para separarlos, un reporte semanal es un reporte semanal sea cual sea la disciplina.

**Lo que NO se comparte**: `Routine Incident` es un concepto específico de fuerza (ejercicio salteado/cambiado) — no tiene equivalente natural en nutrición y no se fuerza a existir ahí. El lado Nutricionista no tiene "incidencias", tiene adherencia semanal (ya resuelto en el ticket 01).

**Nota técnica que esto expone (no es una decisión nueva, es una consecuencia directa de reusar tablas)**: `Trainer Link` hoy tiene la regla "un alumno tiene como mucho un vínculo activo". Si Nutricionista reusa la misma tabla (como ya se decidió para `training_plans`/`assigned_sessions` con `disciplina`), esa regla de unicidad tiene que quedar **por disciplina**, no global — si no, un Paciente no podría tener un Profe Y un Nutricionista vinculados al mismo tiempo, lo cual rompe el objetivo explícito del usuario. Se anota para cuando se implemente, no requiere una decisión del usuario (es mecánico).

**Cuenta**: no cambia el modelo ya construido — un usuario sigue siendo, a la vez, Alumno/Paciente de otros Y Profe/Nutricionista de los suyos. La sección "Cuenta" dentro de cada tab profesional (ya existe en `TrainerPanel.tsx`, con `StudentLinkSection`) se replica igual en la tab Nutricionista para "vincularme a un Nutricionista" si la persona es Paciente de alguien más.
