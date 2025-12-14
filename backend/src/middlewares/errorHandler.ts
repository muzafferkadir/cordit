import { errorLogger, logger } from '../utils/logger';
import { CustomRequest, CustomResponse } from '../types/express';

interface MongoError {
  code?: number;
  message?: string;
}

const errorHandler = (
  _req: CustomRequest,
  res: CustomResponse,
  statusCode: number = 500,
  data: unknown = {},
): void => {
  try {
    let responseData: unknown = data;

    if (typeof responseData !== 'object' || responseData === null) {
      responseData = { message: responseData };
    }

    const mongoError = responseData as MongoError;
    if (mongoError?.code === 11000 || mongoError?.code === 11001 || mongoError?.code === 12582) {
      statusCode = 409;
      responseData = { message: 'This record is already exist.' };
    }

    if (responseData instanceof Error) {
      responseData = { message: responseData.message || 'Something went wrong.' };
    }

    if (JSON.stringify(responseData) === '{}') {
      res.sendStatus(500);
      errorLogger.error(responseData);
      logger.error(responseData);
      return;
    }

    res.status(statusCode);
    res.json(responseData);
    res.end();

    errorLogger.error(responseData);
    logger.error(responseData);
  } catch (error) {
    logger.error(error);
  }
};

export default errorHandler;
