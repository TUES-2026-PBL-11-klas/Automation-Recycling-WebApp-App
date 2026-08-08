import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { getJwtSecret } from './jwt-secret';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const cookies = req?.cookies as Record<string, string> | undefined;
          return cookies?.['access_token'] ?? null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
      passReqToCallback: false,
    });
  }

  validate(payload: JwtPayload): {
    userId: string;
    email: string;
    role: string;
  } {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
