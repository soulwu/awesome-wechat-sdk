import {processWechatResponse} from './util';

export interface Template {
  template_id: string;
  title: string;
  primary_industry: string;
  deputy_industry: string;
  content: string;
  example: string;
};

export interface Industry {
  first_class: string;
  second_class: string;
};

export default {
  async setIndustry(industry1: string, industry2: string): Promise<void> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/template/api_set_industry?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        industry_id1: industry1,
        industry_id2: industry2
      },
      dataType: 'json'
    });
    processWechatResponse(response.data);
  },
  async getIndustry(): Promise<{primary_industry: Industry, secondary_industry: Industry}> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/template/get_industry?access_token=${token.accessToken}`;
    const response = await this.request(url, {dataType: 'json'});
    return processWechatResponse(response.data);
  },
  async addTemplate(shortId: string): Promise<string> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/template/api_add_template?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        template_id_short: shortId
      },
      dataType: 'json'
    });
    const data = processWechatResponse(response.data);
    return data.template_id;
  },
  async getAllPrivateTemplate(): Promise<Template[]> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/template/get_all_private_template?access_token=${token.accessToken}`;
    const response = await this.request(url, {dataType: 'json'});
    const data = processWechatResponse(response.data);
    return data.template_list;
  },
  async delPrivateTemplate(templateId: string): Promise<void> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/template/del_private_template?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        template_id: templateId
      },
      dataType: 'json'
    });
    processWechatResponse(response.data);
  },
  async sendTemplateMessage(openid: string, templateId: string, data: object = {}, link: {url?: string, miniprogram?: {appid: string, pagepath: string}} = {}): Promise<string> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/message/template/send?access_token=${token.accessToken}`;
    const response = await this.request(url, {
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
    const responseData = processWechatResponse(response.data);
    return responseData.msgid;
  }
};
