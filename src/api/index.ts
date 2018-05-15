import * as urllib from 'urllib';
import {UrlLibOptions, UrlLibResponse} from '../types/urllib';
import {Mixin} from 'lodash-decorators';

import {WechatAPIError} from './util';
import Common, {AccessToken} from './common'
import JS, {Ticket} from './js';
import OAuth, {AuthAccessToken} from './oauth';
import User from './user';
import Template from './template';
import Menu from './menu';

const debug = require('debug')('awesome-wechat-sdk:api');

export {WechatAPIError, AccessToken, Ticket, AuthAccessToken};

@Mixin(Common, JS, OAuth, User, Template, Menu)
export class WechatApi {
  readonly appid: string;
  readonly appsecret: string;

  constructor(appid: string, appsecret: string) {
    this.appid = appid;
    this.appsecret = appsecret;
  }

  endpoint: string = 'https://api.weixin.qq.com';
  setEndpoint(domain: 'api.weixin.qq.com' | 'sh.api.weixin.qq.com' | 'sz.api.weixin.qq.com' | 'hk.api.weixin.qq.com'): void {
    this.endpoint = `https://${domain}`;
  }

  store: {
    accessToken: AccessToken,
    authAccessToken: {[openid: string]: AuthAccessToken},
    ticket: {jsapi: Ticket, wx_card: Ticket}
  } = {
    accessToken: null,
    authAccessToken: {},
    ticket: {jsapi: null, wx_card: null}
  };

  defaults: UrlLibOptions = {};

  setOpts(opts: UrlLibOptions) {
    this.defaults = opts;
  }

  request(url: string, opts: UrlLibOptions = {}): Promise<UrlLibResponse> {
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

    debug('request for url %s with options %j', url, options);
    return urllib.request(url, options);
  }
}
