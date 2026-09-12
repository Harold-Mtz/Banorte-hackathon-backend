import { IUserService } from '../interfaces/user-service.interface';
import { User } from '../models/user.model';
import { UserRepository } from '../repositories/user.repository';

export class UserService implements IUserService {
  constructor(
    private readonly userRepository: UserRepository
  ) {}

  async getById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
}