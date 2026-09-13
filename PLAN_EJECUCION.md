# Plan de ejecucion del proyecto

Este documento resume el avance aplicado y lo siguiente por implementar.

## Fase 1 - Seguridad e higiene (en progreso)

- [x] Eliminar secretos reales de ejemplos de entorno.
- [x] Anonimizar tokens y usuarios en muestras JSON.
- [x] Agregar cabeceras de seguridad con `helmet` en backend.
- [x] Limitar intentos de autenticacion (`/auth/login` y `/auth/register`).
- [ ] Rotar credenciales reales en proveedores (MongoDB/Render/Vercel) fuera del repo.
- [ ] Revisar y ajustar `CORS_ORIGINS` final de produccion.

## Fase 2 - Calidad tecnica

- [x] Agregar pruebas de API para auth, notes y time-entries.
- [x] Base de testing backend creada con Vitest + Supertest.
- [x] Suite activa: `/health`, `/auth/register`, `/auth/login`.
- [x] Suite activa: notes CRUD (`GET/POST/PUT/DELETE`) y validacion de titulo.
- [x] Suite activa: time-entries (`GET/POST/DELETE`), overtime y validacion de horario.
- [ ] Estandarizar validaciones de entrada (schema-based).
- [ ] Unificar respuestas de error y logging estructurado.

## Fase 3 - Producto y UX

- [ ] Mejorar dashboard con KPIs de horas normales y extra.
- [ ] Mejorar experiencia movil.
- [ ] Consolidar flujo de reporte mensual y exportaciones.

## Checklist operativo recomendado

1. Definir y guardar nuevos secretos en Render y MongoDB Atlas.
2. Desplegar backend actualizado y verificar `/health`.
3. Validar login y registro desde frontend publicado.
4. Ejecutar pruebas manuales CRUD de notas y registros horarios.
5. Priorizar pruebas automatizadas en backend.
