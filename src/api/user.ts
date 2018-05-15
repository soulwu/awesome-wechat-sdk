import {processWechatResponse} from './util';

export interface UserInfo {
  subscribe: 0 | 1;
  openid: string;
  nickname?: string;
  sex?: 0 | 1 | 2;
  language?: string;
  city?: string;
  province?: string;
  country?: string;
  headimgurl?: string;
  subscribe_time?: number;
  unionid?: string;
  remark?: string;
  groupid?: number;
  tagid_list?: number[];
  subscribe_scene?: string;
  qr_scene?: number;
  qr_scene_str?: string;
}

export default {
  getUser(openid: string): Promise<UserInfo> {
    return this.getLatestAccessToken().then((token) => {
      const url = `${this.endpoint}/cgi-bin/user/info?access_token=${token.accessToken}&openid=${openid}&lang=zh_CN`;
      return this.request(url, {dataType: 'json'});
    }).then((response) => {
      return processWechatResponse(response.data);
    });
  },
  batchGetUser(openids: string[]): Promise<UserInfo[]> {
    return this.getLatestAccessToken().then((token) => {
      const url = `${this.endpoint}/cgi-bin/user/info/batchget?access_token=${token.accessToken}`;
      return this.request(url, {
        dataType: 'json',
        contentType: 'json',
        method: 'POST',
        data: {
          user_list: openids.map(openid => ({openid, lang: 'zh_CN'}))
        }
      });
    }).then((response) => {
      const data = processWechatResponse(response.data);
      return data.user_info_list;
    });
  }
};
