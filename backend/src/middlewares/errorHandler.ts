import { errorLogger, logger } from '../utils/logger';
import { CustomRequest, CustomResponse } from '../types/express';

const errorHandler = (
  _req: CustomRequest,
  res: CustomResponse,
  statusCode: number = 500,
  data: any = {},
): void => {
  try {
    let responseData = data;

    if (typeof responseData !== 'object') {
      responseData = { message: responseData };
    }

    if (responseData?.code === 11000 || responseData?.code === 11001 || responseData?.code === 12582) {
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
