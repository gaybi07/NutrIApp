# Perfiles, vistas y simulación — acuerdo (2026-09-29)

Resultado de la sesión de preguntas. Nada de esto está construido salvo lo marcado "existe hoy".
Términos: Alumno/Paciente/Profe/Nutricionista según `CONTEXT.md`.

## 1. Vistas del lado cliente

Solapas: Inicio (siempre), Alacena, Comidas, Macros, Actividad, Gastos; se suman Entrenador / Nutricionista solo si la cuenta está aprobada como profesional.

| Plan | Vínculos | Qué ve | Por qué |
|---|---|---|---|
| Básico | 0 | Inicio, Alacena, Macros (sin reporte ni tabla). Carga manual, sin IA. Solapas bloqueadas VISIBLES con candado y línea de "qué desbloquea" (hoy desaparecen: cambio pendiente). | Que pruebe la app y vea lo que se pierde: es el gancho de venta. |
| Premium | 1 (cualquier disciplina) | Todo. Con vínculo, el plan del profesional reemplaza al catálogo propio y aparece el cartel de objetivo. | Es el plan "tengo un profesional". |
| Premium+ | 2 (fuerza + nutrición) | Igual a Premium, con "Tu objetivo" combinado en Inicio. La diferencia es solo de cupos. | Paciente completo en una sola pantalla. |
| Autoentreno | 0 | Todo. Plan armado a mano o con IA usando las mismas pantallas que un vinculado. Un solo objetivo (calculadora), tarjeta de progreso en Inicio ("llevas 53%"). Sin logros, sin feedback, sin reporte largo. | Reemplaza al profesional sin humano; el valor de más objetivos y feedback queda para tener profesional. |

Un profesional aprobado ve además todas las solapas de cliente (empieza en Básico; necesita Premium para vincularse a otro profesional, 1 cupo; 2 cupos = plan más alto, después).

## 2. Reglas de vínculo

- Cambiar de profesional: el cupo anterior se libera en el momento, historial de ambos guardado.
- Bloqueo tras cambiar (solo lo dispara el cliente): 14 días si el nuevo es del mismo tipo, 28 si es de otro tipo. Durante el bloqueo no puede cambiar ni volver al anterior salvo que pague más cupos. El primer vínculo no bloquea.
- No renovar: sigue vinculado hasta el último día del mes pagado y ahí se libera el cupo.
- PAGOS (prorrateo al profesional anterior, plus por cambio a mitad de mes, retroactivo): anotado, sin diseñar.

## 3. Objetivos y logros

- Siempre medibles. Tipos iniciales: peso (con fecha), kcal, proteína, sesiones/semana, minutos/semana, progresión de una carga, pasos, sueño, agua.
- Cada profesional puede crear los suyos: número + unidad + meta + ventana (por día o por semana). El cliente marca sí/no; no marcar = no cumplido.
- Nutricionista solo toca objetivos de su dominio; Entrenador los suyos. Sin conflicto en Premium+.
- La app detecta el logro con lo que se carga y avisa al profesional. El cliente ve el porcentaje, el mensaje del profesional y la propuesta de un objetivo nuevo.

## 4. Vistas de profesional

- Panel: lista de vinculados, solicitudes pendientes, código de invitación, alerta roja si falta cargar la semana, estado vacío ("Todavía no tenés alumnos").
- "Ver alumno" (Entrenador): Resumen, Plan, Peso, Comentarios, Entrenamientos, Incidencias, Reportes.
- "Ver paciente" (Nutricionista): Resumen, Plan (opciones por comida + lista de alimentos no recomendados, texto libre), Peso, Comentarios, Adherencia, Reportes. SIN tabla de incidencias.
- Reporte del Nutricionista: diferencia planificado vs. real + observaciones libres del profesional. La app sugiere qué mirar ("3 días seguidos con el mismo alimento fuera de plan", "grasa muy arriba del objetivo", coincidencias con no recomendados); el profesional acepta o descarta; nada llega al cliente sin que él lo decida.
- Existe hoy: Ver alumno/paciente base, generación de reportes de fuerza (bloqueada por bug, ver migración 2026-10-03).

## 5. Feedback y perfil profesional

- Durante el vínculo: el profesional deja estrellas + comentario de reconocimiento; el cliente lo ve como logro.
- Al desvincularse (y al cerrar cada mes de vínculo): ambos pueden calificar en privado. Profesional → cliente: bueno/regular/malo + comentario, solo para el profesional. Cliente → profesional: estrellas + comentario; el promedio es público en el perfil (no las opiniones sueltas).
- Solapa "Perfil profesional" se construye ahora: foto, presentación, especialidades, títulos, lugar de trabajo, WhatsApp opcional (con aviso), promedio de estrellas, insignia "Verificado" según aprobación/título. La ve quien está vinculado o recibió su código. Directorio público con buscador = fase posterior (revisar legal antes de publicar contactos).

## 6. Elenco de simulación (11 perfiles)

| # | Perfil | Cuenta |
|---|---|---|
| 1 | Básico | basico.demo |
| 2 | Premium + Nutricionista | paciente1.demo (con historial), paciente.ciclo.demo (poco historial) |
| 3 | Premium + Entrenador | NUEVA |
| 4 | Premium+ ambos | paciente.deficit / recomp / volumen |
| 5 | Autoentreno | NUEVA (test-autoentreno no tiene ajustes) |
| 6 | Nutricionista | nutricionista.demo |
| 7 | Entrenador | entrenador.demo |
| 8 | Nutricionista que entrena con Entrenador | nutricionista.demo (ya es alumna de entrenador.demo) |
| 9 | Entrenador que come con Nutricionista | NUEVA |
| 10 | Entrenador que se entrena solo | NUEVA |
| 11 | Nutricionista que come solo | NUEVA |

Relleno sin simular: paciente2–5.demo. No tocar: jgabrielrosa8@gmail.com (real, paciente de nutricionista.demo).
Cada cuenta simulada tiene un patrón fijo de cumplimiento (reproducible, no aleatorio): unas cumplen ~90%, otras empeoran de a poco, otras son irregulares con un pico fuera de plan.
Pendientes en cuentas: nadie tiene reportes; ninguna tiene rutinas propias; entrenador.demo tiene plan Básico.

## 7. Orden de trabajo

1. Pantallas del lado cliente, cuenta por cuenta (Básico, Premium, Premium+, Autoentreno), sin avanzar de semana.
2. Vistas de profesional.
3. Semana 1 completa, validada por el usuario.
4. Semanas siguientes.
5. Reporte y cómo lo ve el cliente.

## 8. Ideas para tener en cuenta (aún sin construir)

- **Nutrición según entrenamiento (Premium+ = paciente + alumno).** Hoy el plan nutricional es igual todos los días porque la cuenta solo es paciente. Con un Entrenador vinculado ya se sabe qué días se entrena (`assigned_sessions`): los días de entreno corresponde más proteína y más carbohidratos (y más kcal), y los días de descanso menos carbohidratos y menos grasas. Propuesta:
  - En el armado del plan (vista del Nutricionista), mostrar al lado de cada día si ese día el paciente entrena y con qué intensidad, para que arme opciones distintas.
  - En la app del paciente, el objetivo del día (kcal, proteína, carbos, grasas y densidades) debería variar según sea día de entreno o de descanso, en vez de ser un promedio fijo de la semana.
  - Sin Entrenador vinculado sigue siendo constante, como ahora.
- **Densidades.** Ya está: proteína cada 100 g y kcal por gramo, con objetivo derivado del plan del día. Falta decidir si el objetivo de densidad también debe cambiar entre días de entreno y de descanso.
- **Pantalla del celular.** Revisar Comidas (Hoy, almanaque, lista de compras) y el planificador en pantalla chica.
- **Vista del Nutricionista.** Ver el almanaque de cumplimiento del paciente en Adherencia, con las omisiones.
- **Costos.** Subir el ticket de compras y distribuir el gasto (entre integrantes del grupo o por comida): pendiente de definir.
- **Cambio de profesional.** Bloqueo de 14 días (mismo tipo) o 28 días (otro tipo): todavía no está construido.

- **Solapa "Profesionales" (cliente): primera versión.** Hoy muestra email, insignia Verificado, objetivo que fijó, estado de la semana, último comentario y acciones (calificar, desvincularme, vincularme con cupo libre). Falta: nombre, foto, presentación, especialidades, lugar de trabajo, contacto, promedio de estrellas y reportes; se completa con el perfil profesional.

## 9. Puntos, mascota y tienda (idea del 2026-10-01)

- **Ahora:** los objetivos logrados dan puntos (puntual 150; recurrente 50 + 25 por semana seguida). Libro de puntos en la base (`points_ledger`), los registra `mark_objective_achieved`.
- **Después:** una mascota que evoluciona a medida que se logran objetivos, y una tienda donde gastar puntos (cosas para la mascota, mejoras). Todo se calcula del libro de puntos (sumas y gastos como filas negativas).
- **Antes de la tienda:** el logro hoy lo detecta la app (cliente) y lo registra la base sin verificarlo; con puntos que se gastan hay que verificar el cumplimiento del lado del servidor para que no se pueda hacer trampa.
