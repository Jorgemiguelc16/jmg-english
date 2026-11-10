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

1. **Repaso de memoria**: ves el español y dices la frase en inglés sin ayuda.
2. **Memoriza una frase nueva** (de Películas, Palabras, Conversación o Mis frases):
   1. **Entender**: desglose palabra por palabra y cómo suena.
   2. **Repetir** 4 veces en voz alta viendo el texto (el micrófono cuenta cada repetición).
   3. **Con pistas** 3 veces: solo ves la primera letra de cada palabra.
   4. **De memoria** 3 veces: solo ves el español.
   5. **Escribir** la frase de memoria.

¿Escuchaste una frase que te gustó en una película o serie? **Agregar** → guárdala y memorízala.

En **Práctica** hay escritura de memoria, sesiones mixtas, dictados y diálogos.

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
| `js/memorize.js` | Método de memorización y repaso de memoria |
| `js/screens.js` | Pantallas (inicio, biblioteca, agregar, práctica, ajustes) |
| `js/app.js` | Armado de sesiones mixtas |
| `js/exercises.js` | Los 7 tipos de ejercicio |
| `js/store.js` | Progreso, racha y repaso espaciado |
| `js/speech.js` | Voz en inglés y micrófono |
| `js/text.js` | Compara tus respuestas con las correctas |
| `js/util.js` | Utilidades e íconos |
| `server.js` + `.bat` | Solo para usarla en local |
