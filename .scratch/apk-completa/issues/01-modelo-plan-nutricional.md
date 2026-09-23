# Modelo de datos del Plan Nutricional (Nutricionista ↔ Paciente)

Type: grilling
Status: open

## Question

Ya existe el esqueleto Profe↔Alumno (`Trainer Link`, `Training Plan` semanal, `Assigned Session` con snapshot congelado por día). El usuario confirmó reusarlo para Nutricionista↔Paciente, pero con una diferencia clave: el plan nutricional se arma como **"planificaciones con opciones y recomendaciones"**, no una prescripción única fija por día como una rutina de fuerza.

Resolver con el usuario (grilling + domain-modeling en vivo):
- ¿Qué significa "opciones" en la práctica? ¿Varias comidas alternativas por horario (ej. 3 opciones de almuerzo)? ¿Un rango de macros con alimentos sugeridos intercambiables (reusando la tabla `foods` ya construida)? ¿Ambas cosas según el caso?
- ¿El Paciente elige una opción y eso queda "congelado" como el Alumno hace con una `Assigned Session`, o el plan nutricional es más flexible/no se marca como "completado"?
- Nombres exactos en español para los nuevos conceptos (equivalentes a `Training Plan`/`Assigned Session`/`Routine Snapshot` pero del lado nutrición) — actualizar `CONTEXT.md` en el momento.
- ¿Reusa directamente las tablas `training_plans`/`assigned_sessions` con un campo de "tipo" (fuerza/nutrición), o necesita tablas propias? (Esto es más técnico — Claude puede proponer una recomendación, pero el usuario decide el trade-off de reusar vs. separar.)
