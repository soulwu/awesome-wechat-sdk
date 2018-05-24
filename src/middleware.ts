import * as crypto from 'crypto';
import * as xml2js from 'xml2js';
import {WXBizMsgCrypt} from './crypto';

const debug = require('debug')('awesome-wechat-sdk:middleware');

function getSignature(timestamp: string, nonce: string, token: string): string {
  debug('timestamp[%s] nonce[%s] token[%s]', timestamp, nonce, token);

  var sha1 = crypto.createHash('sha1');
  sha1.update([token, timestamp, nonce].sort().join(''));

  const signature = sha1.digest('hex');
  debug('signature: %s', signature);

  return signature;
}

function parseXML(xml: string): Promise<any> {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, {
      explicitArray: false,
      explicitRoot: false,
      trim: true
    }, (err, result) => {
      err ? reject(err) : resolve(result);
    });
  });
}

const builder = new xml2js.Builder({
  rootName: 'xml',
  renderOpts: {
    pretty: false
  },
  headless: true,
  cdata: true
});

export type MsgType = 'text' | 'image' | 'voice' | 'video' | 'music' | 'news' | 'transfer_customer_service';
export type TextContent = string;
export interface ImageContent {
  mediaId: string
}
export interface VoiceContent {
  mediaId: string
}
export interface VideoContent {
  mediaId: string,
  title: string,
  description: string
}
export interface MusicContent {
  mediaId: string
  title: string,
  description: string,
  musicUrl: string,
  hqMusicUrl: string,
}
export interface NewsContent {
  title: string,
  description: string,
  picUrl: string,
  url: string
}
export interface ServiceContent {
  kfAccount?: string
}
export type ReplyContent = TextContent | NewsContent[] | {type: MsgType, content: TextContent | ImageContent | VoiceContent | VideoContent | MusicContent | NewsContent[] | ServiceContent};

function reply(content: ReplyContent, fromUserName: string, toUserName: string) {
  if (typeof content === 'string') {
    content = {type: 'text', content: content};
  } else if (Array.isArray(content)) {
    content = {type: 'news', content: content};
  }
  const info = {
    ToUserName: toUserName,
    FromUserName: fromUserName,
    CreateTime: Math.floor(Date.now() / 1000),
    MsgType: content.type || 'text'
  };
  switch (content.type) {
    case 'text':
      return builder.buildObject({
        ...info,
        Content: content.content
      });
    case 'image':
      return builder.buildObject({
        ...info,
        Image: {
          MediaId: (<ImageContent>content.content).mediaId
        }
      });
    case 'voice':
      return builder.buildObject({
        ...info,
        Voice: {
          MediaId: (<VoiceContent>content.content).mediaId
        }
      });
    case 'video':
      return builder.buildObject({
        ...info,
        Video: {
          MediaId: (<VideoContent>content.content).mediaId,
          Title: (<VideoContent>content.content).title,
          Description: (<VideoContent>content.content).description
        }
      });
    case 'music':
      return builder.buildObject({
        ...info,
        Music: {
          Title: (<MusicContent>content.content).title,
          Description: (<MusicContent>content.content).description,
          MusicUrl: (<MusicContent>content.content).musicUrl,
          HQMusicUrl: (<MusicContent>content.content).hqMusicUrl,
          ThumbMediaId: (<MusicContent>content.content).mediaId
        }
      });
    case 'news':
      return builder.buildObject({
        ...info,
        ArticleCount: (<NewsContent[]>content.content).length,
        Articles: {
          item: (<NewsContent[]>content.content).map(item => ({Title: item.title, Description: item.description, PicUrl: item.picUrl, Url: item.url}))
        }
      });
    case 'transfer_customer_service':
      if (content.content && (<ServiceContent>content.content).kfAccount) {
        return builder.buildObject({
          ...info,
          TransInfo: {
            KfAccount: (<ServiceContent>content.content).kfAccount
          }
        });
      }
      return builder.buildObject(info);
    default:
      return builder.buildObject({
        ...info,
        Content: (content.content || '').toString()
      });
  }
}

export type Handle = (message: object, ctx: object) => Promise<ReplyContent>;
export type HandlerConfig = string | {token: string, appid?: string, encodingAESKey?: string};

export class Handler {
  private token: string;
  private appid: string;
  private encodingAESKey: string;
  private readonly handlers: Map<string, Handle>;
  private cryptor: WXBizMsgCrypt;

  constructor(config?: HandlerConfig) {
    if (config) {
      this.setConfig(config);
    }
    this.handlers = new Map<string, Handle>();
  }

  setConfig(config: HandlerConfig): void {
    if (typeof config === 'string') {
      this.token = config;
    } else {
      this.token = config.token;
      this.appid = config.appid;
      this.encodingAESKey = config.encodingAESKey;
    }
  }

  getHandler(type: string): Handle {
    return this.handlers.get(type) || this.handlers.get('any') || (() => Promise.resolve(''));
  }

  setHandler(type: string, handle: Handle): Handler {
    this.handlers.set(type, handle);
    return this;
  }

  text(handle: Handle): Handler {
    return this.setHandler('text', handle);
  }

  image(handle: Handle): Handler {
    return this.setHandler('image', handle);
  }

  voice(handle: Handle): Handler {
    return this.setHandler('voice', handle);
  }

  location(handle: Handle): Handler {
    return this.setHandler('location', handle);
  }

  link(handle: Handle): Handler {
    return this.setHandler('link', handle);
  }

  event(handle: Handle): Handler {
    return this.setHandler('event', handle);
  }

  shortvideo(handle: Handle): Handler {
    return this.setHandler('shortvideo', handle);
  }

  hardware(handle: Handle): Handler {
    return this.setHandler('hardware', handle);
  }

  device_text(handle: Handle): Handler {
    return this.setHandler('device_text', handle);
  }

  device_event(handle: Handle): Handler {
    return this.setHandler('device_event', handle);
  }

  any(handle: Handle): Handler {
    return this.setHandler('any', handle);
  }

  middlewarify() {
    if (this.encodingAESKey) {
      this.cryptor = new WXBizMsgCrypt(this.appid, this.token, this.encodingAESKey);
    }
    return async (ctx, next) => {
      const {encrypt_type, msg_signature, signature, timestamp, nonce, echostr} = ctx.query;
      const encrypted = !!(encrypt_type && encrypt_type === 'aes' && msg_signature);
      const method = ctx.method;
      const token = ctx.wx_token || this.token;
      const cryptor = ctx.wx_cryptor || this.cryptor;

      if (method === 'GET') {
        let valid = false;
        if (encrypted) {
          valid = msg_signature === cryptor.getSignature(timestamp, nonce, echostr);
        } else {
          valid = signature === getSignature(timestamp, nonce, token);
        }

        if (!valid) {
          ctx.throw(400, 'Invalid signature');
        } else {
          if (encrypted) {
            const decryptedStr = cryptor.decrypt(echostr);
            if (decryptedStr === false) {
              ctx.throw(400, 'Appid mismatch');
            } else {
              ctx.body = decryptedStr;
            }
          } else {
            ctx.body = echostr;
          }
        }
      } else if (method === 'POST') {
        let message = ctx.request.body;
        if (typeof message !== 'object') {
          ctx.throw(500, 'Please add koa-xml-body');
        }
        if (!encrypted) {
          if (signature !== getSignature(timestamp, nonce, token)) {
            ctx.throw(400, 'Invalid signature');
          }
        } else {
          const encryptMessage = message.Encrypt;
          if (msg_signature !== cryptor.getSignature(timestamp, nonce, encryptMessage)) {
            ctx.throw(400, 'Invalid signature');
          }
          const decryptedXML = cryptor.decrypt(encryptMessage);
          if (decryptedXML === false) {
            ctx.throw(400, 'Appid mismatch');
          }
          message = await parseXML(decryptedXML);
        }
        debug('message: %j', message);
        const handle = this.getHandler(message.MsgType);
        const body = await handle(message, ctx);

        let replyMessage = body ? reply(body, message.ToUserName, message.FromUserName) : '';
        if (encrypted) {
          const encryptReplyMessage = cryptor.encrypt(replyMessage);
          const replySignature = cryptor.getSignature(timestamp, nonce, encryptReplyMessage);
          replyMessage = builder.buildObject({
            Encrypt: encryptReplyMessage,
            MsgSignature: replySignature,
            TimeStamp: timestamp,
            Nonce: nonce
          });
        }
        debug('replyMessage: %s', replyMessage);
        ctx.type = 'application/xml';
        ctx.body = replyMessage;
      } else {
        ctx.status = 501;
        ctx.body = 'Not Implemented';
      }
    };
  }
}

export const middleware = (config?: HandlerConfig) => {
  return new Handler(config);
};
