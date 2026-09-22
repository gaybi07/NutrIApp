# Checklist de comportamiento por sección

Qué debería ver y poder hacer cada tipo de cuenta, sección por sección. Sirve para verificar a mano después de un cambio, sin tener que releer el código. Términos (Alumno/Profe/Autoentrenador) definidos en `CONTEXT.md`.

Actualizar esta lista cuando cambie el comportorpiento real — una lista desactualizada es peor que no tener lista.

## Autoentrenador (default, sin Trainer Link activo)

- [ ] Ve las 5 comidas del día (Desayuno/Almuerzo/Merienda/Cena/Colación) y puede cargar en cualquiera.
- [ ] "Con IA" / "Desde Alacena" / "Buscar producto" visibles si el plan no es Básico.
- [ ] Puede crear y editar sus propias Rutinas (`origen: personal`) sin restricción.
- [ ] `LiveWorkout` funciona sobre sus rutinas personales.
- [ ] No ve nada de "Entrenador" (botón oculto) — no tiene Trainer Link.
- [ ] Puede iniciar un `Trainer Link Request` con un código de invitación (si no es Básico).

## Alumno (Trainer Link activo, plan no Básico)

- [ ] Ve sus propias comidas/actividad igual que Autoentrenador.
- [ ] Ve las Rutinas Asignadas por su Profe (`origen: asignada`) además de las personales — hoy estas conviven, pero `LiveWorkout` todavía no diferencia una de otra (pendiente, ver más abajo).
- [ ] Puede ver comentarios del Profe (`TrainerComment`) y marcarlos como leídos.
- [ ] No puede generar un segundo `Trainer Link Request` mientras el actual esté activo.
- [ ] Plan Premium: 1 Trainer Link. Premium+: hasta 2.

## Profe (Trainer Application aprobada)

- [ ] Ve el botón "Entrenador" en el menú principal (oculto para Básico, oculto si nunca se aprobó la solicitud).
- [ ] Dentro del panel: puede generar un código de invitación (`generate_trainer_invite_code`).
- [ ] Ve las `Trainer Link Request` pendientes y puede aceptar/rechazar.
- [ ] Puede crear/editar/archivar Rutinas de su biblioteca (`TrainerRoutine`, estado borrador/publicada/archivada).
- [ ] Puede armar un `Training Plan` semanal asignando una `TrainerRoutine` a cada día.
- [ ] Ve el detalle de cada alumno (`StudentDetailScreen`) con métricas ya calculadas server-side (nunca datos crudos del alumno).
- [ ] Puede generar y ver `Student Report` semanales.
- [ ] Tope de alumnos según `Trainer Plan Tier` (Gratis vs Pago) — al llegar al tope, no puede aceptar más `Trainer Link Request`.

## Pendiente conocido (no confundir con bug)

- `AssignedSession`/`WorkoutExecution`/`RoutineIncident` (la maquinaria para que una rutina asignada por el Profe se registre con snapshot congelado) **existe en la base pero `LiveWorkout.tsx` todavía no la usa** — sigue escribiendo directo en las Rutinas propias del Alumno. Conectar esto es tarea futura ya anotada (ver plan `dapper-dreaming-sunrise.md`).
- El onboarding/tutorial todavía no explica la diferencia entre Básico/Autoentrenador/Premium — también pendiente.

## Alacena / comidas (independiente del rol)

- [ ] Cargar desde Alacena y después editar los gramos de ese item devuelve/descuenta stock en consecuencia.
- [ ] Borrar un item cargado desde Alacena devuelve el stock (recreando el producto si había llegado a 0).
- [ ] Escanear un código de barras y confirmar consumo también reconcilia stock al editar/borrar después.
- [ ] Cargar una comida repetida ("2 huevos") una segunda vez, en algún momento, responde con `fuente: "foods"` sin llamar a la IA (revisar logs del server).
- [ ] "Desglosar" un plato compuesto en ingredientes, guardarlo como preparación, y reusarla arma la comida sin IA si todos los ingredientes ya están en `foods`.
