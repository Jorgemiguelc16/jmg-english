# JMG English

Plataforma personal para aprender a **conversar** en inglés.

## Cómo abrirla

**En internet (recomendado):** abre tu enlace de GitHub Pages (`https://<tu-usuario>.github.io/jmg-english/`) desde la computadora o el celular.
En el celular puedes usar "Agregar a pantalla de inicio" para tenerla como si fuera una app.

**Sin internet / en local:** doble clic en `Abrir JMG English.bat` (abre `http://localhost:5180`).

> Usa **Edge** o **Chrome**. Edge tiene voces "Natural" que suenan como personas reales.
> La primera vez que uses el micrófono, el navegador te pedirá permiso: dale **Permitir**.

## Tu progreso

Se guarda en el navegador donde estudias. La versión de GitHub y la local tienen progresos **separados**.
Para pasar tu progreso de uno a otro (o a tu celular): **Ajustes → Datos → Descargar** y luego **Cargar** en el otro.

## Cómo usarla

1. Entra todos los días, aunque sea 5 minutos: eso mantiene tu racha.
2. Elige cuánto tiempo tienes hoy (5 / 15 / 30 / 60 min). La sesión se arma sola:
   repasos → frases nuevas → práctica mezclada → diálogos (en 30 y 60 min).
3. Cada 7 días de racha ganas un **protector** (máx. 2) que salva tu racha si un día no puedes.

Atajos en las sesiones: **Enter** = botón principal · **1–4** = elegir opción o calificar.

## Publicar cambios en GitHub

```bash
git add -A
git commit -m "Describe el cambio"
git push
```

GitHub Pages se actualiza solo en 1–2 minutos.

## Agregar tus propias frases

Abre `js/data.js` y agrega frases **al final** de cualquier tema (nunca en medio: tu progreso depende del orden):

```js
["I can't wait for the weekend.", "No puedo esperar a que llegue el fin de semana.", "Consejo opcional"],
```

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Página principal |
| `css/styles.css` | Diseño (modo claro y oscuro automático) |
| `js/data.js` | **Contenido**: frases, diálogos y consejos |
| `js/app.js` | Pantallas y armado de sesiones |
| `js/exercises.js` | Los 7 tipos de ejercicio |
| `js/store.js` | Progreso, racha y repaso espaciado |
| `js/speech.js` | Voz en inglés y micrófono |
| `js/text.js` | Compara tus respuestas con las correctas |
| `js/util.js` | Utilidades e íconos |
| `server.js` + `.bat` | Solo para usarla en local |
