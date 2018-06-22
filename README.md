# awesome-wechat-sdk

## Features
  - [WechatApi](#class-wechatapi) - Library to call wechat backend
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

Register custom handler to handle access token. It is useful for a distributed application.

#### api.registerAuthAccessTokenHandler(handler)
  - handler <object>
    - handler.loadAuthAccessToken <Function> The handler for load auth access token, should return a promise which resolved with an instance of [AuthAccessToken](#class-authaccesstoken).
    - handler.saveAuthAccessToken <Function> The handler for save auth access token, accept an instance of [AuthAccessToken](#class-authaccesstoken) as parameter, should return a promise which resolved with void.

Register custom handler to handle auth access token. It is useful for a distributed application.

#### api.getAuthorizeURL(redirect[, state[, scope]])
  - redirect <string> The target redirect uri. It's domain should match the config at wechat admin panel.
  - state <string> The reserved state value which will be send back unchanged at redirect page. Default value is an empty string.
  - scope <string> The auth scope. Available values are `snsapi_base` or `snsapi_userinfo`. Default value is `snsapi_base`
  - Returns: <string>

Get the well-formatted url for oauth.

#### api.getAuthUser(openid[, lang])
  - openid <string>
  - lang <string>
  - Returns: <Promise>

#### api.getAuthUserByCode(code[, lang])
  - code <string>
  - lang <string>
  - Returns: <Promise>

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

### Class: AuthAccessToken

#### new AuthAccessToken(token)
  - token <object>
    - token.accessToken <string> The value of auth access token.
    - token.expireTime <number> The expire timestamp of auth access token.
    - token.refreshToken <string> The value of auth refresh token.
    - token.openid <string> The openid of user.
    - token.scope <string> The scope of auth access token.

#### token.isValid()
  - Returns: <boolean>

#### token.toJSON()
  - Returns: <object>




