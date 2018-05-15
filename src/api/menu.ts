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
  createMenu(button: Button[]): Promise<object> {
    return this.getLatestAccessToken().then((token) => {
      const url = `${this.endpoint}/cgi-bin/menu/create?access_token=${token.accessToken}`;
      return this.request(url, {
        method: 'POST',
        contentType: 'json',
        data: {
          button
        },
        dataType: 'json'
      });
    }).then((response) => {
      return processWechatResponse(response.data);
    });
  },
  getMenu(): Promise<object> {
    return this.getLatestAccessToken().then((token) => {
      const url = `${this.endpoint}/cgi-bin/menu/get?access_token=${token.accessToken}`;
      return this.request(url, {dataType: 'json'});
    }).then((response) => {
      return processWechatResponse(response.data);
    });
  },
  removeMenu(): Promise<object> {
    return this.getLatestAccessToken().then((token) => {
      const url = `${this.endpoint}/cgi-bin/menu/delete?access_token=${token.accessToken}`;
      return this.request(url, {dataType: 'json'});
    }).then((response) => {
      return processWechatResponse(response.data);
    });
  },
  getMenuConfig(): Promise<object> {
    return this.getLatestAccessToken().then((token) => {
      const url = `${this.endpoint}/cgi-bin/get_current_selfmenu_info?access_token=${token.accessToken}`;
      return this.request(url, {dataType: 'json'});
    }).then((response) => {
      return processWechatResponse(response.data);
    });
  }
};
