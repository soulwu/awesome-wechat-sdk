export default {
  async shortUrl(longUrl: string): Promise<string> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/shorturl?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        action: 'long2short',
        long_url: longUrl
      },
      dataType: 'json'
    });
    const data = await this._processWechatResponse(response.data);
    return data.short_url;
  }
};
