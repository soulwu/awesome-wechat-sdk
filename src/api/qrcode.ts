export default {
  async createQRCode(expire: number, scene: number | string): Promise<{ticket: string, expire_seconds: number, url: string}> {
    const isLimit = expire === 0;
    const isStr = typeof scene === 'string';
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/qrcode/create?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        expire_seconds: expire,
        action_name: `QR${isLimit ? '_LIMIT' : ''}${isStr ? '_STR' : ''}_SCENE`,
        action_info: {
          scene: {[isStr ? 'scene_str' : 'scene_id']: scene}
        }
      },
      dataType: 'json'
    });
    return await this._processWechatResponse(response.data);
  },

  showQRCodeURL(ticket: string): string {
    return `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(ticket)}`;
  }
};
