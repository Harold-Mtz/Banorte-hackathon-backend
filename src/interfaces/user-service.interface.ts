import { User } from '../models/user.model';

export interface IUserService {
  getById(id: string): Promise<User | null>;
}