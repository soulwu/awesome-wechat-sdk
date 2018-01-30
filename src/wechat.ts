import * as urllib from 'urllib';
import {UrlLibOptions, UrlLibResponse} from './types/urllib';
import * as querystring from 'querystring';
import * as crypto from 'crypto';

export class WechatError extends Error {
  code: number;
}

function processWechatResponse(data) {
  if (data.errcode) {
    const err = new WechatError(data.errmsg);
    err.name = 'WeChatAPIError';
    err.code = data.errcode;
    throw err;
  }

  return data;
}

export class AccessToken {
  readonly accessToken: string;
  readonly expireTime: number;
  constructor(accessToken: string, expireTime: number) {
    this.accessToken = accessToken;
    this.expireTime = expireTime;
  }

  isValid(): boolean {
    return !!this.accessToken && Date.now() < this.expireTime;
  }
  toJSON(): string {
    return JSON.stringify({
      accessToken: this.accessToken,
      expireTime: this.expireTime
    });
  }
}

export class AuthAccessToken extends AccessToken {
  readonly refreshToken: string;
  readonly openid: string;
  constructor(accessToken: string, expireTime: number, refreshToken: string, openid: string) {
    super(accessToken, expireTime);
    this.refreshToken = refreshToken;
    this.openid = openid;
  }

  toJSON(): string {
    return JSON.stringify({
      accessToken: this.accessToken,
      expireTime: this.expireTime,
      refreshToken: this.refreshToken,
      openid: this.openid
    });
  }
}

export interface UserInfo {
  openid: string;
  nickname: string;
  sex: '1' | '2';
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string[];
  unionid?: string;
}

export class Ticket {
  readonly ticket: string;
  readonly expireTime: number;
  constructor(ticket: string, expireTime: number) {
    this.ticket = ticket;
    this.expireTime = expireTime;
  }

  isValid(): boolean {
    return !!this.ticket && Date.now() < this.expireTime;
  }
  toJSON(): string {
    return JSON.stringify({
      ticket: this.ticket,
      expireTime: this.expireTime
    });
  }
}

export interface JsConfig {
  debug: boolean;
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
  jsApiList: string[];
}

function createNonceStr() {
  return Math.random().toString(36).substr(2, 15);
}

export default class Wechat {
  private readonly appid: string;
  private readonly appsecret: string;

  constructor(appid: string, appsecret: string) {
    this.appid = appid;
    this.appsecret = appsecret;
  }

  private endpoint: string = 'https://api.weixin.qq.com';
  setEndpoint(domain: 'api.weixin.qq.com' | 'sh.api.weixin.qq.com' | 'sz.api.weixin.qq.com' | 'hk.api.weixin.qq.com'): void {
    this.endpoint = `https://${domain}`;
  }

  private store: {
    accessToken: AccessToken,
    authAccessToken: {[openid: string]: AuthAccessToken},
    ticket: {jsapi: Ticket, wx_card: Ticket}
  } = {
    accessToken: null,
    authAccessToken: {},
    ticket: {jsapi: null, wx_card: null}
  };
  private loadAccessToken: () => Promise<AccessToken> = () => Promise.resolve(this.store.accessToken);
  private saveAccessToken: (token: AccessToken) => Promise<void> = (token: AccessToken) => {
    this.store.accessToken = token;
    return Promise.resolve();
  };
  registerAccessTokenHandler(handler: {loadAccessToken?: () => Promise<AccessToken>, saveAccessToken?: (token: AccessToken) => Promise<void>} = {}): void {
    if (handler.loadAccessToken) {
      this.loadAccessToken = handler.loadAccessToken;
    }
    if (handler.saveAccessToken) {
      this.saveAccessToken = handler.saveAccessToken;
    }
  }
  private loadAuthAccessToken: (openid: string) => Promise<AuthAccessToken> = (openid: string) => Promise.resolve(this.store.authAccessToken[openid]);
  private saveAuthAccessToken: (openid: string, token: AuthAccessToken) => Promise<void> = (openid: string, token: AuthAccessToken) => {
    this.store.authAccessToken[openid] = token;
    return Promise.resolve();
  };
  registerAuthAccessTokenHandler(handler: {loadAuthAccessToken?: (openid: string) => Promise<AuthAccessToken>, saveAuthAccessToken?: (openid: string, token: AuthAccessToken) => Promise<void>} = {}): void {
    if (handler.loadAuthAccessToken) {
      this.loadAuthAccessToken = handler.loadAuthAccessToken;
    }
    if (handler.saveAuthAccessToken) {
      this.saveAuthAccessToken = handler.saveAuthAccessToken;
    }
  }
  private loadTicket: (type: 'jsapi' | 'wx_card') => Promise<Ticket> = (type: 'jsapi' | 'wx_card') => Promise.resolve(this.store.ticket[type]);
  private saveTicket: (type: 'jsapi' | 'wx_card', ticket: Ticket) => Promise<void> = (type: 'jsapi' | 'wx_card', ticket: Ticket) => {
    this.store.ticket[type] = ticket;
    return Promise.resolve();
  };
  registerTicketHandler(handler: {loadTicket?: (type: 'jsapi' | 'wx_card') => Promise<Ticket>, saveTicket?: (type: 'jsapi' | 'wx_card', ticket: Ticket) => Promise<void>} = {}): void {
    if (handler.loadTicket) {
      this.loadTicket = handler.loadTicket;
    }
    if (handler.saveTicket) {
      this.saveTicket = handler.saveTicket;
    }
  }

  private defaults: UrlLibOptions = {};

  setOpts(opts: UrlLibOptions) {
    this.defaults = opts;
  }

  private request(url: string, opts: UrlLibOptions = {}): Promise<UrlLibResponse> {
    const options = Object.assign({}, this.defaults);
    Object.keys(opts).forEach((k) => {
      if (k !== 'headers') {
        options[k] = opts[k];
      } else {
        if (opts.headers) {
          options.headers = Object.assign({}, options.headers, opts.headers);
        }
      }
    });

    return urllib.request(url, options);
  }

  private getAccessToken(): Promise<AccessToken> {
    const url = `${this.endpoint}/cgi-bin/token?grant_type=client_credential&appid=${this.appid}&secret=${this.appsecret}`;
    return this.request(url, {dataType: 'json'}).then((response) => {
      const data = processWechatResponse(response.data);
      const expireTime = Date.now() + (data.exipres_in - 10) * 1000;
      const token = new AccessToken(data.access_token, expireTime);
      return this.saveAccessToken(token).then(() => {
        return token;
      });
    });
  }

  private getLatestAccessToken(): Promise<AccessToken> {
    return this.loadAccessToken().then((token) => {
      if (token && token.isValid()) {
        return token;
      } else {
        return this.getAccessToken();
      }
    })
  }

  private getTicket(type: 'jsapi' | 'wx_card' = 'jsapi'): Promise<Ticket> {
    return this.getLatestAccessToken().then((token) => {
      const url = `${this.endpoint}/cgi-bin/ticket/getticket?access_token=${token.accessToken}&type=${type}`;
      return this.request(url, {dataType: 'json'});
    }).then((response) => {
      const data = processWechatResponse(response.data);
      const expireTime = Date.now() + (data.expires_in - 10) * 1000;
      const ticket = new Ticket(data.ticket, expireTime);
      return this.saveTicket(type, ticket).then(() => {
        return ticket;
      })
    });
  }

  private getLatestTicket(type: 'jsapi' | 'wx_card' = 'jsapi'): Promise<Ticket> {
    return this.loadTicket(type).then((ticket) => {
      if (ticket && ticket.isValid()) {
        return ticket;
      } else {
        return this.getTicket(type);
      }
    });
  }

  getJsConfig(param: {debug: boolean, url: string, jsApiList: string[]}): Promise<JsConfig> {
    return this.getLatestTicket().then((ticket) => {
      const timestamp = Math.floor(Date.now() / 1000);
      const nonceStr = Math.random().toString(36).substr(2, 15);
      const shasum = crypto.createHash('sha1');
      shasum.update(`jsapi_ticket=${ticket.ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${param.url}`);
      const signature = shasum.digest('hex');
      return {
        debug: param.debug,
        appId: this.appid,
        timestamp,
        nonceStr,
        signature,
        jsApiList: param.jsApiList
      };
    });
  }

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
  }

  private getAuthAccessToken(code: string): Promise<AuthAccessToken> {
    const url = `${this.endpoint}/sns/oauth2/access_token?appid=${this.appid}&secret=${this.appsecret}&code=${code}&grant_type=authorization_code`;
    return this.request(url, {dataType: 'json'}).then((response) => {
      const data = processWechatResponse(response.data);
      const expireTime = Date.now() + (data.expires_in - 10) * 1000;
      const token = new AuthAccessToken(data.access_token, expireTime, data.refresh_token, data.openid);
      return this.saveAuthAccessToken(data.openid, token).then(() => {
        return token;
      });
    })
  }

  private refreshAuthAccessToken(refreshToken: string): Promise<AuthAccessToken> {
    const url = `${this.endpoint}/sns/oauth2/refresh_token?appid=${this.appid}&grant_type=refresh_token&refresh_token=${refreshToken}`;
    return this.request(url, {dataType: 'json'}).then((response) => {
      const data = processWechatResponse(response.data);
      const expireTime = Date.now() + (data.expires_in - 10) * 1000;
      const token = new AuthAccessToken(data.access_token, expireTime, data.refresh_token, data.openid);
      return this.saveAuthAccessToken(data.openid, token).then(() => {
        return token;
      });
    });
  }

  private _getAuthUser(openid: string, token: string, lang: 'zh_CN' | 'zh_TW' | 'en'): Promise<UserInfo> {
    const url = `${this.endpoint}/sns/userinfo?access_token=${token}&openid=${openid}&lang=${lang}`;
    return this.request(url, {dataType: 'json'}).then((response) => {
      return processWechatResponse(response.data);
    });
  }

  getAuthUser(openid: string, lang: 'zh_CN' | 'zh_TW' | 'en' = 'zh_CN'): Promise<UserInfo> {
    return this.loadAuthAccessToken(openid).then((token) => {
      if (!token) {
        const error = new Error(`No token for ${openid}, please authorize first.`);
        error.name = 'NoOAuthTokenError';
        throw error;
      }
      if (token.isValid()) {
        return this._getAuthUser(openid, token.accessToken, lang);
      } else {
        return this.refreshAuthAccessToken(token.refreshToken).then((token) => {
          return this._getAuthUser(openid, token.accessToken, lang);
        });
      }
    });
  }

  getOpenidByCode(code: string): Promise<string> {
    return this.getAuthAccessToken(code).then((token) => {
      return token.openid;
    });
  }

  getAuthUserByCode(code: string, lang: 'zh_CN' | 'zh_TW' | 'en' = 'zh_CN'): Promise<UserInfo> {
    return this.getAuthAccessToken(code).then((token) => {
      return this.getAuthUser(token.openid, lang);
    });
  }

  private verifyToken(openid: string, accessToken: string): Promise<void> {
    const url = `${this.endpoint}/sns/auth?access_token=${accessToken}&openid=${openid}`;
    return this.request(url, {dataType: 'json'}).then((response) => {
      processWechatResponse(response.data);
    });
  }
}
