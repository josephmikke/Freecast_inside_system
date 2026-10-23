import middy from '@middy/core';

export default {
  onError: (request: middy.Request<any, any, Error, any>) => {
    const error = <any>request.error;
    if (!error.expose || !error.cause) return;
    return {
      statusCode: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: error.statusCode === 400 ? error.cause : error.message }),
    };
  },
};
