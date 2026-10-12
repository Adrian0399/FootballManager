import type { User } from '@prisma/client';
import { prisma } from '../../shared/prisma/prisma.client.js';
import { ApiError } from '../../shared/errors/api-error.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} from '../../shared/utils/jwt.util.js';
import { hashPassword, verifyPassword } from '../../shared/utils/password.util.js';
import { calculateAge } from '../../shared/utils/age.util.js';
import { toPublicUserWithAge, type PublicUser } from '../../shared/utils/user.util.js';
import type { RegisterDto, LoginDto } from './auth.validation.js';
import { invitesService } from '../invites/invites.service.js';
import type { TeamRole, UserRole } from '@prisma/client';

/** Maps a team-level role (from an invite) to the global user role. */
function userRoleFromTeamRole(role: TeamRole): UserRole {
  switch (role) {
    case 'DT':
      return 'TECHNICAL_DIRECTOR';
    case 'ASSISTANT':
      return 'ASSISTANT';
    case 'PLAYER':
      return 'PLAYER';
  }
}

export type { PublicUser };

export interface AuthSuccess {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

function buildAccessToken(user: User): string {
  return signAccessToken({ sub: user.id, email: user.email, role: user.role });
}

async function issueTokens(user: User): Promise<AuthSuccess> {
  const { token, hash } = generateRefreshToken();
  const expiresAt = refreshTokenExpiry();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt,
      createdById: user.id,
      updatedById: user.id,
    },
  });

  return {
    user: toPublicUserWithAge(user),
    accessToken: buildAccessToken(user),
    refreshToken: token,
  };
}

export const authService = {
  async register(dto: RegisterDto, creatorId?: string): Promise<AuthSuccess> {
    const existingEmail = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existingEmail) throw ApiError.conflict('Email already registered', 'EMAIL_TAKEN');

    const existingCurp = await prisma.user.findUnique({ where: { curp: dto.curp } });
    if (existingCurp) throw ApiError.conflict('CURP already registered', 'CURP_TAKEN');

    const passwordHash = await hashPassword(dto.password);

    // Invitation flow: resolve the token up front (validates it's fresh and
    // unused), lock the role to the invite's, and later attach the
    // TeamMembership. The user is created first so we have the id to
    // consume the invite.
    let invite: { teamId: string; role: TeamRole } | null = null;
    if (dto.inviteToken) {
      const resolved = await invitesService.resolve(dto.inviteToken);
      invite = { teamId: resolved.team.id, role: resolved.role };
    }

    const role = invite ? userRoleFromTeamRole(invite.role) : creatorId ? dto.role : 'PLAYER';

    const user = await prisma.user.create({
      data: {
        firstName: dto.firstName,
        paternalSurname: dto.paternalSurname,
        maternalSurname: dto.maternalSurname,
        birthDate: dto.birthDate,
        age: calculateAge(dto.birthDate),
        // Invites lock the role; public self-registration is always PLAYER;
        // an ADMIN provisioning an account (users.controller) may set any role.
        role,
        nickname: dto.nickname,
        phoneNumber: dto.phoneNumber,
        email: dto.email,
        curp: dto.curp,
        passwordHash,
        createdById: creatorId ?? null,
        updatedById: creatorId ?? null,
      },
    });

    // Attach the membership and mark the invite used in one transaction.
    if (invite) {
      await prisma.$transaction([
        prisma.teamMembership.create({
          data: {
            teamId: invite.teamId,
            userId: user.id,
            membershipRole: invite.role,
            createdById: user.id,
            updatedById: user.id,
          },
        }),
        prisma.teamInvite.update({
          where: { token: dto.inviteToken! },
          data: { usedAt: new Date(), usedById: user.id },
        }),
      ]);
    }

    return issueTokens(user);
  },

  async login(dto: LoginDto): Promise<AuthSuccess> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive || user.deletedAt) {
      throw ApiError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
    }
    const ok = await verifyPassword(dto.password, user.passwordHash);
    if (!ok) throw ApiError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');

    return issueTokens(user);
  },

  async refresh(refreshToken: string): Promise<AuthSuccess> {
    const tokenHash = hashRefreshToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH');
    }

    // Replay protection: a revoked token was reused → force-logout that user.
    if (stored.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date(), updatedById: stored.userId },
      });
      throw ApiError.unauthorized('Refresh token reuse detected. Please log in again.', 'REFRESH_REUSE');
    }

    if (stored.expiresAt < new Date()) {
      throw ApiError.unauthorized('Refresh token expired', 'REFRESH_EXPIRED');
    }

    const user = stored.user;
    if (!user.isActive || user.deletedAt) {
      throw ApiError.unauthorized('User inactive', 'USER_INACTIVE');
    }

    // Rotate
    const { token: newRefreshToken, hash: newHash } = generateRefreshToken();
    const expiresAt = refreshTokenExpiry();
    const newRecord = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newHash,
        expiresAt,
        createdById: user.id,
        updatedById: user.id,
      },
    });

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: {
        revokedAt: new Date(),
        replacedBy: newRecord.id,
        updatedById: user.id,
      },
    });

    return {
      user: toPublicUserWithAge(user),
      accessToken: buildAccessToken(user),
      refreshToken: newRefreshToken,
    };
  },

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const tokenHash = hashRefreshToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};