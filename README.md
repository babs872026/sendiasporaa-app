# Blog de Notas

Aplicación de notas y registro horario con frontend React + Vite y backend Node/Express.

> Nota: el proyecto fue migrado de SQLite/Docker a MongoDB local para el desarrollo. Docker ya no forma parte del flujo por defecto.

## Estructura principal

- `src/` - cliente React / Vite.
- `server/` - API Express con MongoDB y autenticación JWT.

## Requisitos

- Node.js (v18+ recomendado)
- MongoDB local accesible en `mongodb://localhost:27017` (puedes usar MongoDB Community o MongoDB Compass)

## Desarrollo local

1. Abrir terminal en la carpeta del proyecto (`App-Notas`).
2. Instalar dependencias:

```powershell
npm install
cd server
npm install
cd ..
```

3. Ejecutar backend y frontend:

```powershell
# arrancar backend (en una terminal)
cd server
npm start    # o: node index.js

# arrancar frontend (en otra terminal)
cd ..
npm run dev
```

Por defecto:

- Frontend: `http://localhost:5174/`
- Backend: `http://localhost:3000/`

Si `VITE_API_BASE` debe apuntar al backend, configúralo en tu entorno: `VITE_API_BASE=http://localhost:3000`.

## Uso de la aplicación

- `http://localhost:5174/` - página de bienvenida e inicio de sesión.
- `http://localhost:5174/app` - panel de notas y registro horario una vez autenticado.

### Funcionalidades principales

- Registro y login de usuario (JWT).
- CRUD de notas.
- Registro horario por día con `shift` (mañana/tarde/noche) y horas extra (fines de semana y festivos).
- Reporte mensual de horas y horas extra.

## Notas importantes

- Base de datos: por defecto la app usa `mongodb://localhost:27017` y la base `app_notas`.
- Variables de entorno útiles:
	- `MONGO_URI` (por defecto `mongodb://localhost:27017`)
	- `MONGO_DB` (por defecto `app_notas`)
	- `JWT_SECRET` (clave para firmar tokens JWT)
	- `VITE_API_BASE` (URL base del backend, p. ej. `http://localhost:3000`)

Configura estas variables según tu entorno antes de arrancar el backend si quieres valores diferentes.

## Comandos útiles

```powershell
# iniciar backend
cd server
npm start

# iniciar frontend
cd ..
npm run dev

# build del frontend para producción
npm run build
```

## Estado actual para publicar (PWA base)

La app ya incluye base PWA:

- `public/manifest.webmanifest`
- `public/service-worker.js`
- Iconos iniciales en `public/icons/`

Esto permite continuar con despliegue HTTPS y luego empaquetado para tiendas.

## Despliegue web (HTTPS) recomendado

### Opción 1: Vercel

Este repo ya incluye `vercel.json` con rewrite para SPA.

1. Conectar el repositorio en Vercel.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Publicar y validar que:
	- `/` abre bienvenida
	- `/app` abre panel
	- `https://tu-dominio/manifest.webmanifest` responde

### Opción 2: Netlify

Este repo ya incluye `public/_redirects` para SPA.

1. Conectar el repositorio en Netlify.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Publicar y validar rutas `/` y `/app`.

## Backend en produccion (Render recomendado)

El frontend en Vercel necesita un backend publico (no `localhost`).

Este repo ya incluye `render.yaml` para desplegar la API desde `server/`.

### Pasos en Render

1. Crear cuenta en Render.
2. New + > Blueprint y seleccionar este repo.
3. Render detectara `render.yaml` y creara el servicio `sendiasporaa-api`.
4. Configurar variables sensibles:
	- `MONGO_URI` (MongoDB Atlas recomendado)
	- `JWT_SECRET`
	- `CORS_ORIGINS`
5. Definir `CORS_ORIGINS` con tu dominio:
	- `https://sendiasporaa.com,https://www.sendiasporaa.com`
6. Verificar health check:
	- `https://tu-api.onrender.com/health` -> `{ "ok": true }`

### Conectar frontend (Vercel) con backend

1. En Vercel > Project Settings > Environment Variables:
	- `VITE_API_BASE=https://tu-api.onrender.com`
2. Redeploy del frontend.
3. Probar login y CRUD desde dominio publico.

## Variables de entorno ejemplo

- Frontend: `/.env.example`
- Backend: `/server/.env.example`

## Dominio (SenDiasporaa)

Sugerencia de búsqueda (en este orden):

1. `sendiasporaa.com`
2. `sendiasporaa.app`
3. `sendiasporaa.net`
4. `sendiasporaa.es`

Flujo de dominio:

1. Registrar dominio en proveedor (Cloudflare Registrar, Namecheap, etc.).
2. Apuntar DNS al hosting:
	- `A` o `CNAME` según Vercel/Netlify.
3. Confirmar SSL activo (candado en navegador).
4. Probar `manifest.webmanifest` y service worker en HTTPS.

## Roadmap de publicación en tiendas

### Android (Google Play)

Ruta rápida recomendada: PWA + TWA (Bubblewrap).

1. Tener dominio HTTPS en producción.
2. Generar proyecto TWA con Bubblewrap.
3. Compilar `.aab` en Android Studio.
4. Subir a Play Console (internal testing primero).

### iPhone (App Store)

Ruta recomendada: Capacitor + Xcode.

1. Crear contenedor nativo iOS con Capacitor.
2. Configurar firma/certificados en Xcode.
3. Subir build a TestFlight.
4. Publicar en App Store tras QA.

### Windows

Opciones:

1. PWA en Microsoft Store (PWABuilder/MSIX).
2. Escritorio nativo con Electron + MSIX/instalador.

### macOS

Opciones:

1. Electron notarizado (distribución directa).
2. Mac App Store (con requisitos adicionales de firma y sandbox).

## Siguiente paso sugerido

Con el dominio aún pendiente, el siguiente hito operativo es:

1. Registrar dominio `SenDiasporaa`.
2. Desplegar a Vercel o Netlify.
3. Validar PWA en HTTPS.
4. Iniciar empaquetado Android (TWA) en track interno.

## Rutas y endpoints

El backend expone (entre otras):

- `POST /auth/register`
- `POST /auth/login`
- `GET/POST/PUT/DELETE /notes`
- `GET/POST/PUT/DELETE /time-entries`
- `GET /reports/hours?month=YYYY-MM`

---

Este README refleja el flujo de desarrollo actual (MongoDB local). Si quieres que vuelva a añadir instrucciones para ejecutar con Docker o actualizar la documentación más a fondo, dímelo.
