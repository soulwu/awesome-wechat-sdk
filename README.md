# awesome-wechat-sdk

## Features
  - WechatApi - Library to call wechat backend
  - middleware - Koa middleware to process user message and event notification
  - WechatPay - Library to call wxpay api backend

## Document

### Class: WechatApi

#### new WechatApi(appid, appsecret)
  - appid &lt;string&gt; Wechat appid.
  - appsecret &lt;string&gt; Wechat appsecret.

Create an instance of WechatApi.

#### api.setEndpoint(domain)
  - domain &lt;string&gt; Alternative wechat endpoint domain.

Set endpoint to alternative access point. Available value can be `api.weixin.qq.com`|`sh.api.weixin.qq.com`|`sz.api.weixin.qq.com`|`hk.api.weixin.qq.com`.

#### api.setOpts(opts)
  - opts &lt;UrlLibOptions&gt; Options for urllib request.

Set default options for urllib request.

#### api.registerAccessTokenHandler(handler)
  - handler &lt;object&gt;
    - handler.loadAccessToken &lt;Function&gt; The handler for load access token, should return a promise which resolved with an instance of AccessToken.
    - handler.saveAccessToken &lt;Function&gt; The handler for save access token, accept an instance of AccessToken as parameter, should return a promise which resolved with void.

Register custom handler to handle access token. It is useful for a distributed application.

#### api.registerAuthAccessTokenHandler(handler)
  - handler &lt;object&gt;
    - handler.loadAuthAccessToken &lt;Function&gt; The handler for load auth access token, should return a promise which resolved with an instance of [AuthAccessToken](#class-authaccesstoken).
    - handler.saveAuthAccessToken &lt;Function&gt; The handler for save auth access token, accept an instance of [AuthAccessToken](#class-authaccesstoken) as parameter, should return a promise which resolved with void.

Register custom handler to handle auth access token. It is useful for a distributed application.

#### api.getAuthorizeURL(redirect[, state[, scope]])
  - redirect &lt;string&gt; The target redirect uri. It's domain should match the config at wechat admin panel.
  - state &lt;string&gt; The reserved state value which will be send back unchanged at redirect page. Default value is an empty string.
  - scope &lt;string&gt; The auth scope. Available values are `snsapi_base` or `snsapi_userinfo`. Default value is `snsapi_base`
  - Returns: &lt;string&gt;

Get the well-formatted url for oauth.

#### api.getAuthUser(openid[, lang])
  - openid &lt;string&gt;
  - lang &lt;string&gt;
  - Returns: &lt;Promise&gt;

#### api.getAuthUserByCode(code[, lang])
  - code &lt;string&gt;
  - lang &lt;string&gt;
  - Returns: &lt;Promise&gt;

### Class: AccessToken

#### new AccessToken(token)
  - token &lt;object&gt;
    - token.accessToken &lt;string&gt; The value of access token.
    - token.expireTime &lt;number&gt; The expire timestamp of access token.

#### token.isValid()
  - Returns: &lt;boolean&gt;

Determine whether the token is valid or not.

#### token.toJSON()
  - Returns: &lt;object&gt;

Valid for JSON stringify.

### Class: AuthAccessToken

#### new AuthAccessToken(token)
  - token &lt;object&gt;
    - token.accessToken &lt;string&gt; The value of auth access token.
    - token.expireTime &lt;number&gt; The expire timestamp of auth access token.
    - token.refreshToken &lt;string&gt; The value of auth refresh token.
    - token.openid &lt;string&gt; The openid of user.
    - token.scope &lt;string&gt; The scope of auth access token.

#### token.isValid()
  - Returns: &lt;boolean&gt;

#### token.toJSON()
  - Returns: &lt;object&gt;




