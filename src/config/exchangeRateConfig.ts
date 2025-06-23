export const EXCHANGE_RATE_CONFIG = {
  // API principal que funciona
  MAIN_API: {
    url: "https://ve.dolarapi.com/v1/dolares",
    name: "PyDolarVe API",
    bcvPath: "[0].promedio",
    parallelPath: "[1].promedio",
  },

  // URLs de APIs de respaldo (por si la principal falla)
  BACKUP_APIS: [
    {
      url: "https://api.bcv.org.ve/api/v1/exchange-rates",
      name: "BCV Official API",
      bcvPath: "USD.rate",
      parallelPath: null, // Esta API solo tiene BCV
    },
  ],

  // Configuración de cache
  CACHE_DURATION: 30 * 60 * 1000, // 30 minutos

  // Tasas de fallback (se actualizarán desde la base de datos)
  FALLBACK_RATES: {
    bcv: 95.08,
    parallel: 133.15,
  },

  // Configuración de timeouts
  REQUEST_TIMEOUT: 10000, // 10 segundos

  // Headers por defecto
  DEFAULT_HEADERS: {
    Accept: "application/json",
    "User-Agent": "LedgerFlowNavigator/1.0",
  },
};
