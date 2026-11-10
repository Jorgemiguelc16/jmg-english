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

## Cómo usarla (el método)

Cada día, en **Inicio**:

1. **Repaso de memoria**: actúas de memoria las conversaciones y frases que ya aprendiste.
2. **Aprende una conversación** (Vida diaria · Amigos · Trabajo y uni), como un actor:
   1. **Escuchar**: la escena con dos voces, traducción y palabra por palabra (toca una línea).
   2. **Repetir** línea por línea, las veces que quieras (tus líneas 3 veces).
   3. **Tu parte**: la otra persona habla y tú dices tus líneas **de memoria**.
   4. **Cambia de papel**: ahora haces el otro personaje.
3. **Frases sueltas** (opcional): películas, palabras cotidianas y tus propias frases.

¿Ya te sabes algo? Usa **Ya me la sé** y no te lo vuelve a enseñar (solo aparece de vez en cuando en repasos).

Atajos: **Barra espaciadora** = repetir / hablar · **Enter** = botón principal · **1–4** = opciones.

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
| `js/data.js` | **Contenido**: frases de conversación, diálogos y consejos |
| `js/memo-data.js` | **Contenido**: películas, palabras cotidianas y glosario |
| `js/scenes-data.js` | **Contenido**: las 30 conversaciones |
| `js/scenes.js` | Método de conversaciones (escuchar, repetir, actuar) |
| `js/memorize.js` | Método de memorización y repaso de memoria |
| `js/screens.js` | Pantallas (inicio, biblioteca, agregar, práctica, ajustes) |
| `js/app.js` | Armado de sesiones mixtas |
| `js/exercises.js` | Los 7 tipos de ejercicio |
| `js/store.js` | Progreso, racha y repaso espaciado |
| `js/speech.js` | Voz en inglés y micrófono |
| `js/text.js` | Compara tus respuestas con las correctas |
| `js/util.js` | Utilidades e íconos |
| `server.js` + `.bat` | Solo para usarla en local |
