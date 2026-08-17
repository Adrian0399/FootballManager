-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('PLAYER', 'DT', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "FieldPosition" AS ENUM ('GK', 'DEF', 'MID', 'FWD', 'FIXO', 'ALA', 'PIVOT');

-- CreateEnum
CREATE TYPE "LeagueFormat" AS ENUM ('ONE_V_ONE', 'THREE_V_THREE', 'FIVE_V_FIVE', 'SIX_V_SIX', 'SEVEN_V_SEVEN', 'NINE_V_NINE', 'ELEVEN_V_ELEVEN');

-- CreateEnum
CREATE TYPE "LeagueType" AS ENUM ('ROUND_ROBIN', 'GROUPS_KNOCKOUT', 'KNOCKOUT_ONLY');

-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT');

-- CreateEnum
CREATE TYPE "LeagueStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchdayStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('GOAL', 'ASSIST', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'MVP', 'NOTE');

-- CreateEnum
CREATE TYPE "ScoringMode" AS ENUM ('LIVE', 'POST_MATCH');

-- CreateEnum
CREATE TYPE "KnockoutStage" AS ENUM ('ROUND_OF_16', 'QUARTERS', 'SEMIS', 'FINAL', 'THIRD_PLACE');

-- AlterTable
ALTER TABLE "leagues" ADD COLUMN     "category" VARCHAR(50),
ADD COLUMN     "day_of_week" "WeekDay",
ADD COLUMN     "format" "LeagueFormat",
ADD COLUMN     "home_and_away" BOOLEAN,
ADD COLUMN     "matchdays" INTEGER,
ADD COLUMN     "max_teams" INTEGER,
ADD COLUMN     "status" "LeagueStatus",
ADD COLUMN     "time_slot" "TimeSlot",
ADD COLUMN     "type" "LeagueType";

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "shortName" VARCHAR(10) NOT NULL,
    "emoji" VARCHAR(10),
    "primary_color" VARCHAR(20) NOT NULL,
    "secondary_color" VARCHAR(20) NOT NULL,
    "home_field_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "current_league_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "membership_role" "TeamRole" NOT NULL,
    "jersey_number" INTEGER,
    "position" "FieldPosition",
    "is_captain" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_teams" (
    "league_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "seed" INTEGER NOT NULL,
    "group_label" VARCHAR(5),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "league_teams_pkey" PRIMARY KEY ("league_id","team_id")
);

-- CreateTable
CREATE TABLE "matchdays" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "league_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "status" "MatchdayStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "matchdays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "league_id" UUID NOT NULL,
    "matchday_id" UUID NOT NULL,
    "home_team_id" UUID NOT NULL,
    "away_team_id" UUID NOT NULL,
    "field_id" UUID,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "home_score" INTEGER,
    "away_score" INTEGER,
    "referee_id" UUID,
    "mvp_user_id" UUID,
    "scoring_mode" "ScoringMode",
    "notes" TEXT,
    "knockout_stage" "KnockoutStage",
    "knockout_position" INTEGER,
    "knockout_feeds_into_match_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "match_id" UUID NOT NULL,
    "minute" INTEGER NOT NULL,
    "type" "EventType" NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "secondary_user_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teams_name_idx" ON "teams"("name");

-- CreateIndex
CREATE INDEX "teams_home_field_id_idx" ON "teams"("home_field_id");

-- CreateIndex
CREATE INDEX "teams_current_league_id_idx" ON "teams"("current_league_id");

-- CreateIndex
CREATE INDEX "teams_is_active_idx" ON "teams"("is_active");

-- CreateIndex
CREATE INDEX "teams_deleted_at_idx" ON "teams"("deleted_at");

-- CreateIndex
CREATE INDEX "team_memberships_user_id_idx" ON "team_memberships"("user_id");

-- CreateIndex
CREATE INDEX "team_memberships_membership_role_idx" ON "team_memberships"("membership_role");

-- CreateIndex
CREATE INDEX "team_memberships_is_captain_idx" ON "team_memberships"("is_captain");

-- CreateIndex
CREATE UNIQUE INDEX "team_memberships_team_id_user_id_key" ON "team_memberships"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "league_teams_team_id_idx" ON "league_teams"("team_id");

-- CreateIndex
CREATE INDEX "league_teams_seed_idx" ON "league_teams"("seed");

-- CreateIndex
CREATE INDEX "matchdays_league_id_idx" ON "matchdays"("league_id");

-- CreateIndex
CREATE INDEX "matchdays_date_idx" ON "matchdays"("date");

-- CreateIndex
CREATE UNIQUE INDEX "matchdays_league_id_number_key" ON "matchdays"("league_id", "number");

-- CreateIndex
CREATE INDEX "matches_league_id_matchday_id_idx" ON "matches"("league_id", "matchday_id");

-- CreateIndex
CREATE INDEX "matches_home_team_id_idx" ON "matches"("home_team_id");

-- CreateIndex
CREATE INDEX "matches_away_team_id_idx" ON "matches"("away_team_id");

-- CreateIndex
CREATE INDEX "matches_field_id_idx" ON "matches"("field_id");

-- CreateIndex
CREATE INDEX "matches_referee_id_idx" ON "matches"("referee_id");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE INDEX "matches_scheduled_at_idx" ON "matches"("scheduled_at");

-- CreateIndex
CREATE INDEX "matches_knockout_stage_idx" ON "matches"("knockout_stage");

-- CreateIndex
CREATE INDEX "match_events_match_id_idx" ON "match_events"("match_id");

-- CreateIndex
CREATE INDEX "match_events_user_id_idx" ON "match_events"("user_id");

-- CreateIndex
CREATE INDEX "match_events_team_id_idx" ON "match_events"("team_id");

-- CreateIndex
CREATE INDEX "match_events_type_idx" ON "match_events"("type");

-- CreateIndex
CREATE INDEX "match_events_minute_idx" ON "match_events"("minute");

-- CreateIndex
CREATE INDEX "leagues_format_idx" ON "leagues"("format");

-- CreateIndex
CREATE INDEX "leagues_status_idx" ON "leagues"("status");

-- CreateIndex
CREATE INDEX "leagues_matchdays_idx" ON "leagues"("matchdays");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_home_field_id_fkey" FOREIGN KEY ("home_field_id") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_current_league_id_fkey" FOREIGN KEY ("current_league_id") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_teams" ADD CONSTRAINT "league_teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_teams" ADD CONSTRAINT "league_teams_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_teams" ADD CONSTRAINT "league_teams_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_teams" ADD CONSTRAINT "league_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchdays" ADD CONSTRAINT "matchdays_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchdays" ADD CONSTRAINT "matchdays_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchdays" ADD CONSTRAINT "matchdays_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_matchday_id_fkey" FOREIGN KEY ("matchday_id") REFERENCES "matchdays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_mvp_user_id_fkey" FOREIGN KEY ("mvp_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_knockout_feeds_into_match_id_fkey" FOREIGN KEY ("knockout_feeds_into_match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_secondary_user_id_fkey" FOREIGN KEY ("secondary_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
