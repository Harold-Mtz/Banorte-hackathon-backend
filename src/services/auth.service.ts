import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { LoginDTO } from '../dtos/login.dto';
import { UserRepository } from '../repositories/user.repository';

interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: jwt.SignOptions['expiresIn'];
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export class AuthService {
  private readonly config: AuthConfig;

  constructor(
    private readonly userRepository: UserRepository
  ) {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET no está definida en el archivo .env');
    }

    this.config = {
      jwtSecret,
      jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '1d') as jwt.SignOptions['expiresIn']
    };
  }

  async register(name: string, email: string, password: string): Promise<LoginResult> {
    await this.userRepository.create(name, email, await bcrypt.hash(password, 12));
    return this.login({ email, password });
  }

  async login({ email, password }: LoginDTO): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email
      },
      this.config.jwtSecret,
      { expiresIn: this.config.jwtExpiresIn }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    };
  }
}
