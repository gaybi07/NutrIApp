# Registro Nutricional — App Next.js

App real (no un archivo HTML suelto) para registrar comidas, pasos y entrenamiento, con:

- Registro de comidas por **texto/voz interpretado por IA** (llamada segura del lado del servidor, la API key nunca se expone al navegador — a diferencia del prototipo HTML inicial).
- Estimación de **gasto calórico dinámico** según pasos + entrenamiento.
- Gráfico semanal, tabla diaria con déficit, ranking de días por densidad de proteína.
- Calculadora de objetivo → déficit necesario.
- **PWA real**: al desplegarla con HTTPS, "Agregar a pantalla de inicio" va a funcionar de verdad (ícono propio, pantalla completa), a diferencia del archivo HTML suelto que no tenía URL propia.

## 1. Instalación local

Necesitás [Node.js](https://nodejs.org) 18 o superior instalado.

```bash
npm install
```

## 2. Variables de entorno

Creá un archivo `.env.local` en la raíz del proyecto (no lo subas a git):

```
ANTHROPIC_API_KEY=tu_api_key_aca
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon
```

Conseguís la key en [console.anthropic.com](https://console.anthropic.com).

Las variables de Supabase están en `Project Settings → API`. Si todavía no las
configurás, la app sigue funcionando en modo local con `localStorage`.

## 3. Configurar persistencia y acceso con Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Abrí `SQL Editor`, pegá el contenido de `supabase/schema.sql` y ejecutalo.
3. En `Authentication → URL Configuration`, agregá `http://localhost:3000/auth/callback`
  como URL de redirección.
4. Copiá la URL y la clave `anon` a `.env.local`.
5. Reiniciá el servidor de desarrollo.

La app usa un enlace mágico por email. Las filas de `days` y `user_settings` están
protegidas con RLS y solo se pueden leer o modificar con `auth.uid()` del usuario
actual. La ruta `app/api/data` nunca acepta un `user_id` desde el navegador.

## 4. Correr en desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) — desde el celular en la misma red podés entrar con la IP local de tu PC (ej: `http://192.168.0.X:3000`) para probarlo en el teléfono mientras desarrollás.

## 5. Íconos de la PWA (pendiente)

El `manifest.json` en `public/` espera dos íconos que todavía no existen:

- `public/icon-192.png` (192x192px)
- `public/icon-512.png` (512x512px)

Generá o diseñá un logo simple y guardalo con esos nombres/tamaños en `public/` antes de desplegar — sin esto, el ícono de la pantalla de inicio va a salir en blanco.

## 6. Desplegar con URL real (para que la PWA funcione de verdad)

La forma más simple y gratuita es **Vercel** (los creadores de Next.js):

```bash
npm install -g vercel
vercel
```

Seguís las instrucciones (te pide loguearte, y detecta automáticamente que es un proyecto Next.js). Al final te da una URL pública tipo `tu-proyecto.vercel.app`. Ahí sí, "Agregar a pantalla de inicio" desde el navegador del celular va a instalar la app de verdad, con ícono y pantalla completa.

**Importante:** en el dashboard de Vercel tenés que cargar la variable de entorno `ANTHROPIC_API_KEY` (Settings → Environment Variables) — el `.env.local` de tu PC no se sube automáticamente por seguridad.

## 7. Qué falta para ser un producto vendible a gimnasios

Ver el documento `spec_app_nutricion.md` (compartido aparte) para el roadmap completo. En resumen, lo más importante que falta:

1. **Backend + cuenta de usuario real** (hoy los datos viven en `localStorage` del navegador — se pierden si cambiás de dispositivo o borrás datos del navegador). Reemplazar `lib/useLocalDays.ts` por llamadas a una API propia con base de datos (Postgres, Supabase, Firebase) es el cambio más importante.
2. **Panel para el gimnasio/entrenador** viendo el progreso de sus clientes.
3. **Integración con Apple Health / Google Fit** para que los pasos y entrenamientos se carguen solos (esto no se puede hacer en una web normal — requiere una app nativa envuelta con Capacitor, o una PWA con permisos limitados según el sistema operativo).
4. **Disclaimer legal** de que no es asesoramiento nutricional/médico (ver spec, sección 6).

## Estructura del proyecto

```
app/
  layout.tsx          → layout raíz + metadata PWA
  page.tsx            → página principal (une todos los componentes)
  globals.css         → estilos base + fuentes
  api/parse-meal/     → endpoint que llama a la API de Claude (server-side)
components/
  SummaryCards.tsx    → tarjetas de resumen semanal
  WeeklyChart.tsx     → gráfico de barras apiladas
  Ledger.tsx          → tabla diaria
  RankingCard.tsx     → ranking de días por densidad de proteína
  GoalCalculator.tsx  → calculadora de objetivo → déficit
  AiEntryForm.tsx     → formulario de registro con IA
lib/
  types.ts            → tipos compartidos
  calculations.ts     → toda la lógica de cálculo (pura, sin UI — fácil de testear)
  useLocalDays.ts      → hook de persistencia (hoy localStorage, mañana backend)
public/
  manifest.json       → configuración de PWA
```
