export const ApiMessages = {
  success: 'Operación realizada correctamente',
  validationFailed: 'Los datos enviados no son válidos',
  internalError: 'Ocurrió un error inesperado',
  contact: {
    created: 'Gracias por contactarnos. Recibimos tu mensaje correctamente.',
    botRejected: 'No fue posible validar la solicitud. Inténtalo nuevamente.',
    verificationUnavailable:
      'No fue posible validar la solicitud en este momento. Inténtalo más tarde.',
  },
  analytics: {
    sessionReady: 'Sesión de analítica preparada correctamente.',
    interactionRecorded: 'Interacción registrada correctamente.',
    invalidSession: 'La sesión de analítica no es válida o ha expirado.',
  },
} as const;
