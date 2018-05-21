const debug = require('debug')('awesome-wechat-sdk:api:util');

export class WechatAPIError extends Error {
  code: number;
}

export function processWechatResponse(data: any): any {
  debug('process response %j', data);
  if (data.errcode) {
    const err = new WechatAPIError(data.errmsg);
    err.name = 'WechatAPIError';
    err.code = data.errcode;
    throw err;
  }

  return data;
}
