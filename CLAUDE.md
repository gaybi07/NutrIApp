# Instrucciones del proyecto

App en español rioplatense (voseo). Tema de color: en Tailwind `gold` es el violeta de acento, `sage` el verde, `rust` el rojo.

## Botones — 6 formatos fijos

Usar siempre `btn()` / `chip()` de `components/buttonStyles.ts`. No inventar estilos sueltos de botón.
Referencia visual: `design-scratch/botones-alacena.html`.

| Formato | Cuándo | Ejemplos |
|---|---|---|
| `primary` (violeta sólido, texto blanco) | La acción principal. Una por pantalla o ventana. | + Agregar, Guardar, Sumar |
| `secondary` (borde violeta) | Acciones útiles, no principales. | Ver lista, Preparar, Revisar |
| `neutral` (borde gris) | Salir sin hacer nada. Va a la izquierda de la acción primaria. | Cancelar, Cerrar |
| `danger` (rojo con borde) | Sacar o borrar. Siempre con texto o ícono rojo, nunca una "×" suelta. | Eliminar, Sacar, Vaciar |
| `dangerSolid` (rojo sólido) | Solo en el paso "¿Seguro?" de una acción destructiva. | Sí, eliminar |
| `success` (verde) | Cerrar algo bien hecho. No se usa para guardar. | Consumir, Marcar OK |

- Filtros: `chip(activo)` — activo violeta sólido, inactivo gris.
- Borrar algo en masa (vaciar, eliminar todo) pide confirmación con `dangerSolid` antes de ejecutar.
- Tema Neón: los botones sólidos se invierten por CSS (`.bg-gold.text-white` en `app/globals.css`); no hardcodear colores por fuera de los tokens.

## Planes (Básico / Premium / Autoentreno / Premium+)

- En Básico lo bloqueado se VE (candado, `LockedTabNotice`, `LockedBlockCard`, `LockedCollapsible`, `BlurLock`) y lleva a "Ver planes". Nunca desaparece sin explicación.
- `user_settings.plan` no se escribe desde el navegador ni desde `/api/data`: solo el webhook de MercadoPago / service role.

## Pendiente de definir

- Cómo son los modales (tamaño, cierre, botones, pantalla completa en mobile) y cómo son las redirecciones entre pantallas. Se revisa después de terminar el resto de los cambios de interfaz.
- Perfiles, vistas y simulación: ver `.scratch/perfiles-y-simulacion.md`.
