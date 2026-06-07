const logger = {
  info: (msg, data) => {
    const time = new Date().toISOString();
    console.log(`[INFO] [${time}] ${msg}`, data !== undefined ? data : '');
  },
  warn: (msg, data) => {
    const time = new Date().toISOString();
    console.warn(`[WARN] [${time}] ${msg}`, data !== undefined ? data : '');
  },
  error: (msg, error) => {
    const time = new Date().toISOString();
    console.error(`[ERROR] [${time}] ${msg}`);
    if (error) console.error(error);
  },
};
module.exports = { logger };
