import {processWechatResponse} from './util';

export class AccessToken {
  readonly accessToken: string;
  readonly expireTime: number;
  constructor(token: {accessToken: string, expireTime: number}) {
    this.accessToken = token.accessToken;
    this.expireTime = token.expireTime;
  }
  isValid(): boolean {
    return !!this.accessToken && Date.now() < this.expireTime;
  }
  toJSON(): object {
    return {
      accessToken: this.accessToken,
      expireTime: this.expireTime
    };
  }
}

export default {
  loadAccessToken(): Promise<AccessToken> {
    return Promise.resolve(this.store.accessToken);
  },
  saveAccessToken(token: AccessToken): Promise<void> {
    this.store.accessToken = token;
    return Promise.resolve();
  },
  registerAccessTokenHandler(handler: {loadAccessToken?: () => Promise<AccessToken>, saveAccessToken?: (token: AccessToken) => Promise<void>} = {}): void {
    if (handler.loadAccessToken) {
      this.loadAccessToken = handler.loadAccessToken;
    }
    if (handler.saveAccessToken) {
      this.saveAccessToken = handler.saveAccessToken;
    }
  },
  getAccessToken(): Promise<AccessToken> {
    const url = `${this.endpoint}/cgi-bin/token?grant_type=client_credential&appid=${this.appid}&secret=${this.appsecret}`;
    return this.request(url, {dataType: 'json'}).then((response) => {
      const data = processWechatResponse(response.data);
      const expireTime = Date.now() + (data.expires_in - 10) * 1000;
      const token = new AccessToken({accessToken: data.access_token, expireTime});
      return this.saveAccessToken(token).then(() => {
        return token;
      });
    });
  },
  getLatestAccessToken(): Promise<AccessToken> {
    return this.loadAccessToken().then((token) => {
      if (token && token.isValid()) {
        return token;
      } else {
        return this.getAccessToken();
      }
    })
  }
};
