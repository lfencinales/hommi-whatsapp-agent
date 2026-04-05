/** Outbound copy for the conversational slice (rules-first). */

export const MSG_REQUEST_PROPERTY_SUMMARY =
  "Perfecto. Compárteme una descripción breve de la propiedad: zona, habitaciones, baños, área, precio y algo clave.";

export const MSG_DECLINE_ACK =
  "Entendido, gracias. Te seguiré compartiendo oportunidades relevantes.";

export const MSG_YES_NO_CLARIFICATION = `No te entendí del todo. Respóndeme por favor:
- sí, si tienes una propiedad que aplique
- no, si no la tienes`;

/** Legacy ack before match pipeline — kept for reference; success path uses MSG_MATCH_PIPELINE_SUCCESS. */
export const MSG_SUMMARY_RECEIVED_ACK =
  "Perfecto, ya registré la información. Te contactaré si el agente quiere avanzar.";

export const MSG_MATCH_PIPELINE_SUCCESS =
  "Perfecto, ya registré la información y se la compartí al agente interesado.";

export const MSG_MATCH_PIPELINE_NOTIFY_FAILED =
  "Perfecto, ya registré la información en Hommi. Hubo un inconveniente avisando al agente buscador; nuestro equipo lo revisará.";

export const MSG_SUMMARY_NEED_MORE_DETAIL =
  "Necesito un poco más de detalle para compartirla. Envíame por favor zona, habitaciones, baños, precio y algo clave.";

export const MSG_MATCH_PIPELINE_DATA_MISSING =
  "Gracias por el mensaje. Ahora mismo no pude completar el registro por un dato faltante en el sistema. Intenta de nuevo en unos minutos o contacta soporte Hommi.";

export const MSG_MATCH_SEEKER_CLARIFICATION = `Para registrar tu respuesta sobre el match que te enviamos, responde por favor:
- sí, si te interesa avanzar con ese contacto
- no, si no te interesa`;

export const MSG_MATCH_SEEKER_CONFIRMED_INTEREST =
  "Listo: registramos que te interesa. ¡Éxito hablando con el otro agente!";

export const MSG_MATCH_SEEKER_DECLINED_MATCH =
  "Entendido, cerramos este match en Hommi. Cuando quieras seguimos buscando opciones.";
