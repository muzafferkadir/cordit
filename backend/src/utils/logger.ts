import pino from 'pino';

const errorDest = pino.destination('./error.log');
export const errorLogger = pino({}, errorDest);

const fileDest = pino.destination('./logs');
export const fileLogger = pino({}, fileDest);

export const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      singleLine: true,
    },
  },
});
