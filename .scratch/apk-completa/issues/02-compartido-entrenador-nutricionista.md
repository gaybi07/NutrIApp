# Qué se comparte entre Entrenador y Nutricionista

Type: grilling
Status: open

## Question

El usuario delegó esta decisión explícitamente ("eso velo vos a ver si sirve o no"), pero sigue siendo una decisión real de arquitectura que conviene fijar con criterio antes de construir, no descubrir a mitad de camino.

Resolver (principalmente investigación + criterio propio, con codebase-design; confirmar con el usuario el resultado, no cada paso):
- ¿Qué UI/lógica es genuinamente común entre Entrenador y Nutricionista? Candidatos: el dashboard de "necesita tu atención" (solicitudes pendientes, algo sin ver), el sistema de reportes semanales (`Report`/`generate_student_report`), comentarios trainer→student.
- ¿Se muestran como sub-tabs dentro de una misma solapa "Profesional" (con un selector Entrenador/Nutricionista arriba), o quedan como dos solapas separadas que comparten componentes por debajo pero se ven distintas?
- ¿Cómo afecta esto al modelo de "Cuenta" que ya armamos hoy (una persona puede ser Profe Y Nutricionista Y Alumno/Paciente de otro, todo a la vez)?

Depende de que [el modelo de datos del Plan Nutricional](01-modelo-plan-nutricional.md) esté resuelto (no se puede decidir qué se comparte hasta saber qué forma tiene cada lado).

## Blocked by

01
