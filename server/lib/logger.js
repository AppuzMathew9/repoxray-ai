import winston from 'winston';
import clsHooked from 'cls-hooked';

const session = clsHooked.getNamespace('repoxray-session') || clsHooked.createNamespace('repoxray-session');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const rid = session.active ? session.get('requestId') : null;
      const reqIdStr = rid ? ` [ReqID: ${rid}]` : '';
      return `${timestamp} [${level.toUpperCase()}]${reqIdStr}: ${message}${Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

export { logger, session };
