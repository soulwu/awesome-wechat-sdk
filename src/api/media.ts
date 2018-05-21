import * as Formstream from 'formstream';
import {processWechatResponse} from './util';

export default {
  async uploadMedia(type: 'image' | 'voice' | 'video' | 'thumb', media: Buffer, filename: string): Promise<{type: 'image' | 'voice' | 'video' | 'thumb', media_id: string, created_at: number}> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/media/upload?access_token=${token.accessToken}&type=${type}`;
    const form = new Formstream();
    form.buffer('media', media, filename);
    const response = await this.request(url, {
      method: 'POST',
      headers: form.headers(),
      stream: form,
      dataType: 'json',
      timeout: 60000
    });
    return processWechatResponse(response.data);
  },
  async getMedia(mediaId: string): Promise<Buffer|string> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/media/get?access_token=${token.accessToken}&media_id=${mediaId}`;
    const response = await this.request(url, {
      timeout: 60000
    });
    const contentType = response.res.headers['content-type'];
    if (contentType === 'application/json' || contentType === 'text/plain') {
      const data = processWechatResponse(JSON.parse(response.data.toString()));
      return data.video_url;
    }
    return response.data;
  }
};
