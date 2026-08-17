-- CreateEnum
CREATE TYPE "AwardCategory" AS ENUM ('SCORER', 'MVP', 'FAIR_PLAY', 'CHAMPION', 'BEST_DEFENSE');

-- CreateEnum
CREATE TYPE "AwardLevel" AS ENUM ('GOLD', 'SILVER', 'BRONZE');

-- CreateTable
CREATE TABLE "awards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "league_id" UUID,
    "team_id" UUID,
    "category" "AwardCategory" NOT NULL,
    "level" "AwardLevel" NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "awarded_at" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "awards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "awards_user_id_idx" ON "awards"("user_id");

-- CreateIndex
CREATE INDEX "awards_league_id_idx" ON "awards"("league_id");

-- CreateIndex
CREATE INDEX "awards_team_id_idx" ON "awards"("team_id");

-- CreateIndex
CREATE INDEX "awards_category_idx" ON "awards"("category");

-- CreateIndex
CREATE INDEX "awards_level_idx" ON "awards"("level");

-- CreateIndex
CREATE INDEX "awards_deleted_at_idx" ON "awards"("deleted_at");

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
