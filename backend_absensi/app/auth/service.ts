import { LoginInput, RegisterInput, User } from "./model";
import { prisma } from "../src/index";
import bcrypt from 'bcryptjs';

export class AuthService {
    async register(data: RegisterInput) {
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email}
        });

        if (existingUser) {
            throw new Error("User already exists");
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                nama_lengkap: data.nama_lengkap,
                role: "USER",
                photo: data.photo || "default.jpg"
            }
        });

        return {
            user: this.sanitizeUser(user)
        }
    }

   
  async login(data: LoginInput) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(data.password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    return {
      user: this.sanitizeUser(user)
    };
  }

  async refreshToken(userId: number, refreshToken: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.refreshToken !== refreshToken) {
      throw new Error('Invalid refresh token');
    }

    return { userId: user.id, email: user.email, role: user.role };
  }

  async logout(userId: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null }
    });
  }

  async getUserById(id: number): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id }
    });
    return user ? this.sanitizeUser(user) : null;
  }

  private sanitizeUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      nama_lengkap: user.nama_lengkap,
      role: user.role,
      photo: user.photo
    };
  }
}