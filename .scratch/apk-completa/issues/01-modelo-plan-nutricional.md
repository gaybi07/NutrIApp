# Modelo de datos del Plan Nutricional (Nutricionista ↔ Paciente)

Type: grilling
Status: resolved

## Question

Ya existe el esqueleto Profe↔Alumno (`Trainer Link`, `Training Plan` semanal, `Assigned Session` con snapshot congelado por día). El usuario confirmó reusarlo para Nutricionista↔Paciente, pero con una diferencia clave: el plan nutricional se arma como **"planificaciones con opciones y recomendaciones"**, no una prescripción única fija por día como una rutina de fuerza.

Resolver con el usuario (grilling + domain-modeling en vivo):
- ¿Qué significa "opciones" en la práctica? ¿Varias comidas alternativas por horario (ej. 3 opciones de almuerzo)? ¿Un rango de macros con alimentos sugeridos intercambiables (reusando la tabla `foods` ya construida)? ¿Ambas cosas según el caso?
- ¿El Paciente elige una opción y eso queda "congelado" como el Alumno hace con una `Assigned Session`, o el plan nutricional es más flexible/no se marca como "completado"?
- Nombres exactos en español para los nuevos conceptos (equivalentes a `Training Plan`/`Assigned Session`/`Routine Snapshot` pero del lado nutrición) — actualizar `CONTEXT.md` en el momento.
- ¿Reusa directamente las tablas `training_plans`/`assigned_sessions` con un campo de "tipo" (fuerza/nutrición), o necesita tablas propias? (Esto es más técnico — Claude puede proponer una recomendación, pero el usuario decide el trade-off de reusar vs. separar.)

## Answer

Términos nuevos ya cargados en `CONTEXT.md` (sección "Nutricionista ↔ Paciente"): **Nutritional Plan**, **Meal Option**, **Nutritional Session**.

- **"Opciones" = 2-3 alternativas por comida, cada una con sus propios macros/alimentos y una breve explicación de cuándo/por qué elegirla** (ej. según horario de entrenamiento o de acostarse). El Nutricionista puede partir de un borrador sugerido por IA para esa explicación, pero **siempre tiene que revisarla y ajustarla antes de que el Paciente la vea** — nunca se publica una sugerencia de IA sin pasar por el profesional. Reusa la tabla `foods` ya construida para los alimentos de cada opción.
- **Congela semanal, no diario**: a diferencia de una `Assigned Session` de fuerza (que se ejecuta y cierra día por día), la `Nutritional Session` se publica congelada para toda la semana de una vez. El Paciente no "completa" un día — simplemente elige una Meal Option por comida a medida que registra normalmente (con el `AiEntryForm`/`MealsEditor` de siempre). La adherencia se calcula **una vez por semana**, en el Student Report ya existente, comparando lo que el Paciente realmente registró contra las opciones del plan.
- **Reusa `training_plans`/`assigned_sessions`** con un campo `disciplina: 'fuerza' | 'nutricion'` en vez de tablas nuevas — confirmado como el approach técnico. Las Meal Options por día/comida van en el mismo `routine_snapshot`/`days` jsonb que ya existe (ya es jsonb en la base, no hace falta migrar el tipo de columna). **No hace falta un equivalente a `Workout Execution`**: no hay "ejecución" que registrar aparte del registro de comidas normal del Paciente — la adherencia semanal sale de comparar `DayEntry` contra el plan, no de una tabla nueva.

Esto deja pendiente, para cuando se implemente de verdad (no en este mapa): el algoritmo exacto de "match" entre lo registrado y una Meal Option (¿por similitud de macros? ¿por ingrediente principal?) — se resuelve como parte del trabajo de construcción del Student Report para nutrición, no como una decisión de producto.
