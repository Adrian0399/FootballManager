import type { User } from '@prisma/client';
import { env } from '../../config/env.js';
import { calculateAge } from './age.util.js';

export type PublicUser = Omit<User, 'passwordHash' | 'profilePhotoPath' | 'coverPhotoPath'> & {
  profilePhotoUrl: string | null;
  coverPhotoUrl: string | null;
};

export function publicUrlFor(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  return `${env.PUBLIC_BASE_URL}/uploads/${relativePath}`;
}

export function toPublicUser(user: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, profilePhotoPath, coverPhotoPath, ...rest } = user;
  return {
    ...rest,
    profilePhotoUrl: publicUrlFor(profilePhotoPath),
    coverPhotoUrl: publicUrlFor(coverPhotoPath),
  };
}

export function toPublicUserWithAge(user: User): PublicUser {
  return { ...toPublicUser(user), age: calculateAge(user.birthDate) };
}