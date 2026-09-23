# Empaquetado a APK: Capacitor vs PWA/TWA — investigación de fuentes primarias

## Marco de la pregunta

registro-app es hoy una app Next.js 14 (App Router) + React 18, con rutas API bajo
`app/api/*`, autenticación Supabase via `@supabase/ssr`, y una feature de escaneo de
código de barras / etiqueta nutricional con `html5-qrcode` (requiere acceso a la cámara
del dispositivo). No hay Capacitor ni tooling PWA instalado todavía.

El objetivo declarado en el ticket es: **Android primero**, distribuido como APK a un
grupo cerrado (sin pasar por Google Play todavía), pero **diseñado desde el día uno**
para eventualmente llegar a Google Play y a la App Store de Apple (iOS).

Se investigaron dos caminos —Capacitor (Ionic) y el empaquetado de PWA via Trusted Web
Activity (Bubblewrap / PWABuilder)— consultando la documentación oficial de cada uno.

---

## 1. Capacitor (Ionic)

### 1.1 Cómo envuelve una app web existente

Capacitor toma el **build ya compilado** del framework web (`webDir` en `capacitor.config`)
y lo copia dentro de proyectos nativos de Android Studio y Xcode:

> "First, developers build their web code using their framework's build command... The
> built output directory must be specified in Capacitor's configuration as the `webDir`.
> The critical step is running `npx cap sync`, which... copies over your already built
> web bundle to both your Android and iOS projects as well as updates the native
> dependencies that Capacitor uses."
[Source: https://capacitorjs.com/docs/basics/workflow]

La documentación de workflow **no contempla cargar un servidor remoto en producción**:
el flujo estándar exige un bundle web estático pre-compilado, no una URL en vivo.

### 1.2 ¿Requiere `next export` (export estático) o puede apuntar a un servidor Next.js SSR remoto?

Se comprobó directamente en la documentación de configuración de Capacitor
(`server.url`), la opción diseñada para cargar contenido remoto en el WebView:

> "Load an external URL in the Web View. This is intended for use with live-reload
> servers. **This is not intended for use in production.**"
[Source: https://capacitorjs.com/docs/config]

Es decir: Capacitor **sí** puede técnicamente apuntar a una URL remota (útil en
desarrollo con live-reload), pero **su propia documentación desaconseja explícitamente
usar eso en producción**. El patrón soportado y documentado es: build estático → `cap
sync` → APK/IPA con los assets embebidos localmente.

Esto tiene una consecuencia directa para este repo: Next.js App Router con `output:
'export'` **elimina** Route Handlers de servidor, Middleware y Server Actions del build
estático — no se pueden exportar como archivos estáticos:

> "A Next.js app only emits [static export] when next.config.js sets output to export,
> which writes out and drops API routes, middleware and server actions... A Capacitor
> app is just static assets in a WebView. There is no server environment at runtime."
[Source: https://github.com/vercel/next.js/discussions/55393, vía búsqueda — nota: fuente secundaria]

> "API Routes can't be used with static exports. However, Route Handlers in the App
> Router can [in some configurations]."
[Source: https://nextjs.org/docs/messages/api-routes-static-export]

**Lo que esto significa para registro-app en concreto:** las rutas bajo `app/api/*`
(probablemente usadas para lógica server-side con Supabase, subida de datos, etc.) y
cualquier lógica que dependa de `@supabase/ssr` en el servidor **no sobreviven** a un
`next export`. El patrón recomendado por la comunidad (fuente secundaria, no de
Capacitor) es dejar esas rutas corriendo en el despliegue web normal (Vercel/host) y que
el cliente las llame por URL absoluta — es decir, la app empaquetada se vuelve un
cliente "thin" que habla con el backend real por HTTP, en vez de un export 100% offline.
Esto es exactamente el patrón "sitio remoto pero cliente nativo" que la doc de
`server.url` desaconseja para producción si se usa como *toda* la app, pero es viable
si solo las llamadas API van remotas y la UI se sirve del bundle local.

**Esfuerzo real de reutilización de código:** el componente React de UI (`app/**` no
servidor) se puede reutilizar casi sin cambios porque Capacitor sigue siendo "React +
HTML/CSS/JS" bajo el capó. Lo que **sí** exige trabajo de adaptación:
- Migrar de App Router "full SSR" a exportación estática, o mantener un híbrido con
  llamadas a un backend desplegado aparte.
- Revisar el uso de `@supabase/ssr` (pensado para cookies de servidor Next.js) — en un
  WebView estático probablemente haya que pasar a manejo de sesión client-side
  (`@supabase/supabase-js` puro) o seguir llamando a un backend Next.js remoto para el
  login.
- Reemplazar APIs web incompatibles con WebView (si las hay) por plugins de Capacitor.

### 1.3 Soporte genuino Android + iOS desde un solo código

La página principal de Capacitor lo confirma directamente:

> "create cross-platform iOS, Android, and Progressive Web Apps with JavaScript, HTML,
> and CSS... Capacitor adds native iOS and Android projects to the codebase... installing
> Xcode for iOS and Android Studio for Android... Developers can open and modify the
> generated native projects in Xcode and Android Studio when deeper customization is
> needed."
[Source: https://capacitorjs.com/]

Esto es soporte real: se generan proyectos `ios/` y `android/` nativos y completos
(no una simulación), compilables con las mismas herramientas que un proyecto 100%
nativo.

### 1.4 Complejidad de mantenimiento continuo

- Mantener dos proyectos nativos reales (`android/` en Gradle/Kotlin-Java, `ios/` en
  Xcode/Swift) en el repo, que requieren Android Studio y (para iOS) una Mac con Xcode.
- Cada `npx cap sync` reescribe dependencias nativas; actualizaciones de Capacitor en sí
  (versión mayor, p.ej. Capacitor 7→8) suelen requerir migraciones de plugins y de
  configuración de Gradle/Xcode.
- El ecosistema de plugins (Camera, Push Notifications, Preferences, Filesystem, etc.)
  está mantenido por Ionic/Capacitor core team y la comunidad; en general con buena
  cobertura pero sujeto al ritmo de release de Capacitor.
- Firma de APK/IPA, provisioning profiles de Apple, keystores Android: overhead de
  DevOps adicional a lo que hoy tiene el proyecto (que es puramente web/Vercel).

---

## 2. PWA-to-APK: Trusted Web Activity (Bubblewrap / PWABuilder)

### 2.1 Qué es y qué tan liviano es el camino

**Bubblewrap** (mantenido por Google Chrome Labs):

> "Bubblewrap is a Command Line Interface (CLI) that helps developers to create a
> Project for an Android application that launches an existing Progressive Web App
> (PWAs) using a Trusted Web Activity."
[Source: https://github.com/GoogleChromeLabs/bubblewrap]

Flujo (según búsqueda de la doc oficial y guías derivadas):
1. `bubblewrap init` — parsea el Web App Manifest del PWA y genera el proyecto Android
   por defecto.
2. `bubblewrap build` — genera un **APK firmado** (`app-release-signed.apk`) listo para
   instalar/testear, y un AAB para subir a Play Store.
3. Se debe publicar un archivo **Digital Asset Links** (`assetlinks.json`) en el dominio
   para verificar la relación app↔sitio.
[Source: búsqueda derivada de github.com/GoogleChromeLabs/bubblewrap/blob/main/packages/cli/README.md — nota: no se citó el README verbatim, fuente secundaria confirmando el flujo]

**PWABuilder** (Microsoft) ofrece lo mismo con una GUI/CLI más guiada:

> "PWABuilder generates Trusted Web Activity (TWA) packages containing .aab, .apk,
> assetlinks.json, and Gradle source code via CloudAPK... PWABuilder will verify if you
> have a service worker and manifest available for your PWA, which are essential
> components for store packaging."
[Source: búsqueda, resumen de pwabuilder.com — nota: fuente secundaria, no se hizo fetch directo del sitio]

Requisito previo real para cualquiera de los dos: el sitio (registro-app desplegado en
su URL actual, presumiblemente Vercel) necesita un **Web App Manifest** válido y, para
capacidades PWA completas (offline, push), un **Service Worker**. Ninguno de los dos
existe hoy en el repo (no hay `next-pwa` ni manifest.json confirmado en el código leído
hasta ahora).

Este camino es dramáticamente más liviano que Capacitor porque **no toca el código de
la app en absoluto**: la app sigue siendo el mismo Next.js SSR/App Router desplegado
normalmente; el TWA es solo un shell Android que abre Chrome apuntando a esa URL con
Digital Asset Links para quitar la barra de navegador. Cero refactor de rutas API, cero
cambios a `@supabase/ssr`.

### 2.2 ¿Apple permite TWA/PWA-wrapper en la App Store de iOS?

Se leyó directamente el texto de Apple en developer.apple.com/app-store/review/guidelines/:

> **4.2 Minimum Functionality** — "Your app should include features, content, and UI
> that elevate it beyond a repackaged website. If your app is not particularly useful,
> unique, or 'app-like,' it doesn't belong on the App Store. If your App doesn't provide
> some sort of lasting entertainment value or adequate utility, it may not be accepted."
>
> **4.2.2** — "Other than catalogs, apps shouldn't primarily be marketing materials,
> advertisements, web clippings, content aggregators, or a collection of links."
>
> **4.2.3(i)** — "Your app should work on its own without requiring installation of
> another app to function."
[Source: https://developer.apple.com/app-store/review/guidelines/]

Y, crucialmente: **no existe una TWA equivalente en iOS**. TWA es una tecnología de
Chrome/Android específicamente; Apple no tiene mecanismo nativo para "confiar" en un
PWA como lo hace Android. Un empaquetado PWA→iOS solo puede hacerse envolviendo el sitio
en un `WKWebView` manualmente (lo que PWABuilder también ofrece como paquete iOS
experimental), y ese patrón cae directo bajo el escrutinio de 4.2:

> "Webview apps are often rejected under Apple's Guideline 4.2 when they offer minimal
> functionality or simply mirror a mobile website. PWAs wrapped in a WebView are
> routinely rejected... 'Web clippings' is Apple's term for a website packaged inside a
> web view — which is exactly what a PWA wrapper is... In contrast, Google supports PWAs
> in the Play Store through Trusted Web Activity (TWA). Apple does not have an
> equivalent native solution for PWAs in iOS."
[Source: búsqueda derivada de developer.apple.com/forums/thread/702360 y de guías de MobiLoud/Code2Native que citan la experiencia práctica de rechazo — nota: fuente secundaria interpretando la política, la guía 4.2 en sí es primaria]

**Conclusión de esta sección:** el camino TWA/Bubblewrap es una solución **solo-Android**
por naturaleza técnica (usa Chrome Custom Tabs + Digital Asset Links, ambos específicos
de Android/Chrome). Para iOS, un wrapper equivalente (WKWebView puro) es exactamente el
patrón que Apple rechaza bajo 4.2 salvo que se le agregue funcionalidad nativa real
(notificaciones nativas, integración con Apple frameworks, offline robusto, UI nativa,
etc.) — en cuyo punto deja de ser "solo un TWA" y empieza a acercarse a lo que Capacitor
ya provee de forma estructurada.

---

## 3. Comparación funcional: push, cámara, almacenamiento/offline

| Capacidad | Capacitor | TWA (Bubblewrap/PWABuilder) |
|---|---|---|
| **Push notifications** | Plugin nativo dedicado. Android usa Firebase Cloud Messaging: *"The Push Notification API uses Firebase Cloud Messaging SDK for handling notifications... There is no need to add the Firebase SDK to your app or edit your app manifest — the Push Notifications provides that for you."* iOS requiere habilitar la capability y código en `AppDelegate.swift`. [Source: https://capacitorjs.com/docs/apis/push-notifications] | Al ser esencialmente Chrome mostrando el sitio, usa **Web Push estándar** (Notification API + Service Worker) tal como en el navegador — funciona en Android vía Chrome. No hay equivalente iOS (no hay TWA en iOS) y Web Push en iOS Safari es limitado/reciente y no aplica a un WKWebView wrapper sin trabajo nativo adicional. |
| **Cámara (relevante para el escaneo de códigos de barra/etiquetas con html5-qrcode)** | Plugin `Camera` dedicado con acceso nativo real: *"provides the ability to take a photo with the camera or choose an existing one from the photo album."* Android usa el Photo Picker nativo (API 30+); iOS usa frameworks de cámara nativos con permisos declarados en `Info.plist`. [Source: https://capacitorjs.com/docs/apis/camera] Nota: `html5-qrcode` seguiría funcionando vía `getUserMedia` dentro del WebView tal cual hoy, sin necesitar el plugin — Capacitor no obliga a migrar el scanner. | Como TWA renderiza con Chrome for Android, `getUserMedia` (que es lo que usa `html5-qrcode` hoy) funciona igual que en el navegador — sin cambios de código, sin plugin nativo. Es de hecho el camino de *menor* fricción para esta feature específica, porque ya funciona en la web actual. |
| **Storage / persistencia offline** | Plugin `Preferences` para key-value simple, respaldado por almacenamiento nativo (`UserDefaults` en iOS, `SharedPreferences` en Android, `localStorage` en web). Explícitamente *"not meant to be used as a local database... recommend taking a look at a SQLite-based solution"* para datos más pesados. [Source: https://capacitorjs.com/docs/apis/preferences] Existen plugins adicionales (Filesystem, SQLite community) para offline más robusto. | Depende enteramente de las APIs web estándar: `localStorage`, `IndexedDB` vía Service Worker, Cache API. *"IndexedDB is async and can be used from both a Worker and Main thread, making it somewhat of a standard for PWA storage."* [Source: búsqueda, resumen de práctica estándar PWA] Nada nuevo que aprender si el equipo ya sabe hacer un Service Worker con estrategia de caché — pero registro-app hoy no tiene Service Worker ni manifest, así que ese trabajo previo es un prerrequisito real. |

---

## 4. ¿Cuál es más barato/rápido para el objetivo inmediato (APK Android para grupo cerrado), sin cerrar la puerta a iOS?

**Para el objetivo inmediato (APK Android, grupo cerrado, YA):**

El camino **TWA vía Bubblewrap (o PWABuilder)** es sustancialmente más rápido y barato:
- No requiere tocar el código de la app Next.js existente (rutas API, `@supabase/ssr`,
  App Router siguen funcionando exactamente como en el deploy web actual).
- El escaneo de códigos con `html5-qrcode` sigue funcionando sin cambios, porque el TWA
  simplemente renderiza el sitio con Chrome y `getUserMedia` funciona igual.
- El único trabajo previo real es: (a) agregar un Web App Manifest válido, (b) agregar
  un Service Worker mínimo (aunque sea solo para cachear el shell, no offline completo),
  y (c) correr `bubblewrap init && bubblewrap build` y publicar `assetlinks.json` en el
  dominio. Esto es cuestión de horas/pocos días, no de una migración de arquitectura.
- Costo de mantenimiento continuo: casi nulo — cada cambio en el sitio web se refleja
  automáticamente en el TWA sin recompilar ni resubir el APK (excepto cuando cambien
  manifest/ícono/nombre, que sí requieren rebuild).

**Costo del camino Capacitor ahora mismo:** exige decidir entre (a) hacer `next export`
y perder las rutas server (`app/api/*`, lógica `@supabase/ssr` de servidor) — trabajo de
refactor no trivial — o (b) mantener el backend desplegado en Vercel y que el bundle
local del WebView llame a ese backend por HTTP — arquitectónicamente más limpio a largo
plazo pero más trabajo de setup inicial (dos "modos" de build, revisar auth, configurar
proyectos nativos, keystores, etc.). Ninguna opción es "unas horas".

**Para no cerrar la puerta a iOS más adelante:**

Ninguno de los dos caminos da iOS "gratis" bajo las reglas actuales de Apple:
- TWA no tiene equivalente iOS en absoluto (tecnología Android/Chrome).
- Un wrapper WKWebView puro (lo que ofrecería PWABuilder para iOS) cae bajo el mismo
  riesgo de rechazo 4.2 que cualquier "repackaged website" — documentado explícitamente
  por Apple.
- Capacitor sí da una ruta real a iOS *con trabajo adicional de "hacerse app de
  verdad"*: agregar funcionalidad nativa genuina (push notifications reales, acceso a
  cámara nativo, navegación app-like, posible soporte offline robusto) es precisamente
  lo que Apple exige en 4.2, y Capacitor está diseñado para facilitar exactamente ese
  tipo de integración nativa sin reescribir toda la UI.

**Recomendación:**

1. **Ahora (Android, grupo cerrado):** usar el camino TWA con Bubblewrap. Es la opción
   más rápida y de menor riesgo para producir un APK instalable esta semana, sin tocar
   la arquitectura Next.js/Supabase actual. Requiere solo agregar manifest + service
   worker mínimo al sitio ya desplegado.
2. **No descartar Capacitor, pero no adoptarlo todavía.** Diseñar "pensando en el
   futuro" significa, concretamente: mantener las rutas API bien separadas de la UI
   (para facilitar más adelante un build híbrido de Capacitor que llame al backend por
   URL absoluta), y evitar acoplar lógica de negocio a comportamientos exclusivos de
   SSR de Next.js que sean difíciles de replicar en un WebView. Eso deja la puerta
   abierta a migrar a Capacitor cuando el objetivo real sea Google Play + App Store con
   funcionalidad nativa genuina (necesaria de todas formas para pasar 4.2 en iOS).
3. Cuando llegue el momento de iOS, la única vía viable de aprobación no es "empaquetar
   el PWA" sino invertir en Capacitor (o nativo puro) y añadir capacidades app-like
   reales — eso es un proyecto aparte, no una tarea de empaquetado.

---

## Fuentes consultadas directamente

- https://capacitorjs.com/docs/config (server.url)
- https://capacitorjs.com/docs/basics/workflow
- https://capacitorjs.com/docs/apis/camera
- https://capacitorjs.com/docs/apis/push-notifications
- https://capacitorjs.com/docs/apis/preferences
- https://capacitorjs.com/ (landing/overview)
- https://developer.apple.com/app-store/review/guidelines/ (guideline 4.2, 4.2.2, 4.2.3)
- https://github.com/GoogleChromeLabs/bubblewrap (README, vía búsqueda)
- https://nextjs.org/docs/messages/api-routes-static-export
- https://github.com/vercel/next.js/discussions/55393 (secundaria, comunidad)
- Guías secundarias sobre rechazos reales de Apple a wrappers WebView (MobiLoud,
  Code2Native, developer.apple.com/forums) — usadas solo para contexto de aplicación
  práctica de 4.2, no como fuente normativa (la normativa es la guideline citada arriba).
