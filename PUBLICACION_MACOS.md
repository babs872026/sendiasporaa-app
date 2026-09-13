# Publicacion para macOS

Esta guia resume rutas realistas para distribuir SenDiasporaa en macOS.

## 1) Punto clave

Google Play no distribuye apps para macOS. Necesitas un paquete distinto para Mac.

## 2) Opciones de distribucion

1. Distribucion directa (fuera de tienda): Electron + notarizacion Apple
2. Mac App Store: app empaquetada y subida con App Store Connect

## 3) Ruta recomendada por velocidad

- Fase 1: Android en Play (TWA)
- Fase 2: macOS con Electron notarizado
- Fase 3: evaluar Mac App Store si necesitas alcance de tienda

## 4) Requisitos para macOS

- Cuenta Apple Developer activa
- Certificados de firma
- Notarizacion habilitada
- Politica de privacidad y soporte publicados

## 5) Opcion A: Electron (distribucion directa)

Flujo general:

1. Crear shell Electron que cargue https://www.sendiasporaa.com
2. Configurar iconos de app macOS
3. Firmar app
4. Notarizar
5. Publicar .dmg en tu web

Herramientas comunes:

- electron
- electron-builder

## 6) Opcion B: Mac App Store

Flujo general:

1. Crear app macOS firmable (Electron o contenedor nativo)
2. Cumplir requisitos de sandbox/entitlements
3. Subir build con Transporter o Xcode
4. Completar metadata en App Store Connect
5. Enviar a revision

## 7) Criterios de calidad antes de publicar

- Login y CRUD funcionales
- Reportes y PDF funcionales
- Rendimiento aceptable en Mac Intel y Apple Silicon
- Errores JS controlados
- Flujo de actualizacion definido

## 8) Recomendacion practica

Si el objetivo inmediato es llegar rapido a usuarios moviles, cierra primero Android Play. Luego abre un proyecto paralelo para macOS sin bloquear el roadmap principal.
