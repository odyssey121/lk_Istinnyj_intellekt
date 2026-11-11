CREATE TYPE "ImportMethod" AS ENUM ('GET', 'POST');
CREATE TABLE "ImportSettings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "method" "ImportMethod" NOT NULL DEFAULT 'GET',
    CONSTRAINT "ImportSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ImportSettings_key_key" ON "ImportSettings"("key");
