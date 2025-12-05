import { logger } from '../utils/logger';
import { CustomResponse } from '../types/express';

const responseHandler = (
  res: CustomResponse,
  statusCode: number = 200,
  data: any = {},
): void => {
  try {
    let responseData = data;

    if (typeof responseData !== 'object') {
      responseData = { message: responseData };
    }

    if (typeof statusCode !== 'number') {
      statusCode = 500;
    }

    res.status(statusCode);
    res.json(responseData);
    res.end();

    logger.info({
      status: statusCode,
      data: responseData,
    });
  } catch (error) {
    logger.error(error);
    res.status(500);
    res.json({ message: 'Internal Server Error' });
    res.end();
  }
};

export default responseHandler;
