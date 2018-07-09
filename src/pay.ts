import * as crypto from 'crypto';
import * as xml2js from 'xml2js';
import * as urllib from 'urllib';
import {UrlLibOptions, UrlLibResponse} from './types/urllib';
import {omit, mapKeys, camelCase, snakeCase} from 'lodash';

const debug = require('debug')('awesome-wechat-sdk:pay');

export interface UnifiedOrderReq {
  deviceInfo?: string;
  body: string;
  detail?: string;
  attach?: string;
  outTradeNo: string;
  feeType?: string;
  totalFee: number;
  spbillCreateIp: string;
  timeStart?: string;
  timeExpire?: string;
  goodsTag?: string;
  notifyUrl: string;
  tradeType: 'JSAPI' | 'NATIVE' | 'APP';
  productId?: string;
  limitPay?: 'no_credit';
  openid?: string;
  sceneInfo?: string;
};

export interface UnifiedOrderResp {
  tradeType: 'JSAPI' | 'NATIVE' | 'APP';
  prepayId: string;
  codeUrl?: string;
};

export interface OrderInfo {
  deviceInfo?: string;
  openid: string;
  isSubscribe?: 'Y' | 'N';
  tradeType: 'JSAPI' | 'NATIVE' | 'APP' | 'MICROPAY';
  tradeState: 'SUCCESS' | 'REFUND' | 'NOTPAY' | 'CLOSED' | 'REVOKED' | 'USERPAYING' | 'PAYERROR';
  bankType: string;
  totalFee: number;
  settlementTotalFee?: number;
  feeType?: string;
  cashFee: number;
  cashFeeType?: string;
  couponFee?: number;
  couponCount?: number;
  transactionId: string;
  outTradeNo: string;
  attach?: string;
  timeEnd: string;
  tradeStateDesc: string;
  coupon?: Array<{
    type?: 'CASH' | 'NO_CASH',
    id?: string,
    fee?: number
  }>;
};

export interface RefundReq {
  transactionId?: string;
  outTradeNo?: string;
  outRefundNo: string;
  totalFee: number;
  refundFee: number;
  refundFeeType?: string;
  refundDesc?: string;
  refundAccount?: 'REFUND_SOURCE_UNSETTLED_FUNDS' | 'REFUND_SOURCE_RECHARGE_FUNDS';
  notifyUrl?: string;
};

export interface RefundResp {
  transactionId: string;
  outTradeNo: string;
  outRefundNo: string;
  refundId: string;
  refundFee: number;
  settlementRefundFee?: number;
  totalFee: number;
  settlementTotalFee?: number;
  feeType?: string;
  cashFee: number;
  cashFeeType?: string;
  cashRefundFee?: number;
  couponRefundFee?: number;
  couponRefundCount?: number;
  coupon?: Array<{
    type?: 'CASH' | 'NO_CASH',
    refundFee?: number,
    refundId?: string
  }>
};

export interface Refund {
  totalRefundCount?: number;
  transactionId: string;
  outTradeNo: string;
  totalFee: number;
  settlementTotalFee?: number;
  feeType?: string;
  cashFee: number;
  refundCount: number;
  refund: Array<{
    outRefundNo?: string,
    refundId?: string,
    refundChannel?: 'ORIGINAL' | 'BALANCE' | 'OTHER_BALANCE' | 'OTHER_BANKCARD',
    refundFee?: number,
    settlementRefundFee?: number,
    couponRefundFee?: number,
    couponRefundCount?: number,
    coupon?: Array<{
      type?: 'CASH' | 'NO_CASH',
      refundId?: string,
      refundFee?: number
    }>,
    refundStatus?: 'SUCCESS' | 'REFUNDCLOSE' | 'PROCESSING' | 'CHANGE',
    refundAccount?: 'REFUND_SOURCE_RECHARGE_FUNDS' | 'REFUND_SOURCE_UNSETTLED_FUNDS',
    refundRecvAccout?: string,
    refundSuccessTime?: string
  }>
};

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
  headless: true
});

function createNonceStr(): string {
  return Math.random().toString(36).substr(2, 15);
}

export class WechatPay {
  private readonly appid: string;
  private readonly mchid: string;
  private readonly key: string;
  private readonly pfx: Buffer;
  private readonly passphrase: string;
  private sandbox: boolean = false;

  constructor(appid: string, mchid: string, key: string, pfx?: Buffer, passphrase?: string) {
    this.appid = appid;
    this.mchid = mchid;
    this.key = key;
    this.pfx = pfx;
    this.passphrase = passphrase;
  }

  private _endpoint: string = 'https://api.mch.weixin.qq.com';
  set endpoint(endpoint: string) {
    this._endpoint = endpoint;
  }
  get endpoint(): string {
    if (this.sandbox) {
      return `${this._endpoint}/sandboxnew`;
    }

    return this._endpoint
  }

  defaults: UrlLibOptions = {};
  setOpts(opts: UrlLibOptions) {
    this.defaults = opts;
  }

  toggleSandbox(sandbox: boolean) {
    this.sandbox = sandbox;
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

  async getKey(raw: boolean = false): Promise<string> {
    if (!this.sandbox || raw) {
      return this.key;
    }
    const url = `${this.endpoint}/pay/getsignkey`;
    const nonceStr = createNonceStr();
    const params = {
      mch_id: this.mchid,
      nonce_str: nonceStr
    };
    const sign = await this.getSign(params, 'MD5', true);
    const response = await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      data: builder.buildObject({
        ...params,
        sign
      })
    });
    const ret = await parseXML(response.data.toString());
    if (ret.return_code !== 'SUCCESS') {
      throw new Error(ret.return_msg);
    }
    return ret.sandbox_signkey;
  }

  async getSign(params: object, signType: 'MD5' | 'HMAC-SHA256' = 'MD5', raw: boolean = false): Promise<string> {
    const pairs = Object.keys(params).sort().map((k) => {
      const v = params[k];
      if (v === undefined || v === null || v === '') {
        return null;
      }
      return [k, v].join('=');
    }).filter(p => p !== null);
    const key = await this.getKey(raw);
    pairs.push(['key', key].join('='));
    const stringSignTemp = pairs.join('&');
    debug('stringSignTemp: %s', stringSignTemp);
    let hash;
    if (signType === 'MD5') {
      hash = crypto.createHash('md5');
    } else if (signType === 'HMAC-SHA256') {
      hash = crypto.createHmac('sha256', key);
    } else {
      throw new Error('unsupported signType, only support MD5 or HMAC-SHA256');
    }
    hash.update(stringSignTemp);
    const sign = hash.digest('hex').toUpperCase();
    debug('sign: %s', sign);
    return sign;
  }

  async _processResponse(ret: {return_code: 'SUCCESS' | 'FAIL', return_msg?: string, sign?: string, result_code?: 'SUCCESS' | 'FAIL', err_code?: string, err_code_des?: string}, signType: 'MD5' | 'HMAC-SHA256' = 'MD5'): Promise<object> {
    debug('response: %j', ret);
    if (ret.return_code !== 'SUCCESS') {
      throw new Error(ret.return_msg);
    }
    const {sign, ...restRet} = ret;
    if (sign && sign !== await this.getSign(restRet, signType)) {
      throw new Error('signature mismatch');
    }
    if (ret.result_code !== 'SUCCESS') {
      throw new Error(`${ret.err_code}|${ret.err_code_des}`);
    }

    return omit(ret, ['return_code', 'return_msg', 'appid', 'mch_appid', 'mch_id', 'mchid', 'nonce_str', 'sign', 'result_code', 'err_code', 'err_code_des']);
  }

  async unifiedOrder(req: UnifiedOrderReq, signType: 'MD5' | 'HMAC-SHA256' = 'MD5'): Promise<UnifiedOrderResp> {
    const url = `${this.endpoint}/pay/unifiedorder`;
    const nonceStr = createNonceStr();
    const params = {
      ...mapKeys(req, (v, k) => snakeCase(k)),
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: nonceStr,
      sign_type: signType
    };
    const sign = await this.getSign(params, signType);
    const response = await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      data: builder.buildObject({
        ...params,
        sign
      })
    });
    const ret = await parseXML(response.data.toString());
    const data = await this._processResponse(ret, signType);
    return mapKeys(data, (v, k) => camelCase(k));
  }

  async getPaySign(prepayId: string, signType: 'MD5' | 'HMAC-SHA256' = 'MD5'): Promise<{
    timestamp: number,
    nonceStr: string,
    package: string,
    signType: 'MD5' | 'HMAC-SHA256',
    paySign: string
  }> {
    const timeStamp = Math.floor(Date.now() / 1000);
    const nonceStr = createNonceStr();
    const packageStr = `prepay_id=${prepayId}`;
    const params = {
      appId: this.appid,
      timeStamp,
      nonceStr,
      package: packageStr,
      signType
    };
    const sign = await this.getSign(params, signType);
    return {
      timestamp: timeStamp,
      nonceStr,
      package: packageStr,
      signType,
      paySign: sign
    };
  }

  async getAppPaySign(prepayId: string, signType: 'MD5' | 'HMAC-SHA256' = 'MD5'): Promise<{
    partnerId: string,
    package: string,
    nonceStr: string,
    timeStamp: number,
    sign: string
  }> {
    const timeStamp = Math.floor(Date.now() / 1000);
    const nonceStr = createNonceStr();
    const packageStr = 'Sign=WXPay';
    const params = {
      appid: this.appid,
      partnerid: this.mchid,
      prepayid: prepayId,
      package: packageStr,
      noncestr: nonceStr,
      timestamp: timeStamp
    };
    const sign = await this.getSign(params, signType);

    return {
      partnerId: this.mchid,
      package: packageStr,
      nonceStr,
      timeStamp,
      sign
    };
  }

  async queryOrder(query: {outTradeNo?: string, transactionId?: string}, signType: 'MD5' | 'HMAC-SHA256' = 'MD5'): Promise<OrderInfo> {
    const url = `${this.endpoint}/pay/orderquery`;
    const nonceStr = createNonceStr();
    const params = {
      ...mapKeys(query, (v, k) => snakeCase(k)),
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: nonceStr,
      sign_type: signType
    };
    const sign = await this.getSign(params, signType);
    const response = await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      data: builder.buildObject({
        ...params,
        sign
      })
    });
    const ret = await parseXML(response.data.toString());
    const data = await this._processResponse(ret, signType);
    const order = <OrderInfo>{};
    Object.keys(data).forEach((k) => {
      const match = /coupon_(type|id|fee)_\$?(\d+)/.exec(k);
      if (match) {
        if (!order.coupon) {
          order.coupon = [];
        }
        const index = Number(match[2]);
        if (!order.coupon[index]) {
          order.coupon[index] = {};
        }
        order.coupon[index][match[1]] = data[k];
      } else {
        order[camelCase(k)] = data[k];
      }
    });
    return order;
  }

  async queryOrderByOutTradeNo(outTradeNo: string, signType: 'MD5' | 'HMAC-SHA256' = 'MD5'): Promise<OrderInfo> {
    return await this.queryOrder({outTradeNo}, signType);
  }

  async queryOrderByTransactionId(transactionId: string, signType: 'MD5' | 'HMAC-SHA256' = 'MD5'): Promise<OrderInfo> {
    return await this.queryOrder({transactionId}, signType);
  }

  async closeOrder(outTradeNo: string, signType: 'MD5' | 'HMAC-SHA256' = 'MD5'): Promise<void> {
    const url = `${this.endpoint}/pay/closeorder`;
    const nonceStr = createNonceStr();
    const params = {
      appid: this.appid,
      mch_id: this.mchid,
      out_trade_no: outTradeNo,
      nonce_str: nonceStr,
      sign_type: signType
    };
    const sign = await this.getSign(params, signType);
    const response = await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      data: builder.buildObject({
        ...params,
        sign
      })
    });
    const ret = await parseXML(response.data.toString());
    await this._processResponse(ret, signType);
  }

  async refund(req: RefundReq, signType: 'MD5' | 'HMAC-SHA256' = 'MD5'): Promise<RefundResp> {
    if (!this.pfx) {
      throw new Error('pfx needed');
    }
    const url = `${this.endpoint}/secapi/pay/refund`;
    const nonceStr = createNonceStr();
    const params = {
      ...mapKeys(req, (v, k) => snakeCase(k)),
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: nonceStr,
      sign_type: signType
    };
    const sign = await this.getSign(params, signType);
    const response = await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      pfx: this.pfx,
      passphrase: this.passphrase,
      data: builder.buildObject({
        ...params,
        sign
      })
    });
    const ret = await parseXML(response.data.toString());
    const data = await this._processResponse(ret, signType);
    const refund = <RefundResp>{};
    Object.keys(data).forEach((k) => {
      const match = /coupon_(type|refund_fee|refund_id)_\$?(\d+)/.exec(k);
      if (match) {
        if (!refund.coupon) {
          refund.coupon = [];
        }
        const index = Number(match[2]);
        if (!refund.coupon[index]) {
          refund.coupon[index] = {};
        }
        refund.coupon[index][camelCase(match[1])] = data[k];
      } else {
        refund[camelCase(k)] = data[k];
      }
    });
    return refund;
  }

  async queryRefund(req: {
    transactionId?: string,
    outTradeNo?: string,
    outRefundNo?: string,
    refundId?: string,
    offset?: number
  }, signType: 'MD5' | 'HMAC-SHA256' = 'MD5'): Promise<Refund> {
    const url = `${this.endpoint}/pay/refundquery`;
    const nonceStr = createNonceStr();
    const params = {
      ...mapKeys(req, (v, k) => snakeCase(k)),
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: nonceStr,
      sign_type: signType
    };
    const sign = await this.getSign(params, signType);
    const response = await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      data: builder.buildObject({
        ...params,
        sign
      })
    });
    const ret = await parseXML(response.data.toString());
    const data = await this._processResponse(ret, signType);
    const refund = <Refund>{};
    Object.keys(data).forEach((k) => {
      const match = /([a-z_]+)_\$?(\d+)(?:_\$?(\d)+)?/.exec(k);
      if (match) {
        if (!refund.refund) {
          refund.refund = [];
        }
        const n = Number(match[2]);
        if (!refund.refund[n]) {
          refund.refund[n] = {};
        }
        if (!match[3]) {
          refund.refund[n][camelCase(match[1])] = data[k];
        } else {
          if (!refund.refund[n].coupon) {
            refund.refund[n].coupon = [];
          }
          const m = Number(match[3]);
          if (!refund.refund[n].coupon[m]) {
            refund.refund[n].coupon[m] = {};
          }
          refund.refund[n].coupon[m][camelCase(match[1].substr(7))] = data[k];
        }
      } else {
        refund[camelCase(k)] = data[k];
      }
    });
    return refund;
  }

  async downloadBill(billDate: string, billType: 'ALL' | 'SUCCESS' | 'REFUND' | 'RECHARGE_REFUND' = 'ALL', signType: 'MD5' | 'HMAC-SHA256' = 'MD5', tarType?: 'GZIP'): Promise<string> {
    const url = `${this.endpoint}/pay/downloadbill`;
    const nonceStr = createNonceStr();
    const params = {
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: nonceStr,
      sign_type: signType,
      bill_date: billDate,
      bill_type: billType,
      tar_type: tarType
    };
    const sign = await this.getSign(params, signType);
    const response = await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      data: builder.buildObject({
        ...params,
        sign
      }),
      timeout: 60000
    });
    let success = false;
    let ret;
    try {
      ret = await parseXML(response.data.toString());
    } catch (e) {
      success = true;
    }
    if (!success) {
      await this._processResponse(ret, signType);
    }
    return response.data.toString();
  }

  async downloadFundFlow(billDate: string, accountType: 'Basic' | 'Operation' | 'Fees', tarType?: 'GZIP'): Promise<string> {
    if (!this.pfx) {
      throw new Error('pfx needed');
    }
    const url = `${this.endpoint}/pay/downloadfundflow`;
    const nonceStr = createNonceStr();
    const params = {
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: nonceStr,
      bill_date: billDate,
      account_type: accountType,
      tar_type: tarType
    };
    const sign = await this.getSign(params, 'HMAC-SHA256');
    const response = await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      pfx: this.pfx,
      passphrase: this.passphrase,
      data: builder.buildObject({
        ...params,
        sign
      }),
      timeout: 60000
    });
    let success = false;
    let ret;
    try {
      ret = await parseXML(response.data.toString());
    } catch (e) {
      success = true;
    }
    if (!success) {
      await this._processResponse(ret, 'HMAC-SHA256');
    }
    return response.data.toString();
  }

  async batchQueryComment(beginTime: string, endTime: string, offset: number, limit?: number): Promise<string> {
    if (!this.pfx) {
      throw new Error('pfx needed');
    }
    const url = `${this.endpoint}/billcommentsp/batchquerycomment`;
    const nonceStr = createNonceStr();
    const params = {
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: nonceStr,
      begin_time: beginTime,
      end_time: endTime,
      offset: offset,
      limit
    };
    const sign = await this.getSign(params, 'HMAC-SHA256');
    const response = await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      pfx: this.pfx,
      passphrase: this.passphrase,
      data: builder.buildObject({
        ...params,
        sign
      }),
      timeout: 60000
    });
    let success = false;
    let ret;
    try {
      ret = await parseXML(response.data.toString());
    } catch (e) {
      success = true;
    }
    if (!success) {
      await this._processResponse(ret, 'HMAC-SHA256');
    }
    return response.data.toString();
  }

  async transfer(req: {
    deviceInfo?: string,
    partnerTradeNo: string,
    openid: string,
    checkName: 'NO_CHECK' | 'FORCE_CHECK',
    reUserName?: string,
    amount: number,
    desc: string,
    spbillCreateIp: string
  }): Promise<{
    deviceInfo?: string,
    partnerTradeNo: string,
    paymentNo: string,
    paymentTime: string
  }> {
    if (!this.pfx) {
      throw new Error('pfx needed');
    }
    const url = `${this.endpoint}/mmpaymkttransfers/promotion/transfers`;
    const nonceStr = createNonceStr();
    const params = {
      ...mapKeys(req, (v, k) => snakeCase(k)),
      mch_appid: this.appid,
      mchid: this.mchid,
      nonce_str: nonceStr
    };
    const sign = await this.getSign(params);
    const response = await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      pfx: this.pfx,
      passphrase: this.passphrase,
      data: builder.buildObject({
        ...params,
        sign
      })
    });
    const ret = await parseXML(response.data.toString());
    const data = await this._processResponse(ret);
    return mapKeys(data, (v, k) => camelCase(k));
  }

  async queryTransfer(partnerTradeNo: string): Promise<{
    partnerTradeNo: string,
    detailId: string,
    status: 'SUCCESS' | 'FAILED' | 'PROCESSING',
    reason?: string,
    openid: string,
    transferName?: string,
    paymentAmount: number,
    transferTime: string,
    desc: string
  }> {
    if (!this.pfx) {
      throw new Error('pfx needed');
    }
    const url = `${this.endpoint}/mmpaymkttransfers/gettransferinfo`;
    const nonceStr = createNonceStr();
    const params = {
      nonce_str: nonceStr,
      partner_trade_no: partnerTradeNo,
      mch_id: this.mchid,
      appid: this.appid
    };
    const sign = await this.getSign(params);
    const response = await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      pfx: this.pfx,
      passphrase: this.passphrase,
      data: builder.buildObject({
        ...params,
        sign
      })
    });
    const ret = await parseXML(response.data.toString());
    const data = await this._processResponse(ret);
    return mapKeys(data, (v, k) => camelCase(k));
  }
}
