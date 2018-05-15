import {processWechatResponse} from './util';

export default {
  sendTemplateMessage(openid: string, templateId: string, data: object = {}, link: {url?: string, miniprogram?: {appid: string, pagepath: string}} = {}): Promise<number> {
    return this.getLatestAccessToken().then((token) => {
      const url = `${this.endpoint}/cgi-bin/message/template/send?access_token=${token.accessToken}`;
      return this.request(url, {
        method: 'POST',
        contentType: 'json',
        data: {
          touser: openid,
          template_id: templateId,
          url: link.url,
          miniprogram: link.miniprogram,
          data
        },
        dataType: 'json'
      });
    }).then((response) => {
      const data = processWechatResponse(response.data);
      return data.msgid;
    });
  }
};
