'use strict';
/*
  DIÁLOGOS: líneas [hablante A/B, inglés, español]
  En las preguntas, la PRIMERA opción es la correcta (se mezclan al mostrarlas).
*/
const DIALOGUES = [
  {
    id: 'd1', topic: 't4', emoji: '☕', title: 'En la cafetería',
    scene: 'Alguien pide algo para tomar en una cafetería.',
    speakers: { A: 'Barista', B: 'Cliente' },
    lines: [
      ['A', "Hi there! What can I get for you?", "¡Hola! ¿Qué te sirvo?"],
      ['B', "Hi! Can I get a large coffee, please?", "¡Hola! ¿Me das un café grande, por favor?"],
      ['A', "Sure. Hot or iced?", "Claro. ¿Caliente o helado?"],
      ['B', "Iced, please. And a chocolate muffin.", "Helado, por favor. Y un muffin de chocolate."],
      ['A', "For here or to go?", "¿Para tomar aquí o para llevar?"],
      ['B', "To go, please. Can I pay by card?", "Para llevar, por favor. ¿Puedo pagar con tarjeta?"],
      ['A', "Of course. That's six fifty.", "Por supuesto. Son seis cincuenta."],
    ],
    questions: [
      { q: '¿Qué pidió el cliente?', options: ['Un café helado grande y un muffin de chocolate', 'Un café caliente pequeño', 'Un té y un sándwich'] },
      { q: '¿Dónde se lo va a tomar?', options: ['Para llevar', 'Ahí mismo, en la cafetería', 'No lo dice'] },
      { q: '¿Cuánto tiene que pagar?', options: ['6.50', '5.60', '16.50'] },
    ],
  },
  {
    id: 'd2', topic: 't1', emoji: '🤝', title: 'Conociendo a alguien',
    scene: 'Dos personas se conocen en una fiesta.',
    speakers: { A: 'Sam', B: 'Daniel' },
    lines: [
      ['A', "Hey, I don't think we've met. I'm Sam.", "Hola, creo que no nos conocemos. Soy Sam."],
      ['B', "Hi Sam, I'm Daniel. Nice to meet you.", "Hola Sam, soy Daniel. Mucho gusto."],
      ['A', "Nice to meet you too. Where are you from?", "Igualmente. ¿De dónde eres?"],
      ['B', "I'm from Colombia, but I live here now.", "Soy de Colombia, pero ahora vivo aquí."],
      ['A', "Cool! What do you do?", "¡Genial! ¿A qué te dedicas?"],
      ['B', "I'm a student. I study engineering.", "Soy estudiante. Estudio ingeniería."],
      ['A', "That's awesome. How long have you lived here?", "Qué bien. ¿Cuánto tiempo llevas viviendo aquí?"],
      ['B', "About two years.", "Como dos años."],
    ],
    questions: [
      { q: '¿De dónde es Daniel?', options: ['De Colombia', 'De México', 'De España'] },
      { q: '¿A qué se dedica Daniel?', options: ['Estudia ingeniería', 'Trabaja en un banco', 'Es profesor'] },
      { q: '¿Cuánto tiempo lleva viviendo ahí?', options: ['Unos dos años', 'Dos meses', 'Diez años'] },
    ],
  },
  {
    id: 'd3', topic: 't7', emoji: '🎬', title: 'Haciendo planes',
    scene: 'Dos amigos organizan su sábado.',
    speakers: { A: 'Emma', B: 'Leo' },
    lines: [
      ['A', "Hey! What are you doing this Saturday?", "¡Hola! ¿Qué vas a hacer este sábado?"],
      ['B', "Nothing special. Why?", "Nada especial. ¿Por qué?"],
      ['A', "Do you want to go to the movies?", "¿Quieres ir al cine?"],
      ['B', "Sure, sounds good! What time?", "¡Claro, me parece bien! ¿A qué hora?"],
      ['A', "How about seven?", "¿Qué tal a las siete?"],
      ['B', "Hmm, I can't at seven. How about eight instead?", "Mmm, a las siete no puedo. ¿Mejor a las ocho?"],
      ['A', "Okay, eight works. Let's meet at the mall.", "Bueno, a las ocho está bien. Veámonos en el centro comercial."],
      ['B', "Perfect. See you there!", "Perfecto. ¡Nos vemos ahí!"],
    ],
    questions: [
      { q: '¿Qué van a hacer?', options: ['Ir al cine', 'Jugar fútbol', 'Ir a cenar'] },
      { q: '¿A qué hora se van a ver?', options: ['A las ocho', 'A las siete', 'A las nueve'] },
      { q: '¿Dónde se van a encontrar?', options: ['En el centro comercial', 'En la casa de Emma', 'En la estación'] },
    ],
  },
  {
    id: 'd4', topic: 't5', emoji: '🗺️', title: 'Pidiendo direcciones',
    scene: 'Un turista pregunta cómo llegar a un lugar.',
    speakers: { A: 'Turista', B: 'Señora' },
    lines: [
      ['A', "Excuse me, how do I get to the train station?", "Disculpe, ¿cómo llego a la estación de tren?"],
      ['B', "Go straight for two blocks and turn right.", "Siga derecho dos cuadras y gire a la derecha."],
      ['A', "Two blocks and then right?", "¿Dos cuadras y luego a la derecha?"],
      ['B', "Yes. The station is on your left, next to a bank.", "Sí. La estación está a su izquierda, al lado de un banco."],
      ['A', "Is it far from here?", "¿Está lejos de aquí?"],
      ['B', "No, it's about five minutes on foot.", "No, está como a cinco minutos caminando."],
      ['A', "Great, thank you so much!", "¡Genial, muchas gracias!"],
      ['B', "No problem.", "De nada."],
    ],
    questions: [
      { q: '¿Qué está buscando el turista?', options: ['La estación de tren', 'Un banco', 'Un hotel'] },
      { q: '¿Cómo tiene que ir?', options: ['Dos cuadras derecho y luego a la derecha', 'Una cuadra y a la izquierda', 'Tomar un bus'] },
      { q: '¿Qué hay al lado de la estación?', options: ['Un banco', 'Un restaurante', 'Un parque'] },
    ],
  },
  {
    id: 'd5', topic: 't6', emoji: '🧥', title: 'En la tienda de ropa',
    scene: 'Alguien quiere comprar una prenda.',
    speakers: { A: 'Vendedora', B: 'Cliente' },
    lines: [
      ['A', "Hi, can I help you?", "Hola, ¿le puedo ayudar?"],
      ['B', "Yes, do you have this jacket in a medium?", "Sí, ¿tiene esta chaqueta en talla mediana?"],
      ['A', "Let me check... Yes, here you go.", "Déjeme ver... Sí, aquí tiene."],
      ['B', "Thanks. Can I try it on?", "Gracias. ¿Me la puedo probar?"],
      ['A', "Sure, the fitting rooms are over there.", "Claro, los probadores están por allá."],
      ['B', "It fits well. How much is it?", "Me queda bien. ¿Cuánto cuesta?"],
      ['A', "It's forty dollars, but it's on sale today. Thirty dollars.", "Cuesta cuarenta dólares, pero hoy está en oferta. Treinta dólares."],
      ['B', "That's a good deal. I'll take it.", "Está a buen precio. Me la llevo."],
    ],
    questions: [
      { q: '¿Qué quería comprar?', options: ['Una chaqueta', 'Un pantalón', 'Unos zapatos'] },
      { q: '¿En qué talla?', options: ['Mediana', 'Pequeña', 'Grande'] },
      { q: '¿Cuánto paga al final?', options: ['30 dólares', '40 dólares', '14 dólares'] },
    ],
  },
  {
    id: 'd6', topic: 't10', emoji: '😩', title: 'Un mal día',
    scene: 'Un amigo nota que el otro está estresado.',
    speakers: { A: 'Mia', B: 'Chris' },
    lines: [
      ['A', "Hey, are you okay? You look stressed.", "Oye, ¿estás bien? Te ves estresado."],
      ['B', "Not really. I lost my wallet this morning.", "No mucho. Perdí mi billetera esta mañana."],
      ['A', "Oh no! Where did you lose it?", "¡Ay no! ¿Dónde la perdiste?"],
      ['B', "I think on the bus. And my phone is dead, so I can't call anyone.", "Creo que en el bus. Y mi celular no tiene batería, así que no puedo llamar a nadie."],
      ['A', "Don't worry, you can use my phone.", "No te preocupes, puedes usar mi celular."],
      ['B', "Really? Thanks, that's very kind of you.", "¿En serio? Gracias, qué amable."],
      ['A', "No problem. Let's call the bus company.", "No hay problema. Llamemos a la empresa de buses."],
    ],
    questions: [
      { q: '¿Qué perdió Chris?', options: ['Su billetera', 'Su celular', 'Sus llaves'] },
      { q: '¿Por qué no puede llamar a nadie?', options: ['Su celular no tiene batería', 'No tiene saldo', 'No sabe el número'] },
      { q: '¿Qué le ofrece Mia?', options: ['Usar su celular', 'Prestarle dinero', 'Llevarlo a casa'] },
    ],
  },
  {
    id: 'd7', topic: 't2', emoji: '🏖️', title: 'Hablando del fin de semana',
    scene: 'Dos compañeros se cuentan qué hicieron.',
    speakers: { A: 'Alex', B: 'Sara' },
    lines: [
      ['A', "Hey! How was your weekend?", "¡Hola! ¿Qué tal tu fin de semana?"],
      ['B', "It was great! I went to the beach with my family.", "¡Estuvo genial! Fui a la playa con mi familia."],
      ['A', "Nice! Was the weather good?", "¡Qué bien! ¿Hizo buen clima?"],
      ['B', "Yes, it was really hot. What about you?", "Sí, hizo mucho calor. ¿Y tú?"],
      ['A', "I just stayed home and watched a series. I was so tired.", "Solo me quedé en casa viendo una serie. Estaba muy cansado."],
      ['B', "Sounds relaxing. Which series?", "Suena relajante. ¿Qué serie?"],
      ['A', "A new one about space. You should watch it!", "Una nueva sobre el espacio. ¡Deberías verla!"],
    ],
    questions: [
      { q: '¿Qué hizo Sara el fin de semana?', options: ['Fue a la playa con su familia', 'Se quedó en casa', 'Trabajó todo el fin de semana'] },
      { q: '¿Cómo estuvo el clima?', options: ['Hizo mucho calor', 'Llovió', 'Hizo frío'] },
      { q: '¿De qué trata la serie que vio Alex?', options: ['Del espacio', 'De médicos', 'De comida'] },
    ],
  },
  {
    id: 'd8', topic: 't9', emoji: '👔', title: 'Entrevista de trabajo',
    scene: 'Una entrevista para unas prácticas.',
    speakers: { A: 'Entrevistadora', B: 'Candidato' },
    lines: [
      ['A', "Thanks for coming. Tell me a little about yourself.", "Gracias por venir. Cuéntame un poco sobre ti."],
      ['B', "Sure. I'm an engineering student, and I'm in my last year.", "Claro. Soy estudiante de ingeniería y estoy en mi último año."],
      ['A', "Great. Do you have any work experience?", "Muy bien. ¿Tienes experiencia laboral?"],
      ['B', "Yes, I worked part-time at a tech company for one year.", "Sí, trabajé medio tiempo en una empresa de tecnología por un año."],
      ['A', "What are your strengths?", "¿Cuáles son tus fortalezas?"],
      ['B', "I'm good at solving problems, and I learn fast.", "Soy bueno resolviendo problemas y aprendo rápido."],
      ['A', "Excellent. When can you start?", "Excelente. ¿Cuándo puedes empezar?"],
      ['B', "I can start next month.", "Puedo empezar el próximo mes."],
    ],
    questions: [
      { q: '¿En qué año de la carrera está?', options: ['En el último año', 'En el primer año', 'Ya se graduó'] },
      { q: '¿Qué experiencia tiene?', options: ['Un año, medio tiempo', 'Tres años, tiempo completo', 'Ninguna'] },
      { q: '¿Cuándo puede empezar?', options: ['El próximo mes', 'Mañana', 'En un año'] },
    ],
  },
];

/* ---- Índice (no tocar) ---- */
const DIALOGUE_BY_ID = {};
DIALOGUES.forEach((d) => { DIALOGUE_BY_ID[d.id] = d; });
