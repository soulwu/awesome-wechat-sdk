import * as crypto from 'crypto';

const debug = require('debug')('awesome-wechat-sdk:crypto');

export class PKCS7Padding {
  private readonly blockSize: number;

  constructor(blockSize: number = 32) {
    this.blockSize = blockSize;
  }

  pad(text: Buffer): Buffer {
    const len = text.length;
    const amountToPad = this.blockSize - len % this.blockSize;
    const result = Buffer.alloc(amountToPad, amountToPad);

    return Buffer.concat([text, result]);
  }

  unpad(text: Buffer): Buffer {
    let pad = text[text.length - 1];
    if (pad < 1 || pad > this.blockSize) {
      pad = 0;
    }

    return text.slice(0, text.length - pad);
  }
}

export class WXBizMsgCrypt {
  private readonly appid: string;
  private readonly token: string;
  private readonly key: Buffer;
  private readonly iv: Buffer;
  private readonly padding: PKCS7Padding;

  constructor(appid: string, token: string, encodingAESKey: string, padding: PKCS7Padding = new PKCS7Padding(32)) {
    if (!appid || !token || !encodingAESKey) {
      throw new Error('please check arguments');
    }
    this.appid = appid;
    this.token = token;

    const AESKey = Buffer.from(`${encodingAESKey}=`, 'base64');
    if (AESKey.length !== 32) {
      throw new Error('encodingAESKey invalid');
    }
    this.key = AESKey;
    this.iv = AESKey.slice(0, 16);
    this.padding = padding;
  }

  getSignature(timestamp: string, nonce: string, encrypt: string): string {
    debug('timestamp[%s] nonce[%s] encrypt[%s]', timestamp, nonce, encrypt);
    const sha1 = crypto.createHash('sha1');
    sha1.update([this.token, timestamp, nonce, encrypt].sort().join(''));
    const signature = sha1.digest('hex');
    debug('signature: %s', signature);
    return signature;
  }

  encrypt(message: string): string {
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key, this.iv);
    cipher.setAutoPadding(false);

    const random = crypto.pseudoRandomBytes(16);
    const msg = Buffer.from(message);
    const msgLength = Buffer.alloc(4);
    msgLength.writeInt32BE(msg.length, 0);
    const appid = Buffer.from(this.appid);

    const ciphered = Buffer.concat([cipher.update(this.padding.pad(Buffer.concat([random, msgLength, msg, appid]))), cipher.final()]).toString('base64');
    debug('cipher result: %s', ciphered);

    return ciphered;
  }

  decrypt(ciphered: string): string | false {
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, this.iv);
    decipher.setAutoPadding(false);

    const deciphered = this.padding.unpad(Buffer.concat([decipher.update(ciphered, 'base64'), decipher.final()]));
    debug('decipher result: %s', deciphered.toString());

    const content = deciphered.slice(16);
    const length = content.slice(0, 4).readUInt32BE(0);
    const message = content.slice(4, length + 4).toString();
    const appid = content.slice(length + 4).toString();

    if (appid !== this.appid) {
      return false;
    }

    return message;
  }
}
