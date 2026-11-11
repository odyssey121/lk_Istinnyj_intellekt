CREATE TABLE "ImportLog" (
 "id" SERIAL NOT NULL,
 "runId" TEXT NOT NULL,
 "attempt" INTEGER NOT NULL,
 "redirect" INTEGER NOT NULL DEFAULT 0,
 "branchId" INTEGER NOT NULL,
 "branchName" TEXT NOT NULL,
 "initiatedBy" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "finishedAt" TIMESTAMP(3),
 "durationMs" INTEGER,
 "method" "ImportMethod" NOT NULL,
 "url" TEXT NOT NULL,
 "requestHeaders" JSONB NOT NULL,
 "requestBody" TEXT,
 "responseStatus" INTEGER,
 "responseHeaders" JSONB,
 "responseBody" TEXT,
 "error" TEXT,
 CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ImportLog_createdAt_id_idx" ON "ImportLog"("createdAt", "id");
CREATE INDEX "ImportLog_runId_idx" ON "ImportLog"("runId");
