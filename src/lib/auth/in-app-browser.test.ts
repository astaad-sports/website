import { describe, expect, test } from "bun:test";

import { inAppBrowser } from "./in-app-browser";

const UA = {
  instagramIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 389.0.0.28.110 (iPhone15,2; iOS 18_5; en_IN; en-IN; scale=3.00; 1179x2556; 752375217; IABMV/1)",
  instagramAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.127 Mobile Safari/537.36 Instagram 347.0.0.36.89 Android (34/14; 480dpi; 1080x2340; samsung; SM-S918B; dm3q; qcom; en_IN; 634108168)",
  facebookIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/475.0.0.37.108;FBBV/640000000;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.6;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/477.0.0.49.74;]",
  otherWebView:
    "Mozilla/5.0 (Linux; Android 12; RMX3371 Build/SKQ1.211019.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
  safariIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  chromeDesktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
};

describe("inAppBrowser", () => {
  test("names Instagram and Facebook on both phones", () => {
    expect(inAppBrowser(UA.instagramIos)).toEqual({ app: "Instagram" });
    expect(inAppBrowser(UA.instagramAndroid)).toEqual({ app: "Instagram" });
    expect(inAppBrowser(UA.facebookIos)).toEqual({ app: "Facebook" });
    expect(inAppBrowser(UA.facebookAndroid)).toEqual({ app: "Facebook" });
  });

  test("an unnamed Android web view is still an in-app browser", () => {
    expect(inAppBrowser(UA.otherWebView)).toEqual({ app: null });
  });

  test("regular browsers are not", () => {
    expect(inAppBrowser(UA.chromeAndroid)).toBeNull();
    expect(inAppBrowser(UA.safariIos)).toBeNull();
    expect(inAppBrowser(UA.chromeDesktop)).toBeNull();
    expect(inAppBrowser(null)).toBeNull();
    expect(inAppBrowser("")).toBeNull();
  });
});
