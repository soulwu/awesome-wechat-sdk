import {processWechatResponse} from './util';

export interface IndividualButton {
  type: 'click' | 'view' | 'miniprogram' | 'scancode_push' | 'scancode_waitmsg' | 'pic_sysphoto' | 'pic_photo_or_album' | 'pic_weixin' | 'location_select' | 'media_id' | 'view_limited';
  name: string;
  key?: string;
  url?: string;
  appid?: string;
  pagepath?: string;
  media_id?: string;
}

export interface GroupButton {
  name: string;
  sub_button: IndividualButton[]
}

export type Button = IndividualButton | GroupButton;

export default {
  async createMenu(button: Button[]): Promise<void> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/menu/create?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        button
      },
      dataType: 'json'
    });
    processWechatResponse(response.data);
  },
  async getMenu(): Promise<object> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/menu/get?access_token=${token.accessToken}`;
    const response = await this.request(url, {dataType: 'json'});
    return processWechatResponse(response.data);
  },
  async removeMenu(): Promise<void> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/menu/delete?access_token=${token.accessToken}`;
    const response = await this.request(url, {dataType: 'json'});
    processWechatResponse(response.data);
  },
  async getMenuConfig(): Promise<object> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/get_current_selfmenu_info?access_token=${token.accessToken}`;
    const response = await this.request(url, {dataType: 'json'});
    return processWechatResponse(response.data);
  }
};
