const fs = require('fs');
const path = require('path');
const util = require('util');
const chai = require('chai');
const urllib = require('urllib');
const wechat = require('../lib/wechat');

const {expect} = chai;
const {WechatApi, AccessToken, Ticket, AuthAccessToken} = wechat;
const api = new WechatApi(process.env.APP_ID, process.env.APP_SECRET);

describe('api', function() {
  this.slow(10000);
  this.timeout(0);
  describe('quota', function() {
    it('#clearQuota', async function() {
      await api.clearQuota();
    });
  });
  describe('common', function() {
    it('#getAccessToken', async function() {
      const token = this.token = await api.getAccessToken();
      expect(token).to.be.an.instanceof(AccessToken);
    });
    it('#getLatestAccessToken', async function() {
      const token = await api.getLatestAccessToken();
      expect(token).to.be.an.instanceof(AccessToken);
      expect(token.toJSON()).to.deep.equal(this.token.toJSON());
    });
  });
  describe('js', function() {
    it('#getTicket', async function() {
      const ticket = this.ticket = await api.getTicket();
      expect(ticket).to.be.an.instanceof(Ticket);
    });
    it('#getLatestTicket', async function() {
      const ticket = await api.getLatestTicket();
      expect(ticket).to.be.an.instanceof(Ticket);
      expect(ticket.toJSON()).to.deep.equal(this.ticket.toJSON());
    });
    it('#getJsConfig', async function() {
      const config = await api.getJsConfig({debug: false, url: 'https://example.com', jsApiList: ['foo', 'bar']});
      expect(config).to.deep.include({debug: false, appId: process.env.APP_ID, jsApiList: ['foo', 'bar']});
      expect(config).to.have.own.property('timestamp');
      expect(config).to.have.own.property('nonceStr');
      expect(config).to.have.own.property('signature');
    });
  });
  describe('menu', function() {
    it('#createMenu', async function() {
      const menu = [
        {type: 'click', name: '事件测试', key: 'CLICK_EVENT'},
        {type: 'view', name: '链接测试', url: 'https://m.baidu.com'},
        {
          name: '组合菜单',
          sub_button: [
            {type: 'view', name: '二级菜单-链接', url: 'https://m.baidu.com'},
            {type: 'click', name: '二级菜单-事件', key: 'SUB_CLICK_EVENT'}
          ]
        }
      ];
      await api.createMenu(menu);
      const menuConfig = await api.getMenuConfig();
      expect(menuConfig).to.deep.equal({
        is_menu_open: 1,
        selfmenu_info: {
          button: [
            {type: 'click', name: '事件测试', key: 'CLICK_EVENT'},
            {type: 'view', name: '链接测试', url: 'https://m.baidu.com'},
            {
              name: '组合菜单',
              sub_button: {
                list: [
                  {type: 'view', name: '二级菜单-链接', url: 'https://m.baidu.com'},
                  {type: 'click', name: '二级菜单-事件', key: 'SUB_CLICK_EVENT'}
                ]
              }
            }
          ]
        }
      });
      const target = {
        menu: {
          button: [
            {type: 'click', name: '事件测试', key: 'CLICK_EVENT', sub_button: []},
            {type: 'view', name: '链接测试', url: 'https://m.baidu.com', sub_button: []},
            {
              name: '组合菜单',
              sub_button: [
                {type: 'view', name: '二级菜单-链接', url: 'https://m.baidu.com', sub_button: []},
                {type: 'click', name: '二级菜单-事件', key: 'SUB_CLICK_EVENT', sub_button: []}
              ]
            }
          ]
        }
      };
      const menu1 = await api.getMenu();
      expect(menu1).to.deep.equal(target);
    });
    it('#removeMenu', async function() {
      await api.removeMenu();
      const menuConfig = await api.getMenuConfig();
      expect(menuConfig).to.deep.equal({
        is_menu_open: 0,
        selfmenu_info: {
          button: [
            {type: 'click', name: '事件测试', key: 'CLICK_EVENT'},
            {type: 'view', name: '链接测试', url: 'https://m.baidu.com'},
            {
              name: '组合菜单',
              sub_button: {
                list: [
                  {type: 'view', name: '二级菜单-链接', url: 'https://m.baidu.com'},
                  {type: 'click', name: '二级菜单-事件', key: 'SUB_CLICK_EVENT'}
                ]
              }
            }
          ]
        }
      });
      try {
        const menu = await api.getMenu();
        throw new Error('not really remove menu');
      } catch (e) {

      }
    });
  });
  describe('ip', function() {
    it('#getIp', async function() {
      const ips = await api.getIp();
      ips.forEach((ip) => {
        expect(ip).to.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/\d{1,2})?$/);
      });
    });
  });
  describe.skip('custom_service', function() {
    it('#getAutoReply', async function() {
      const autoreplay = await api.getAutoReply();
      expect(autoreplay).to.have.property('is_add_friend_reply_open');
      expect(autoreplay).to.have.property('is_autoreply_open');
    });
    it('#addKFAccount', async function() {
      await api.addKFAccount('test@test', 'test');
    });
    it('#getKFList', async function() {
      const kflist = await api.getKFList();
      kflist.forEach((kf) => {
        expect(kf).to.have.property('kf_account');
        expect(kf).to.have.property('kf_nick');
        expect(kf).to.have.property('kf_id');
        expect(kf).to.have.property('kf_headimgurl');
      });
    });
    it('#uploadHeadImg', async function() {
      const avatar = fs.readFileSync(path.resolve(__dirname, 'avatar.jpg'));
      await api.setKFAccountAvatar('test@test', headImg, 'avatar.jpg');
    });
    it('#delKFAccount', async function() {
      await api.delKFAccount('test@test');
    });
  });
  describe('qrcode', function() {
    it('#createQRCode', async function() {
      const ticket = await api.createQRCode(60, 1);
      expect(ticket.ticket).to.be.a('string');
      expect(ticket.expire_seconds).to.be.a('number');
      expect(ticket.url).to.be.a('string');
    });
    it('#createQRCode[limit]', async function() {
      const ticket = await api.createQRCode(0, 1);
      expect(ticket.ticket).to.be.a('string');
      expect(ticket.expire_seconds).to.be.a('undefined');
      expect(ticket.url).to.be.a('string');
    });
    it('#createQRCode[str]', async function() {
      const ticket = await api.createQRCode(60, 'test');
      expect(ticket.ticket).to.be.a('string');
      expect(ticket.expire_seconds).to.be.a('number');
      expect(ticket.url).to.be.a('string');
    });
    it('#createQRCode[limit-str]', async function() {
      const ticket = await api.createQRCode(0, 'test');
      expect(ticket.ticket).to.be.a('string');
      expect(ticket.expire_seconds).to.be.a('undefined');
      expect(ticket.url).to.be.a('string');
    });
  });
  describe('url', function() {
    it('#shortUrl', async function() {
      const shortUrl = await api.shortUrl('https://m.baidu.com');
      expect(shortUrl).to.be.a('string');
    });
  });
  describe('user', function() {
    it('#getFollowers', async function() {
      const result = await api.getFollowers();
      expect(result.total).to.be.a('number');
      expect(result.count).to.be.a('number');
      if (result.count > 0) {
        result.data.openid.forEach((openid) => {
          expect(openid).to.be.a('string');
        });
        expect(result.next_openid).to.be.a('string');
      }
      this.openids = result.data && result.data.openid || [];
    });
    it('#getUser', async function() {
      if (this.openids.length > 0) {
        const userinfo = await api.getUser(this.openids[0]);
        expect(userinfo.subscribe).to.equal(1);
      } else {
        this.skip();
      }
    });
    it('#batchGetUser', async function() {
      if (this.openids.length > 0) {
        const users = await api.batchGetUser(this.openids);
        users.forEach((user) => {
          expect(user.subscribe).to.equal(1);
        });
      } else {
        this.skip();
      }
    });
    it('#updateRemark', async function() {
      if (this.openids.length > 0) {
        await api.updateRemark(this.openids[0], 'test remark');
      } else {
        this.skip();
      }
    });
  });
  describe('material', function() {
    it('#addImageMaterial', async function() {
      const {data: image} = await urllib.request('https://placeimg.com/160/120/any');
      const {media_id, url} = await api.addImageMaterial(image);
      expect(media_id).to.be.a('string');
      expect(url).to.be.a('string');
      this.imageMediaId = media_id;
    });
    it('#addThumbMaterial', async function() {
      const {data: thumb} = await urllib.request('https://placeimg.com/160/120/any');
      const mediaId = await api.addThumbMaterial(thumb);
      expect(mediaId).to.be.a('string');
      this.thumbMediaId = mediaId;
    });
    it('#addNewsMaterial', async function() {
      const mediaId = await api.addNewsMaterial([
        {
          title: '测试图文',
          thumb_media_id: this.thumbMediaId,
          author: 'test',
          digest: 'xxx',
          show_cover_pic: 1,
          content: '<span style="color:red">图文内容</span><span style="color:green">图文内容</span>',
          content_source_url: 'https://m.baidu.com'
        }
      ]);
      expect(mediaId).to.be.a('string');
      this.newsMediaId = mediaId;
    });
    it('#getMaterial', async function() {
      const material = await api.getMaterial(this.newsMediaId);
      expect(material.news_item[0]).to.include({
        title: '测试图文',
        thumb_media_id: this.thumbMediaId,
        author: 'test',
        digest: 'xxx',
        show_cover_pic: 1,
        content: '<span style="color:red">图文内容</span><span style="color:green">图文内容</span>',
        content_source_url: 'https://m.baidu.com'
      });
    });
    it('#getMaterialCount', async function() {
      const count = await api.getMaterialCount();
      this.count = count;
      expect(count.voice_count).to.be.a('number');
      expect(count.video_count).to.be.a('number');
      expect(count.image_count).to.be.a('number');
      expect(count.news_count).to.be.a('number');
    });
    it('#batchGetMaterial', async function() {
      const voiceMaterials = await api.batchGetMaterial('voice', 0, 1);
      expect(voiceMaterials.total_count).to.be.equal(this.count.voice_count);
      const videoMaterials = await api.batchGetMaterial('video', 0, 1);
      expect(videoMaterials.total_count).to.be.equal(this.count.video_count);
      const imageMaterials = await api.batchGetMaterial('image', 0, 1);
      expect(imageMaterials.total_count).to.be.equal(this.count.image_count);
      const newsMaterials = await api.batchGetMaterial('news', 0, 1);
      expect(newsMaterials.total_count).to.be.equal(this.count.news_count);
    });
    it('#delMaterial', async function() {
      if (this.imageMediaId) {
        await api.delMaterial(this.imageMediaId);
      }
      if (this.thumbMediaId) {
        await api.delMaterial(this.thumbMediaId);
      }
      if (this.newsMediaId) {
        await api.delMaterial(this.newsMediaId);
      }
    });
  });
});
