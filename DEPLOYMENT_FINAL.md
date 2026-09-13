# Deployment final - Blog Notas XL

Esta guia deja la version actual lista para publicacion estable.

## 1) Estado recomendado antes de desplegar

- Frontend build OK (`npm run build` en `App-Notas`).
- Backend funcionando local (`npm start` en `App-Notas/server`).
- Secretos reales fuera del repositorio.
- Dominio final definido (recomendado: `sendiasporaa.com` + `api.sendiasporaa.com`).

## 2) Backend en Render (API)

Archivo base ya preparado: `render.yaml`.

### Variables obligatorias en Render

- `MONGO_URI` = cadena de MongoDB Atlas (produccion).
- `MONGO_DB` = `app_notas`.
- `JWT_SECRET` = secreto largo y aleatorio.
- `CORS_ORIGINS` = lista separada por coma:
  - `https://sendiasporaa.com`
  - `https://www.sendiasporaa.com`
  - `https://sendiasporaa-app.vercel.app`
  - `https://sendiasporaa-*.vercel.app`

### Variables de sistema (ya contempladas)

- `NODE_VERSION=20`
- `NODE_ENV=production`

### Validacion backend post-deploy

- Health: `https://api.sendiasporaa.com/health`
- Debe responder JSON con `ok: true`.

## 3) Frontend en Vercel

Archivo base ya preparado: `vercel.json` (SPA rewrite + cache-control SW).

### Configuracion del proyecto

- Framework preset: Vite.
- Build command: `npm run build`.
- Output directory: `dist`.
- Root directory: `App-Notas` (si tu repo tiene esa carpeta como subdirectorio).

### Variables de entorno en Vercel

- `VITE_API_BASE=https://api.sendiasporaa.com`

## 4) DNS recomendado

- `sendiasporaa.com` y `www.sendiasporaa.com` -> Vercel.
- `api.sendiasporaa.com` -> Render (custom domain del servicio API).

## 5) Smoke test final (obligatorio)

1. Abrir `https://sendiasporaa.com`.
2. Verificar login/registro.
3. Crear nota y confirmar persistencia.
4. Crear entrada horaria y revisar reporte mensual.
5. Descargar PDF de reporte.
6. Refrescar pagina y confirmar sesion/token vigentes.

## 6) Checklist de salida a produccion

- [ ] `MONGO_URI` apunta a cluster de produccion.
- [ ] `JWT_SECRET` rotado y robusto.
- [ ] `CORS_ORIGINS` contiene dominio principal, www y previews Vercel.
- [ ] `VITE_API_BASE` en Vercel apunta a `https://api.sendiasporaa.com`.
- [ ] `/health` responde `ok: true`.
- [ ] Flujo registro -> login -> crear nota funciona en dominio publico.
- [ ] Reporte y PDF operativos.

## 7) Comandos utiles de verificacion local

```powershell
# frontend
cd App-Notas
npm run build

# backend
cd server
npm start
```

## 8) Nota sobre desarrollo local

La app ahora fuerza backend local en modo desarrollo (`http://localhost:3000`) para evitar confusiones de entorno. Esto no afecta produccion.
