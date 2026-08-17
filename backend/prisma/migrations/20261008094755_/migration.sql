-- CreateTable
CREATE TABLE "fields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "address" VARCHAR(255),
    "description" VARCHAR(1000),
    "capacity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leagues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1000),
    "season" VARCHAR(50),
    "start_date" DATE,
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_fields" (
    "league_id" UUID NOT NULL,
    "field_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "league_fields_pkey" PRIMARY KEY ("league_id","field_id")
);

-- CreateIndex
CREATE INDEX "fields_name_idx" ON "fields"("name");

-- CreateIndex
CREATE INDEX "fields_is_active_idx" ON "fields"("is_active");

-- CreateIndex
CREATE INDEX "fields_deleted_at_idx" ON "fields"("deleted_at");

-- CreateIndex
CREATE INDEX "leagues_name_idx" ON "leagues"("name");

-- CreateIndex
CREATE INDEX "leagues_season_idx" ON "leagues"("season");

-- CreateIndex
CREATE INDEX "leagues_is_active_idx" ON "leagues"("is_active");

-- CreateIndex
CREATE INDEX "leagues_deleted_at_idx" ON "leagues"("deleted_at");

-- CreateIndex
CREATE INDEX "league_fields_field_id_idx" ON "league_fields"("field_id");

-- CreateIndex
CREATE INDEX "league_fields_league_id_idx" ON "league_fields"("league_id");

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_fields" ADD CONSTRAINT "league_fields_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_fields" ADD CONSTRAINT "league_fields_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
