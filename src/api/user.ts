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
  async getUser(openid: string): Promise<UserInfo> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/user/info?access_token=${token.accessToken}&openid=${openid}&lang=zh_CN`;
    const response = await this.request(url, {dataType: 'json'});
    return processWechatResponse(response.data);
  },
  async batchGetUser(openids: string[]): Promise<UserInfo[]> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/user/info/batchget?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        user_list: openids.map(openid => ({openid, lang: 'zh_CN'}))
      },
      dataType: 'json'
    });
    const data = processWechatResponse(response.data);
    return data.user_info_list;
  },
  async getFollowers(nextOpenid?: string): Promise<{total: number, count: number, data: {openid: string[]}, next_openid?: string}> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/user/get?access_token=${token.accessToken}${nextOpenid ? `&next_openid=${nextOpenid}` : ''}`;
    const response = await this.request(url, {dataType: 'json'});
    return processWechatResponse(response.data);
  },
  async updateRemark(openid: string, remark: string): Promise<void> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/user/info/updateremark?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        openid,
        remark
      },
      dataType: 'json'
    });
    processWechatResponse(response.data);
  }
};
