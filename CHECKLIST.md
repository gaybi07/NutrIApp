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
- [ ] En "Tus rutinas" ve dos secciones: "De tu profe" y "Tus rutinas" (antes era una lista sola).
- [ ] Si el Profe publicó algo para hoy, ve la tarjeta "Hoy te toca" arriba de los controles normales de Entreno — sin que le impida entrenar otra cosa si quiere.
- [ ] Al terminar una sesión asignada: queda guardada en su historial personal (streak/gráficos) Y el Profe la ve como completada en su "Plan".
- [ ] Si se corta la red justo al terminar, el entrenamiento personal se guarda igual y aparece un aviso de "reintentar avisar a tu profe" (persiste aunque se recargue la página).
- [ ] Puede ver comentarios del Profe (`TrainerComment`) y marcarlos como leídos.
- [ ] No puede generar un segundo `Trainer Link Request` mientras el actual esté activo.
- [ ] Premium y Premium+ son iguales hoy en la práctica (1 solo vínculo cada uno) — Premium+ = vínculo con Profe Y Nutricionista a la vez está *decidido* pero el rol Nutricionista todavía no existe (ver `CONTEXT.md`).

## Profe (Trainer Application aprobada)

- [ ] Ve el botón "Entrenador" en el menú principal (oculto para Básico, oculto si nunca se aprobó la solicitud).
- [ ] Dentro del panel: puede generar un código de invitación (`generate_trainer_invite_code`).
- [ ] Ve las `Trainer Link Request` pendientes y puede aceptar/rechazar.
- [ ] Puede crear/editar/archivar Rutinas de su biblioteca (`TrainerRoutine`, estado borrador/publicada/archivada).
- [ ] Puede armar un `Training Plan` semanal (tab "Plan" dentro de "Ver alumno") asignando una `TrainerRoutine` publicada a cada día, y publicarlo.
- [ ] Republicar una semana ya publicada no pisa los días que el alumno ya movió o completó.
- [ ] Ve el detalle de cada alumno (`StudentDetailScreen`) con métricas ya calculadas server-side (nunca datos crudos del alumno).
- [ ] Puede generar y ver `Student Report` semanales.
- [ ] Tope de alumnos según `Trainer Plan Tier` (Gratis vs Pago) — al llegar al tope, no puede aceptar más `Trainer Link Request`.

## Pendiente conocido (no confundir con bug)

- El onboarding/tutorial todavía no explica la diferencia entre Básico/Autoentrenador/Premium/Premium+ — pendiente.
- El Profe todavía no ve, en la tab "Plan", lo que el alumno hizo *de verdad* (peso/reps reales) al lado de lo planificado — solo ve el estado (completada/vencida/etc). Es la Fase 5 (opcional) del plan `dapper-dreaming-sunrise.md`.
- Los ~500 alimentos curados de la tabla `foods` — solo hay ~30 semilla cargados.
- El rol Nutricionista no existe todavía (Premium+ = Profe + Nutricionista está decidido, no programado).

## Alacena / comidas (independiente del rol)

- [ ] Cargar desde Alacena y después editar los gramos de ese item devuelve/descuenta stock en consecuencia.
- [ ] Borrar un item cargado desde Alacena devuelve el stock (recreando el producto si había llegado a 0).
- [ ] Escanear un código de barras y confirmar consumo también reconcilia stock al editar/borrar después.
- [ ] Cargar una comida repetida ("2 huevos") una segunda vez, en algún momento, responde con `fuente: "foods"` sin llamar a la IA (revisar logs del server).
- [ ] "Desglosar" un plato compuesto en ingredientes, guardarlo como preparación, y reusarla arma la comida sin IA si todos los ingredientes ya están en `foods`.
