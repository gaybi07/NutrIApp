# Evaluar Capacitor vs PWA-to-APK para empaquetar como app instalable

Type: research
Status: resolved

## Question

El usuario quiere Android primero (compartido directo como APK a un grupo cerrado, sin pasar por Google Play todavía), pero pensado desde el día uno para eventual distribución en Google Play y Apple App Store (iOS).

Investigar:
- **Capacitor** (Ionic): cómo envuelve una app Next.js/React existente, qué tan directo es reusar el código actual sin reescribir, soporte real para Android + iOS desde un mismo código, costo/complejidad de mantenerlo.
- **PWA instalable + envoltorio a APK** (ej. Trusted Web Activity/Bubblewrap): más liviano, pero confirmar si Apple permite este camino para iOS (Apple es más restrictivo con PWAs empaquetadas) — si no, puede no servir para el objetivo de "pensado para iOS también".
- Qué features de la app actual (notificaciones push si se llegaran a necesitar, cámara para escanear tickets/etiquetas, almacenamiento local) funcionan igual o necesitan ajuste en cada camino.
- Cuál de los dos caminos es más barato de arrancar YA (para el APK del grupo cerrado) sin cerrarse la puerta a iOS después.

No depende de nada — se puede investigar en paralelo a todo lo demás del mapa.

## Answer

Investigación completa en [`research/07-empaquetado-apk.md`](../research/07-empaquetado-apk.md) (fuentes primarias: docs de Capacitor, Apple App Store Review Guidelines, docs de TWA/Bubblewrap).

**Para el objetivo inmediato (APK Android para el grupo cerrado, ya)**: gana **PWA/TWA con Bubblewrap** — no requiere tocar el código actual (Next.js App Router + Supabase), solo un manifest + service worker mínimo sobre el sitio ya deployado. El escaneo de cámara (`html5-qrcode`) sigue andando igual porque TWA renderiza el sitio real en Chrome.

**Capacitor** es la opción correcta a largo plazo para apps nativas de verdad en Android+iOS, pero su propia documentación dice que la opción de cargar el sitio remoto (`server.url`) "no está pensada para producción" — el camino soportado es un bundle estático pre-armado, lo cual choca con las rutas `app/api/*` de esta app y con la autenticación server-side de `@supabase/ssr`. Necesitaría refactor real, no es gratis.

**Dato importante para el objetivo de iOS**: ni PWA/TWA ni Capacitor "regalan" iOS. La guía 4.2 de Apple está escrita justo para rechazar lo que es un wrapper de PWA/TWA (no existe un equivalente a TWA en iOS) — el camino a iOS eventualmente va a necesitar invertir en Capacitor con funcionalidad nativa real, no un atajo de empaquetado.

**Recomendación para el mapa**: arrancar con PWA/TWA para el APK del grupo cerrado ahora (barato, sin tocar código), y tratar la migración a Capacitor como su propio esfuerzo más adelante, cuando se decida invertir en serio en iOS.
