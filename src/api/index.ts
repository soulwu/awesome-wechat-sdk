import * as urllib from 'urllib';
import {UrlLibOptions, UrlLibResponse} from '../types/urllib';
import {Mixin} from 'lodash-decorators';

import Common, {WechatAPIError, AccessToken} from './common'
import JS, {Ticket} from './js';
import OAuth, {AuthAccessToken} from './oauth';
import User from './user';
import Template from './template';
import Menu from './menu';
import IP from './ip';
import CustomService from './custom_service';
import QRCode from './qrcode';
import URL from './url';
import Quota from './quota';
import Material from './material';
import Media from './media';

const debug = require('debug')('awesome-wechat-sdk:api');

export {WechatAPIError, AccessToken, Ticket, AuthAccessToken};

@Mixin(Common, JS, OAuth, User, Template, Menu, IP, CustomService, QRCode, URL, Quota, Material, Media)
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

  async request(url: string, opts: UrlLibOptions = {}): Promise<UrlLibResponse> {
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
    return await urllib.request(url, options);
  }
}
