const expect = require('chai').expect;
const wechat = require('../lib/wechat');
const {WechatApi, AccessToken, Ticket, AuthAccessToken} = wechat;

const api = new WechatApi(process.env.APP_ID, process.env.APP_SECRET);

describe('api', function() {
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
      const ret = await api.createMenu(menu);
      expect(ret).to.include({errcode: 0});
    });
    it('#getMenu', async function() {
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
      const menu = await api.getMenu();
      expect(menu).to.deep.equal(target);
    });
  });
});
