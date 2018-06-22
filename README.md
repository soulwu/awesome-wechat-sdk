# awesome-wechat-sdk

## Features
  - WechatApi - Library to call wechat backend
  - middleware - Koa middleware to process user message and event notification
  - WechatPay - Library to call wxpay api backend
  
## Document

### Class: WechatApi

#### new WechatApi(appid, appsecret)
  - appid <string> Wechat appid.
  - appsecret <string> Wechat appsecret.

Create an instance of WechatApi.

#### api.setEndpoint(domain)
  - domain <string> Alternative wechat endpoint domain.

Set endpoint to alternative access point. Available value can be `api.weixin.qq.com`|`sh.api.weixin.qq.com`|`sz.api.weixin.qq.com`|`hk.api.weixin.qq.com`.

#### api.setOpts(opts)
  - opts <UrlLibOptions> Options for urllib request.

Set default options for urllib request.

#### api.registerAccessTokenHandler(handler)
  - handler <object>
    - handler.loadAccessToken <Function> The handler for load access token, should return a promise which resolved with an instance of [AccessToken](#class-accesstoken).
    - handler.saveAccessToken <Function> The handler for save access token, accept an instance of [AccessToken](#class-accesstoken) as parameter, should return a promise which resolved with void.

Register custom handler to handle access token. It is useful in a distributed application.

#### api.registerAuthAccessTokenHandler(handler)

### Class: AccessToken

#### new AccessToken(token)
  - token <object>
    - token.accessToken <string> The value of access token.
    - token.expireTime <number> The expire timestamp of access token.

#### token.isValid()
  - Returns: <boolean>

Determine whether the token is valid or not.

#### token.toJSON()
  - Returns: <object>

Valid for JSON stringify.

