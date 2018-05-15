import * as querystring from 'querystring';
import {processWechatResponse} from './util';

export class AuthAccessToken {
  readonly accessToken: string;
  readonly expireTime: number;
  readonly refreshToken: string;
  readonly openid: string;
  readonly scope: string;
  constructor(token: {accessToken: string, expireTime: number, refreshToken: string, openid: string, scope: string}) {
    this.accessToken = token.accessToken;
    this.expireTime = token.expireTime;
    this.refreshToken = token.refreshToken;
    this.openid = token.openid;
    this.scope = token.scope;
  }
  isValid(): boolean {
    return !!this.accessToken && Date.now() < this.expireTime;
  }
  toJSON(): object {
    return {
      accessToken: this.accessToken,
      expireTime: this.expireTime,
      refreshToken: this.refreshToken,
      openid: this.openid,
      scope: this.scope
    };
  }
}

export interface AuthUserInfo {
  openid: string;
  scope: string;
  nickname?: string;
  sex?: '1' | '2';
  province?: string;
  city?: string;
  country?: string;
  headimgurl?: string;
  privilege?: string[];
  unionid?: string;
}

export default {
  loadAuthAccessToken(openid: string): Promise<AuthAccessToken> {
    return Promise.resolve(this.store.authAccessToken[openid]);
  },
  saveAuthAccessToken(openid: string, token: AuthAccessToken): Promise<void> {
    this.store.authAccessToken[openid] = token;
    return Promise.resolve();
  },
  registerAuthAccessTokenHandler(handler: {loadAuthAccessToken?: (openid: string) => Promise<AuthAccessToken>, saveAuthAccessToken?: (openid: string, token: AuthAccessToken) => Promise<void>} = {}): void {
    if (handler.loadAuthAccessToken) {
      this.loadAuthAccessToken = handler.loadAuthAccessToken;
    }
    if (handler.saveAuthAccessToken) {
      this.saveAuthAccessToken = handler.saveAuthAccessToken;
    }
  },
  getAuthorizeURL(redirect: string, state: string = '', scope: 'snsapi_base' | 'snsapi_userinfo' = 'snsapi_base'): string {
    const url = 'https://open.weixin.qq.com/connect/oauth2/authorize';
    const info = {
      appid: this.appid,
      redirect_uri: redirect,
      response_type: 'code',
      scope,
      state
    };

    return `${url}?${querystring.stringify(info)}#wechat_redirect`;
  },
  getAuthAccessToken(code: string): Promise<AuthAccessToken> {
    const url = `${this.endpoint}/sns/oauth2/access_token?appid=${this.appid}&secret=${this.appsecret}&code=${code}&grant_type=authorization_code`;
    return this.request(url, {dataType: 'json'}).then((response) => {
      const data = processWechatResponse(response.data);
      const expireTime = Date.now() + (data.expires_in - 10) * 1000;
      const token = new AuthAccessToken({accessToken: data.access_token, expireTime, refreshToken: data.refresh_token, openid: data.openid, scope: data.scope});
      return this.saveAuthAccessToken(data.openid, token).then(() => {
        return token;
      });
    })
  },
  refreshAuthAccessToken(refreshToken: string): Promise<AuthAccessToken> {
    const url = `${this.endpoint}/sns/oauth2/refresh_token?appid=${this.appid}&grant_type=refresh_token&refresh_token=${refreshToken}`;
    return this.request(url, {dataType: 'json'}).then((response) => {
      const data = processWechatResponse(response.data);
      const expireTime = Date.now() + (data.expires_in - 10) * 1000;
      const token = new AuthAccessToken({accessToken: data.access_token, expireTime, refreshToken: data.refresh_token, openid: data.openid, scope: data.scope});
      return this.saveAuthAccessToken(data.openid, token).then(() => {
        return token;
      });
    });
  },
  _getAuthUser(openid: string, token: AuthAccessToken, lang: 'zh_CN' | 'zh_TW' | 'en'): Promise<AuthUserInfo> {
    const url = `${this.endpoint}/sns/userinfo?access_token=${token.accessToken}&openid=${openid}&lang=${lang}`;
    return this.request(url, {dataType: 'json'}).then((response) => {
      return Object.assign({scope: token.scope}, processWechatResponse(response.data));
    });
  },
  getAuthUser(openid: string, lang: 'zh_CN' | 'zh_TW' | 'en' = 'zh_CN'): Promise<AuthUserInfo> {
    return this.loadAuthAccessToken(openid).then((token) => {
      if (!token) {
        const error = new Error(`No token for ${openid}, please authorize first.`);
        error.name = 'NoOAuthTokenError';
        throw error;
      }
      if (!/snsapi_userinfo/.test(token.scope)) {
        return {
          openid,
          scope: token.scope
        };
      } else if (token.isValid()) {
        return this._getAuthUser(openid, token, lang);
      } else {
        return this.refreshAuthAccessToken(token.refreshToken).then((token) => {
          return this._getAuthUser(openid, token, lang);
        });
      }
    });
  },
  getAuthUserByCode(code: string, lang: 'zh_CN' | 'zh_TW' | 'en' = 'zh_CN'): Promise<AuthUserInfo> {
    return this.getAuthAccessToken(code).then((token) => {
      return this.getAuthUser(token.openid, lang);
    });
  },
  verifyToken(openid: string, accessToken: string): Promise<void> {
    const url = `${this.endpoint}/sns/auth?access_token=${accessToken}&openid=${openid}`;
    return this.request(url, {dataType: 'json'}).then((response) => {
      processWechatResponse(response.data);
    });
  }
};
