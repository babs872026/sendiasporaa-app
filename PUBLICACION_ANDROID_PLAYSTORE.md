# Publicacion Android en Google Play (TWA)

Esta guia describe el flujo recomendado para publicar SenDiasporaa en Google Play usando TWA (Trusted Web Activity).

## 1) Punto clave

Google Play publica apps Android. Para macOS necesitas un paquete distinto y otro canal (ver PUBLICACION_MACOS.md).

## 2) Requisitos previos

- Dominio en produccion con HTTPS: https://www.sendiasporaa.com
- API en produccion operativa: https://api.sendiasporaa.com/health
- PWA valida: manifest + service worker + iconos
- Cuenta de Google Play Console activa
- Java 17+ y Android SDK instalados
- Android Studio instalado (recomendado)

## 3) Checklist PWA antes de empaquetar

1. Manifest accesible en produccion: /manifest.webmanifest
2. Service worker activo en produccion
3. Iconos de app listos (ideal: PNG 192x192 y 512x512, incluyendo maskable)
4. Prueba real en movil: login, notas, registro horario, reporte, PDF
5. Politica de privacidad publicada en URL publica

## 4) Preparar herramientas de TWA

En una terminal:

```powershell
npm install -g @bubblewrap/cli
bubblewrap --version
```

Si no quieres instalacion global, usa:

```powershell
npx @bubblewrap/cli --help
```

## 5) Inicializar proyecto Android (TWA)

Crear carpeta para app Android (fuera del frontend web):

```powershell
cd App-Notas
mkdir android-twa
cd android-twa
npx @bubblewrap/cli init --manifest https://www.sendiasporaa.com/manifest.webmanifest
```

Durante el asistente:

- Application id sugerido: com.sendiasporaa.app
- Start URL: https://www.sendiasporaa.com/app
- Display mode: standalone
- Elegir nombre visible de app y colores del tema

## 6) Firma (keystore)

Genera y guarda tu keystore en un lugar seguro:

```powershell
keytool -genkeypair -v -keystore sendiasporaa-release.keystore -alias sendiasporaa -keyalg RSA -keysize 2048 -validity 10000
```

Notas importantes:

- Guarda contraseña y alias en un gestor seguro.
- Haz backup del keystore. Perderlo complica futuras actualizaciones.

## 7) Compilar AAB para Play

```powershell
cd App-Notas/android-twa
npx @bubblewrap/cli build
```

Si el asistente no genera AAB directo, abre el proyecto en Android Studio y ejecuta:

- Build > Generate Signed Bundle / APK
- Android App Bundle (AAB)
- Usa tu keystore de release

## 8) Subida en Play Console

1. Crea app nueva en Play Console.
2. Completa ficha de tienda (titulo, descripcion, categoria, icono, screenshots).
3. Completa Data safety.
4. Completa Content rating.
5. Sube el archivo .aab en Internal testing.
6. Prueba instalacion en al menos 2 dispositivos Android.

## 9) Criterios para pasar a produccion

- Login y registro funcionan
- Crear/editar/eliminar nota funciona
- Registro horario y reporte mensual funcionan
- PDF funciona en dispositivo real
- Sin errores bloqueantes en Android vitals

## 10) Operacion continua

Cada vez que publiques cambios web importantes:

1. Despliega web/API
2. Revalida smoke test
3. Si hay cambios de branding, permisos o comportamiento nativo, sube nuevo .aab

## 11) Riesgos comunes

- Falta de politica de privacidad publica
- Keystore perdido
- Dominio con cache desactualizada
- Iconos no conformes para Google Play
- Cambios web sin regression test movil

## 12) Siguiente paso recomendado

Crear y publicar una primera build en Internal testing para validar el pipeline completo sin riesgo.
