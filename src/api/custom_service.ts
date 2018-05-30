import * as Formstream from 'formstream';

export interface KF {
  kf_account: string;
  kf_nick: string;
  kf_id: string;
  kf_headimgurl: string;
  kf_wx?: string;
  invite_wx?: string;
  invite_expire_time?: number;
  invite_status?: 'waiting' | 'rejected' | 'expired'
};

export default {
  async getAutoReply(): Promise<{
    is_add_friend_reply_open: 0 | 1,
    is_autoreply_open: 0 | 1,
    add_friend_autoreply_info?: {
      type: 'text' | 'img' | 'voice' | 'video',
      content: string
    },
    message_default_autoreply_info?: {
      type: 'text' | 'img' | 'voice' | 'video',
      content: string
    },
    keyword_autoreply_info?: {
      list: Array<{
        rule_name: string,
        create_time: number,
        reply_mode: 'reply_all' | 'random_one',
        keyword_list_info: Array<{
          type: 'text',
          match_mode: 'contain' | 'equal',
          content: string
        }>,
        reply_list_info: Array<{
          type: 'news',
          content?: string,
          news_info: {
            list: Array<{
              title: string,
              author: string,
              digest: string,
              show_cover: 0 | 1,
              cover_url: string,
              content_url: string,
              source_url: string
            }>
          }
        } | {
          type: 'text' | 'img' | 'voice' | 'video',
          content: string
        }>
      }>
    }
  }> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/get_current_autoreply_info?access_token=${token.accessToken}`;
    const response = await this.request(url, {dataType: 'json'});
    return await this._processWechatResponse(response.data);
  },
  async getKFList(): Promise<KF[]> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/customservice/getkflist?access_token=${token.accessToken}`;
    const response = await this.request(url, {dataType: 'json'});
    const data = await this._processWechatResponse(response.data);
    return data.kf_list;
  },
  async addKFAccount(account: string, nickname: string): Promise<void> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/customservice/kfaccount/add?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        kf_account: account,
        nickname
      },
      dataType: 'json'
    });
    await this._processWechatResponse(response.data);
  },
  async inviteWorker(account: string, wx: string): Promise<void> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/customservice/kfaccount/inviteworker?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        kf_account: account,
        invite_wx: wx
      },
      dataType: 'json'
    });
    await this._processWechatResponse(response.data);
  },
  async updateKFAccount(account: string, nickname: string): Promise<void> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/customservice/kfaccount/update?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        kf_account: account,
        nickname
      },
      dataType: 'json'
    });
    await this._processWechatResponse(response.data);
  },
  async setKFAccountAvatar(account: string, avatar: Buffer, filename: string = 'headimg.png'): Promise<void> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/customservice/kfaccount/uploadheadimg?access_token=${token.accessToken}&kf_account=${account}`;
    const form = new Formstream();
    form.buffer('media', avatar, filename);
    const response = await this.request(url, {
      method: 'POST',
      headers: form.headers(),
      stream: form,
      dataType: 'json',
      timeout: 60000
    });
    await this._processWechatResponse(response.data);
  },
  async delKFAccount(account: string): Promise<void> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/customservice/kfaccount/del?access_token=${token.accessToken}&kf_account=${account}`;
    const response = await this.request(url, {dataType: 'json'});
    await this._processWechatResponse(response.data);
  },
  async createKFSession(openid: string, account: string): Promise<void> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/customservice/kfsession/create?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        kf_account: account,
        openid
      },
      dataType: 'json'
    });
    await this._processWechatResponse(response.data);
  },
  async closeKFSession(openid: string, account: string): Promise<void> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/customservice/kfsession/close?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        kf_account: account,
        openid
      },
      dataType: 'json'
    });
    await this._processWechatResponse(response.data);
  },
  async getKFSession(openid: string): Promise<{createtime: number, kf_account: string}> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/customservice/kfsession/getsession?access_token=${token.accessToken}&openid=${openid}`;
    const response = await this.request(url, {dataType: 'json'});
    return await this._processWechatResponse(response.data);
  },
  async getKFSessionList(account: string): Promise<Array<{createtime: number, openid: string}>> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/customservice/kfsession/getsessionlist?access_token=${token.accessToken}&kf_account=${account}`;
    const response = await this.request(url, {dataType: 'json'});
    const data = await this._processWechatResponse(response.data);
    return data.sessionlist;
  },
  async getWaitCaseList(): Promise<{count: number, waitcaselist: Array<{latest_time: number, openid: string}>}> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/customservice/kfsession/getwaitcase?access_token=${token.accessToken}`;
    const response = await this.request(url, {dataType: 'json'});
    return await this._processWechatResponse(response.data);
  },
  async getMsgRecordList(starttime: number, endtime: number, msgid: number = 1, number: number = 10000): Promise<{
    recordlist: Array<{
      openid: string,
      opercode: 2002 | 2003,
      text: string,
      time: number,
      worker: string
    }>,
    number: number,
    msgid: number
  }> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/customservice/msgrecord/getmsglist?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        starttime,
        endtime,
        msgid,
        number
      },
      dataType: 'json'
    });
    return await this._processWechatResponse(response.data);
  }
};
