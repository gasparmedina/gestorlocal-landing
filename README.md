# GestorLocal — landing de validación

Landing estática (ES + EN) para validar el AI setter de clínicas estéticas, con demo de chat
WhatsApp animado embebido y videos MP4 pro. Cero dependencias externas en runtime
(HTML + CSS + JS vanilla, fuentes del sistema). Copy fuente: `../assets/landing-copy.md`.

## Estructura

```
landing/
├── index.html            # Landing ES (gestorlocal.com)
├── privacidad.html       # Política de privacidad ES (checklist LIA §7)
├── aviso-legal.html      # Aviso legal LSSI Art. 10
├── en/
│   ├── index.html        # Landing EN
│   └── privacy.html      # Privacy policy EN
├── demo/
│   ├── es.html           # Chat animado standalone ES (embebido vía iframe + fuente del video)
│   └── en.html           # Ídem EN
├── assets/
│   ├── landing.css       # Estilos de la landing
│   ├── chat.css          # Estilos del chat WhatsApp
│   └── chat.js           # Motor de animación del chat (vanilla)
├── media/
│   ├── demo-es.mp4       # Video demo ES — 1080x1920 (9:16), H.264, ~30 s
│   └── demo-en.mp4       # Video demo EN — ídem
└── tools/
    ├── record-demo.mjs   # Grabador (Playwright + ffmpeg)
    └── package.json
```

## Correr local

No hay build. Abrí `index.html` directo en el navegador, o serví el directorio:

```bash
cd landing
python3 -m http.server 8080   # → http://localhost:8080
```

El chat animado loopea solo (≈37 s por vuelta, incluyendo el cierre en pantalla).

## Regenerar los videos

Requisitos: Node ≥ 18 y `ffmpeg` en el PATH.

```bash
cd landing/tools
npm install
npx playwright install chromium   # solo la primera vez
node record-demo.mjs              # ambos idiomas → ../media/demo-{es,en}.mp4
node record-demo.mjs es           # solo uno (es | en)
```

El grabador abre `demo/<lang>.html?record=1&zoom=3` en un viewport 1080x1920, espera a que
la animación termine (la página setea `document.title = "DEMO_DONE"`) y transcodea a
H.264 (`crf 20`, 30 fps, `+faststart`, sin audio). Si tocás el guión en `demo/*.html`,
solo volvé a correr el script.

## Placeholders pendientes (buscar y reemplazar antes de publicar)

| Placeholder | Dónde | Qué va |
|---|---|---|
| `{{CALENDLY_URL}}` | `index.html`, `en/index.html` (botón CTA) | Link real de Calendly de la demo de 15 min |
| `{{RAZON_SOCIAL}}` | footers + páginas legales | Razón social de la empresa uruguaya |
| `{{RUT}}` | footers + páginas legales | RUT de la empresa |
| `{{DOMICILIO}}` | footers + páginas legales | Domicilio postal completo en Uruguay |
| `{{EMAIL_DERECHOS}}` | footers + páginas legales | Email de contacto / ejercicio de derechos (el mismo del footer de los emails) |

```bash
grep -rn "{{" landing --include="*.html"   # verificar que no quede ninguno
```

Además, dentro del copy hay dos bloques comentados de **prueba social** (`<!-- Prueba/credibilidad -->`)
para descomentar cuando exista el primer caso real.

## Deploy (Cloudflare Pages)

Los archivos son estáticos y están listos:

1. Cloudflare Pages → *Create project* → conectar el repo (o *Direct upload* del directorio `landing/`).
2. Build command: **ninguno**. Output directory: `landing` (o la raíz si subís el directorio directo).
3. Apuntar `gestorlocal.com` al proyecto. Cloudflare sirve HTTPS automático (requisito del checklist legal).
4. La versión EN queda en `/en/` (ya interlinkeada con `hreflang`).

Notas legales (LIA-ES §7): la landing no usa cookies ni analytics → no requiere banner. Si
algún día se agrega GA u otro tracker, primero va banner de consentimiento + política de cookies.
