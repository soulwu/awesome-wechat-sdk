import * as crypto from 'crypto';

const debug = require('debug')('awesome-wechat-sdk:api:js');

export class Ticket {
  readonly ticket: string;
  readonly expireTime: number;
  constructor(ticket: {ticket: string, expireTime: number}) {
    this.ticket = ticket.ticket;
    this.expireTime = ticket.expireTime;
  }
  isValid(): boolean {
    return !!this.ticket && Date.now() < this.expireTime;
  }
  toJSON(): object {
    return {
      ticket: this.ticket,
      expireTime: this.expireTime
    };
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

function createNonceStr(): string {
  return Math.random().toString(36).substr(2, 15);
}

export default {
  async loadTicket(type: 'jsapi' | 'wx_card'): Promise<Ticket> {
    return this.store.ticket[type];
  },
  async saveTicket(type: 'jsapi' | 'wx_card', ticket: Ticket): Promise<void> {
    this.store.ticket[type] = ticket;
  },
  registerTicketHandler(handler: {loadTicket?: (type: 'jsapi' | 'wx_card') => Promise<Ticket>, saveTicket?: (type: 'jsapi' | 'wx_card', ticket: Ticket) => Promise<void>} = {}): void {
    if (handler.loadTicket) {
      this.loadTicket = handler.loadTicket;
    }
    if (handler.saveTicket) {
      this.saveTicket = handler.saveTicket;
    }
  },
  async getTicket(type: 'jsapi' | 'wx_card' = 'jsapi'): Promise<Ticket> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/ticket/getticket?access_token=${token.accessToken}&type=${type}`;
    const response = await this.request(url, {dataType: 'json'});
    const data = await this._processWechatResponse(response.data);
    const expireTime = Date.now() + (data.expires_in - 10) * 1000;
    const ticket = new Ticket({ticket: data.ticket, expireTime});
    await this.saveTicket(type, ticket);
    return ticket;
  },
  async getLatestTicket(type: 'jsapi' | 'wx_card' = 'jsapi'): Promise<Ticket> {
    const ticket = await this.loadTicket(type);
    if (ticket && ticket.isValid()) {
      return ticket;
    } else {
      return await this.getTicket(type);
    }
  },
  async getJsConfig(param: {debug: boolean, url: string, jsApiList: string[]}): Promise<JsConfig> {
    const ticket = await this.getLatestTicket();
    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = createNonceStr();
    const shasum = crypto.createHash('sha1');
    shasum.update(`jsapi_ticket=${ticket.ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${param.url}`);
    const signature = shasum.digest('hex');
    debug('nonceStr[%s] timestamp[%d] signature[%s]', nonceStr, timestamp, signature);
    return {
      debug: param.debug,
      appId: this.appid,
      timestamp,
      nonceStr,
      signature,
      jsApiList: param.jsApiList
    };
  }
};
