
export default {
  async getIp(): Promise<string[]> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/getcallbackip?access_token=${token.accessToken}`;
    const response = await this.request(url, {dataType: 'json'});
    const data = await this._processWechatResponse(response.data);
    return data.ip_list;
  }
};
