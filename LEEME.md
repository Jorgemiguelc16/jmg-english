# JMG English

Plataforma personal para aprender a **conversar** en inglés.

## Cómo abrirla

**En internet (recomendado):** abre tu enlace de GitHub Pages (`https://<tu-usuario>.github.io/jmg-english/`) desde la computadora o el celular.
En el celular puedes usar "Agregar a pantalla de inicio" para tenerla como si fuera una app.

**En local:** doble clic en `Abrir JMG English.bat` (abre `http://localhost:5180`).

> Usa **Edge** o **Chrome**. Edge tiene voces "Natural" que suenan como personas reales.
> La primera vez que uses el micrófono, el navegador te pedirá permiso: dale **Permitir**.

## Sin internet

Si ya abriste la app una vez con internet, después también abre sin conexión (el enlace de GitHub y el `.bat`).
Sin internet:

- **Micrófono:** no funciona. En su lugar tú marcas cada repetición con el botón.
- **Voz:** las voces "Natural" necesitan internet. Se usa la voz en inglés instalada en la computadora (más robótica). Si no tienes ninguna, instálala en **Configuración de Windows → Hora e idioma → Voz → Agregar voces → English**.
- **Traducir:** funciona si descargaste el traductor sin internet. Hazlo una vez con internet desde **Traducir → Descargar**. Funciona en Edge y Chrome de la computadora.

La app te avisa arriba cuando estás sin internet.

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

**Inglés británico:** arriba en Inicio (o en Ajustes) eliges el acento, **Americano** o **Británico**. Cambia las voces y lo que entiende el micrófono. Las conversaciones y frases de la colección **Británico** siempre suenan británicas, aunque tengas elegido el acento americano. Las voces dependen del navegador: Edge tiene las mejores.

**Traducir:** en el menú, escribe lo que quieres decir en español y la app te dice cómo se dice en inglés. Puedes escucharlo, ver el significado de cada palabra y guardarlo para memorizarlo. Con internet, tu frase se envía a un servicio de traducción (Google Translate o MyMemory), así que evita escribir datos privados. Sin internet usa el traductor de tu navegador, dentro de tu computadora.

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

Lo más fácil es usar **Traducir** o **Agregar** dentro de la app. Si prefieres editar el contenido a mano, abre `js/data/topics.js` y agrega frases **al final** de cualquier tema (nunca en medio: tu progreso depende del orden):

```js
["I can't wait for the weekend.", "No puedo esperar a que llegue el fin de semana.", "Consejo opcional"],
```

## Cómo está ordenado el código

| Carpeta | Qué hay |
|---|---|
| `index.html` | Página principal. Carga los archivos en orden |
| `css/` | Diseño, un archivo por parte de la app. `responsive.css` va siempre al final |
| `js/data/` | **Contenido**: temas, diálogos, consejos, películas, palabras, británico, glosario y conversaciones |
| `js/core/` | Base: utilidades, íconos, progreso (`store.js`), comparar respuestas (`text.js`), voz y micrófono (`speech.js`) y traductor con y sin internet (`translator.js`) |
| `js/exercises/` | Ejercicios: práctica (`practice.js`), memorizar (`memorize.js`) y conversaciones (`scene.js`) |
| `js/session/` | Sesiones: planes por tiempo (`plans.js`), pantalla de ejercicios (`session.js`) e inicio de cada tipo (`starters.js`) |
| `js/screens/` | Una pantalla por archivo: inicio, biblioteca, traducir, agregar, práctica, ajustes y bienvenida |
| `js/main.js` | Arranque, rutas y aviso de sin internet |
| `sw.js` | Guarda una copia de la app para abrirla sin internet |
| `server.js` + `.bat` | Solo para usarla en local |
