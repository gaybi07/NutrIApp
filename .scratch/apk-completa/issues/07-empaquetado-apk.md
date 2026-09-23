# Evaluar Capacitor vs PWA-to-APK para empaquetar como app instalable

Type: research
Status: open

## Question

El usuario quiere Android primero (compartido directo como APK a un grupo cerrado, sin pasar por Google Play todavía), pero pensado desde el día uno para eventual distribución en Google Play y Apple App Store (iOS).

Investigar:
- **Capacitor** (Ionic): cómo envuelve una app Next.js/React existente, qué tan directo es reusar el código actual sin reescribir, soporte real para Android + iOS desde un mismo código, costo/complejidad de mantenerlo.
- **PWA instalable + envoltorio a APK** (ej. Trusted Web Activity/Bubblewrap): más liviano, pero confirmar si Apple permite este camino para iOS (Apple es más restrictivo con PWAs empaquetadas) — si no, puede no servir para el objetivo de "pensado para iOS también".
- Qué features de la app actual (notificaciones push si se llegaran a necesitar, cámara para escanear tickets/etiquetas, almacenamiento local) funcionan igual o necesitan ajuste en cada camino.
- Cuál de los dos caminos es más barato de arrancar YA (para el APK del grupo cerrado) sin cerrarse la puerta a iOS después.

No depende de nada — se puede investigar en paralelo a todo lo demás del mapa.
