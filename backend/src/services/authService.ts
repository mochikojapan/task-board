import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { userRepository } from '../repositories/userRepository.js';
import { Errors } from '../utils/errors.js';

export interface AuthTokenPayload {
  sub: number;
  email: string;
}

export const authService = {
  async login(email: string, password: string) {
    const user = userRepository.findByEmail(email);
    if (!user) throw Errors.invalidCredentials();

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw Errors.invalidCredentials();

    const payload: AuthTokenPayload = { sub: user.id, email: user.email };
    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    } as jwt.SignOptions);

    return { token, user: { id: user.id, email: user.email } };
  },

  verify(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
    } catch {
      throw Errors.unauthorized('Invalid or expired token');
    }
  },

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  },
};
