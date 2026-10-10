-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "actor_role" TEXT,
ADD COLUMN     "details" JSONB;
