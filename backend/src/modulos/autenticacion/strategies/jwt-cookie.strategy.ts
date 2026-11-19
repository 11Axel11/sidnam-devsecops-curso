import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../auth-cookies';

@Injectable()
export class JwtCookieStrategy extends PassportStrategy(Strategy, 'jwt', true) {
  constructor() {
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.[ACCESS_TOKEN_COOKIE],
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
      passReqToCallback: true,
    };

    super(options);
  }

  async validate(req: Request, payload: any) {
    
    return payload;
  }
}
