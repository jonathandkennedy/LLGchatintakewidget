export type Lang = "en" | "es";

type Translations = {
  // UI chrome
  startIntake: string;
  continue_: string;
  connectMeNow: string;
  preferCallback: string;
  restart: string;
  restartDemo: string;
  poweredBy: string;
  privacyPolicy: string;
  privacy: string;
  terms: string;
  espanol: string;
  english: string;
  typeHere: string;
  firstName: string;
  lastName: string;
  selectState: string;
  connecting: string;
  loading: string;
  widgetUnavailable: string;
  privacyNotice: string;
  timeAgo: string;
  simulateConnected: string;
  simulateFallback: string;
  connectingVideoMsg: string;
  playVideo: string;

  // Flow step titles
  flow: {
    welcome_title: string;
    welcome_desc: string;
    matter_type: string;
    incident_summary: string;
    incident_summary_placeholder: string;
    injury_status: string;
    injury_areas: string;
    medical_treatment: string;
    incident_state: string;
    incident_city: string;
    incident_date: string;
    full_name: string;
    phone: string;
    email: string;
    additional_notes: string;
    transfer_ready_title: string;
    transfer_ready_desc: string;
    connecting_title: string;
    connecting_desc: string;
    connected_title: string;
    connected_desc: string;
    fallback_title: string;
    fallback_desc: string;
    callback_title: string;
    callback_desc: string;
  };

  // Options
  options: {
    car_accident: string;
    truck_accident: string;
    motorcycle_accident: string;
    slip_fall: string;
    wrongful_death: string;
    other_injury: string;
    yes_injured: string;
    someone_else_injured: string;
    no_injuries: string;
    not_sure: string;
    back_neck: string;
    head: string;
    shoulder_arm: string;
    hip_leg: string;
    cuts_bruising: string;
    emotional_distress: string;
    other: string;
    yes: string;
    no: string;
    scheduled: string;
    not_yet: string;
    today: string;
    last_7_days: string;
    last_30_days: string;
    last_12_months: string;
    over_1_year: string;
    unknown: string;
  };
};

export const translations: Record<Lang, Translations> = {
  en: {
    startIntake: "Start intake",
    continue_: "Continue",
    connectMeNow: "Connect me now",
    preferCallback: "Prefer a callback",
    restart: "Restart",
    restartDemo: "Restart demo",
    poweredBy: "Powered by",
    privacyPolicy: "Privacy Policy",
    privacy: "Privacy",
    terms: "Terms",
    espanol: "Español",
    english: "English",
    typeHere: "Type here...",
    firstName: "First Name",
    lastName: "Last Name",
    selectState: "Select a state",
    connecting: "Connecting...",
    loading: "Loading...",
    widgetUnavailable: "Widget unavailable.",
    privacyNotice: "This transcript will be recorded. We respect your privacy.",
    timeAgo: "a few seconds ago",
    simulateConnected: "Simulate connected",
    simulateFallback: "Simulate fallback",
    connectingVideoMsg: "An intake specialist is connecting with you now.",
    playVideo: "Play video",

    flow: {
      welcome_title: "Injured in an accident?",
      welcome_desc: "Answer a few quick questions so we can connect you with our team as fast as possible.",
      matter_type: "What kind of matter can we help with?",
      incident_summary: "Could you briefly explain what happened?",
      incident_summary_placeholder: "Example: I was rear-ended at a stop light and my neck has been hurting since.",
      injury_status: "Did you suffer any injuries or are you experiencing pain from the accident?",
      injury_areas: "What injuries or pain are you experiencing?",
      medical_treatment: "Did you receive medical treatment for your injuries?",
      incident_state: "In what state did the accident happen?",
      incident_city: "And what city did it happen in?",
      incident_date: "When did the accident occur?",
      full_name: "What's your full name?",
      phone: "In case we get disconnected, what's the best phone number to reach you?",
      email: "What's your email address?",
      additional_notes: "Is there anything else you'd like us to know?",
      transfer_ready_title: "Thanks — based on what you shared, the best next step is to speak with our team now.",
      transfer_ready_desc: "Tap below and we'll connect your call. If we can't reach the office right away, we'll save your information and follow up.",
      connecting_title: "Connecting your call…",
      connecting_desc: "Please keep this window open while we connect you.",
      connected_title: "You're being connected now.",
      connected_desc: "If the call drops, we have your information and our team can follow up.",
      fallback_title: "We couldn't connect the call right away.",
      fallback_desc: "We've saved your information. A member of our team will reach out as soon as possible.",
      callback_title: "You're all set.",
      callback_desc: "Your information has been sent to our team. We'll follow up as soon as possible.",
    },

    options: {
      car_accident: "Car accident",
      truck_accident: "Truck accident",
      motorcycle_accident: "Motorcycle accident",
      slip_fall: "Slip and fall",
      wrongful_death: "Wrongful death",
      other_injury: "Other injury",
      yes_injured: "Yes, I'm injured",
      someone_else_injured: "Someone else was injured",
      no_injuries: "No injuries",
      not_sure: "Not sure yet",
      back_neck: "Back / neck",
      head: "Head",
      shoulder_arm: "Shoulder / arm",
      hip_leg: "Hip / leg",
      cuts_bruising: "Cuts / bruising",
      emotional_distress: "Emotional distress",
      other: "Other",
      yes: "Yes",
      no: "No",
      scheduled: "Appointment scheduled",
      not_yet: "Not yet",
      today: "Today",
      last_7_days: "Within the last week",
      last_30_days: "Within the last month",
      last_12_months: "Within the last year",
      over_1_year: "More than a year ago",
      unknown: "I'm not sure",
    },
  },

  es: {
    startIntake: "Iniciar consulta",
    continue_: "Continuar",
    connectMeNow: "Conéctame ahora",
    preferCallback: "Prefiero que me llamen",
    restart: "Reiniciar",
    restartDemo: "Reiniciar demo",
    poweredBy: "Desarrollado por",
    privacyPolicy: "Política de Privacidad",
    privacy: "Privacidad",
    terms: "Términos",
    espanol: "Español",
    english: "English",
    typeHere: "Escriba aquí...",
    firstName: "Nombre",
    lastName: "Apellido",
    selectState: "Seleccione un estado",
    connecting: "Conectando...",
    loading: "Cargando...",
    widgetUnavailable: "Widget no disponible.",
    privacyNotice: "Esta conversación será grabada. Respetamos su privacidad.",
    timeAgo: "hace unos segundos",
    simulateConnected: "Simular conectado",
    simulateFallback: "Simular reserva",
    connectingVideoMsg: "Un especialista de admisión se está conectando con usted ahora.",
    playVideo: "Reproducir video",

    flow: {
      welcome_title: "¿Sufrió un accidente?",
      welcome_desc: "Responda algunas preguntas rápidas para conectarlo con nuestro equipo lo más pronto posible.",
      matter_type: "¿En qué tipo de caso podemos ayudarle?",
      incident_summary: "¿Podría explicar brevemente lo que pasó?",
      incident_summary_placeholder: "Ejemplo: Me chocaron por detrás en un semáforo y me ha dolido el cuello desde entonces.",
      injury_status: "¿Sufrió alguna lesión o siente dolor por el accidente?",
      injury_areas: "¿Qué lesiones o dolores está experimentando?",
      medical_treatment: "¿Recibió tratamiento médico por sus lesiones?",
      incident_state: "¿En qué estado ocurrió el accidente?",
      incident_city: "¿Y en qué ciudad ocurrió?",
      incident_date: "¿Cuándo ocurrió el accidente?",
      full_name: "¿Cuál es su nombre completo?",
      phone: "En caso de que se corte la llamada, ¿cuál es el mejor número para contactarlo?",
      email: "¿Cuál es su dirección de correo electrónico?",
      additional_notes: "¿Hay algo más que le gustaría que supiéramos?",
      transfer_ready_title: "Gracias — según lo que compartió, el mejor paso siguiente es hablar con nuestro equipo ahora.",
      transfer_ready_desc: "Toque abajo y conectaremos su llamada. Si no podemos comunicarnos con la oficina de inmediato, guardaremos su información y haremos seguimiento.",
      connecting_title: "Conectando su llamada…",
      connecting_desc: "Por favor mantenga esta ventana abierta mientras lo conectamos.",
      connected_title: "Lo estamos conectando ahora.",
      connected_desc: "Si la llamada se corta, tenemos su información y nuestro equipo puede hacer seguimiento.",
      fallback_title: "No pudimos conectar la llamada de inmediato.",
      fallback_desc: "Hemos guardado su información. Un miembro de nuestro equipo se comunicará con usted lo antes posible.",
      callback_title: "¡Listo!",
      callback_desc: "Su información ha sido enviada a nuestro equipo. Nos comunicaremos con usted lo antes posible.",
    },

    options: {
      car_accident: "Accidente de auto",
      truck_accident: "Accidente de camión",
      motorcycle_accident: "Accidente de motocicleta",
      slip_fall: "Caída / resbalón",
      wrongful_death: "Muerte injusta",
      other_injury: "Otra lesión",
      yes_injured: "Sí, estoy lesionado/a",
      someone_else_injured: "Otra persona resultó lesionada",
      no_injuries: "Sin lesiones",
      not_sure: "No estoy seguro/a",
      back_neck: "Espalda / cuello",
      head: "Cabeza",
      shoulder_arm: "Hombro / brazo",
      hip_leg: "Cadera / pierna",
      cuts_bruising: "Cortes / moretones",
      emotional_distress: "Angustia emocional",
      other: "Otro",
      yes: "Sí",
      no: "No",
      scheduled: "Cita programada",
      not_yet: "Todavía no",
      today: "Hoy",
      last_7_days: "En la última semana",
      last_30_days: "En el último mes",
      last_12_months: "En el último año",
      over_1_year: "Hace más de un año",
      unknown: "No estoy seguro/a",
    },
  },
};

/** Get the translated title for a step key */
export function getStepTitle(lang: Lang, stepKey: string): string | null {
  const t = translations[lang];
  const map: Record<string, string> = {
    welcome: t.flow.welcome_title,
    matter_type: t.flow.matter_type,
    incident_summary: t.flow.incident_summary,
    injury_status: t.flow.injury_status,
    injury_areas: t.flow.injury_areas,
    medical_treatment_status: t.flow.medical_treatment,
    incident_state: t.flow.incident_state,
    incident_city: t.flow.incident_city,
    incident_date_range: t.flow.incident_date,
    full_name: t.flow.full_name,
    phone: t.flow.phone,
    email: t.flow.email,
    additional_notes: t.flow.additional_notes,
    transfer_ready: t.flow.transfer_ready_title,
    connecting: t.flow.connecting_title,
    connected: t.flow.connected_title,
    transfer_fallback: t.flow.fallback_title,
    callback_requested_confirmation: t.flow.callback_title,
  };
  return map[stepKey] ?? null;
}

/** Get the translated description for a step key */
export function getStepDescription(lang: Lang, stepKey: string): string | null {
  const t = translations[lang];
  const map: Record<string, string> = {
    welcome: t.flow.welcome_desc,
    transfer_ready: t.flow.transfer_ready_desc,
    connecting: t.flow.connecting_desc,
    connected: t.flow.connected_desc,
    transfer_fallback: t.flow.fallback_desc,
    callback_requested_confirmation: t.flow.callback_desc,
  };
  return map[stepKey] ?? null;
}

/** Get translated option label */
export function getOptionLabel(lang: Lang, optionKey: string): string | null {
  const t = translations[lang];
  return (t.options as Record<string, string>)[optionKey] ?? null;
}

/** Get translated placeholder for a step */
export function getPlaceholder(lang: Lang, stepKey: string): string | null {
  const t = translations[lang];
  if (stepKey === "incident_summary") return t.flow.incident_summary_placeholder;
  return null;
}
