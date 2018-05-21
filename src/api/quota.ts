import {processWechatResponse} from './util';

export default {
  async clearQuota(): Promise<void> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/clear_quota?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        appid: this.appid
      },
      dataType: 'json'
    });
    processWechatResponse(response.data);
  }
};
