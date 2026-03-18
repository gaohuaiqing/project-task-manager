/**
 * cookie-parser 类型定义
 * 用于替代 npm install @types/cookie-parser
 */

declare module 'cookie-parser' {
  import { RequestHandler } from 'express';

  interface CookieParseOptions {
    decode?: (str: string) => string;
  }

  interface SignedCookie {
    [key: string]: string | undefined;
  }

  namespace Express {
    interface Request {
      cookies?: { [key: string]: string };
      signedCookies?: SignedCookie;
      secret?: string | string[];
    }
  }

  function cookieParser(secret?: string | string[], options?: CookieParseOptions): RequestHandler;
  function cookieParser(options?: CookieParseOptions): RequestHandler;

  export = cookieParser;
}
