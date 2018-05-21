import * as Formstream from 'formstream';
import {processWechatResponse} from './util';

export interface Article {
  title: string;
  thumb_media_id: string;
  author?: string;
  digest?: string;
  show_cover_pic: 0 | 1;
  content: string;
  content_source_url?: string;
  url?: string;
};

export default {
  async addNewsMaterial(articles: Article[]): Promise<string> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/material/add_news?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        articles
      },
      dataType: 'json'
    });
    const data = processWechatResponse(response.data);
    return data.media_id;
  },
  async uploadNewsMaterialImg(image: Buffer, filename: string = 'image.jpg'): Promise<string> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/media/uploadimg?access_token=${token.accessToken}`;
    const form = new Formstream();
    form.buffer('media', image, filename);
    const response = await this.request(url, {
      method: 'POST',
      headers: form.headers(),
      stream: form,
      dataType: 'json',
      timeout: 60000
    });
    const data = processWechatResponse(response.data);
    return data.url;
  },
  async updateNewsMaterial(mediaId: string, index: number, article: Article): Promise<void> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/material/update_news?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        media_id: mediaId,
        index,
        articles: article
      },
      dataType: 'json'
    });
    processWechatResponse(response.data);
  },
  async _addMaterial(form: Formstream, type: 'image' | 'voice' | 'video' | 'thumb'): Promise<{media_id: string, url?: string}> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/material/add_material?access_token=${token.accessToken}&type=${type}`;
    const response = await this.request(url, {
      method: 'POST',
      headers: form.headers(),
      stream: form,
      dataType: 'json',
      timeout: 60000
    });
    return processWechatResponse(response.data);
  },
  async addImageMaterial(image: Buffer, filename: string = 'image.jpg'): Promise<{media_id: string, url: string}> {
    const form = new Formstream();
    form.buffer('media', image, filename);
    return await this._addMaterial(form, 'image');
  },
  async addVoiceMaterial(voice: Buffer, filename: string = 'voice.mp3'): Promise<string> {
    const form = new Formstream();
    form.buffer('media', voice, filename);
    const data = await this._addMaterial(form, 'voice');
    return data.media_id;
  },
  async addVideoMaterial(video: Buffer, title: string, introduction: string, filename: string = 'video.mp4'): Promise<string> {
    const form = new Formstream();
    form.buffer('media', video, filename);
    form.field('description', JSON.stringify({title, introduction}));
    const data = await this._addMaterial(form, 'video');
    return data.media_id;
  },
  async addThumbMaterial(thumb: Buffer, filename: string = 'thumb.jpg'): Promise<string> {
    const form = new Formstream();
    form.buffer('media', thumb, filename);
    const data = await this._addMaterial(form, 'thumb');
    return data.media_id;
  },
  async getMaterial(mediaId: string): Promise<Buffer | {title: string, description: string, down_url: string} | {news_item: Article[]}> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/material/get_material?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        media_id: mediaId
      },
      timeout: 60000
    });
    const contentType = response.res.headers['content-type'];
    if (contentType === 'application/json' || contentType === 'text/plain') {
      return processWechatResponse(JSON.parse(response.data.toString()));
    }
    return response.data;
  },
  async delMaterial(mediaId: string): Promise<void> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/material/del_material?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        media_id: mediaId
      },
      dataType: 'json'
    });
    processWechatResponse(response.data);
  },
  async getMaterialCount(): Promise<{
    voice_count: number,
    video_count: number,
    image_count: number,
    news_count: number
  }> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/material/get_materialcount?access_token=${token.accessToken}`;
    const response = await this.request(url, {dataType: 'json'});
    return processWechatResponse(response.data);
  },
  async batchGetMaterial(type: 'image' | 'video' | 'voice' | 'news', offset: number, count: number): Promise<{
    total_count: number,
    item_count: number,
    item: Array<{
      media_id: string,
      update_time: number,
      content?: {
        news_item: Article[]
      },
      name?: string,
      url?: string
    }>
  }> {
    const token = await this.getLatestAccessToken();
    const url = `${this.endpoint}/cgi-bin/material/batchget_material?access_token=${token.accessToken}`;
    const response = await this.request(url, {
      method: 'POST',
      contentType: 'json',
      data: {
        type,
        offset,
        count
      },
      dataType: 'json'
    });
    return processWechatResponse(response.data);
  }
};
