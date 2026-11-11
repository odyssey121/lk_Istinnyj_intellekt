-- Preserve existing rows and references while replacing text identifiers.
BEGIN;

CREATE TEMP TABLE id_mapping (
  entity TEXT NOT NULL,
  old_id TEXT NOT NULL,
  new_id INTEGER NOT NULL,
  PRIMARY KEY (entity, old_id),
  UNIQUE (entity, new_id)
) ON COMMIT DROP;

-- Reserve stable numeric identifiers for the existing demo fixtures.
INSERT INTO id_mapping
SELECT 'Company', "id", CASE "id"
  WHEN 'company-1' THEN 1 WHEN 'company-2' THEN 2
  ELSE 2 + row_number() OVER (ORDER BY "id")::INTEGER END FROM "Company";
INSERT INTO id_mapping
SELECT 'User', "id", CASE "id"
  WHEN 'admin' THEN 1 WHEN 'client-1' THEN 2 WHEN 'client-2' THEN 3
  ELSE 3 + row_number() OVER (ORDER BY "id")::INTEGER END FROM "User";
INSERT INTO id_mapping
SELECT 'Branch', "id", CASE "id"
  WHEN 'branch-1' THEN 1 WHEN 'branch-2' THEN 2
  WHEN 'branch-3' THEN 3 WHEN 'branch-4' THEN 4
  ELSE 4 + row_number() OVER (ORDER BY "id")::INTEGER END FROM "Branch";
INSERT INTO id_mapping
SELECT 'Review', "id", CASE
  WHEN "id" ~ '^review-[0-3]-([0-9]|1[0-7])$'
    THEN split_part("id", '-', 2)::INTEGER * 18
      + split_part("id", '-', 3)::INTEGER + 1
  ELSE 72 + row_number() OVER (ORDER BY "id")::INTEGER END FROM "Review";

CREATE FUNCTION pg_temp.mapped_id(entity_name TEXT, old_value TEXT)
RETURNS INTEGER LANGUAGE SQL STABLE STRICT AS $$
  SELECT new_id FROM id_mapping WHERE entity = entity_name AND old_id = old_value
$$;

ALTER TABLE "User" DROP CONSTRAINT "User_companyId_fkey";
ALTER TABLE "Branch" DROP CONSTRAINT "Branch_companyId_fkey";
ALTER TABLE "DailyMetric" DROP CONSTRAINT "DailyMetric_branchId_fkey";
ALTER TABLE "Review" DROP CONSTRAINT "Review_branchId_fkey";

ALTER TABLE "Company" ALTER COLUMN "id" TYPE INTEGER USING pg_temp.mapped_id('Company', "id");
ALTER TABLE "User"
  ALTER COLUMN "id" TYPE INTEGER USING pg_temp.mapped_id('User', "id"),
  ALTER COLUMN "companyId" TYPE INTEGER USING pg_temp.mapped_id('Company', "companyId");
ALTER TABLE "Branch"
  ALTER COLUMN "id" TYPE INTEGER USING pg_temp.mapped_id('Branch', "id"),
  ALTER COLUMN "companyId" TYPE INTEGER USING pg_temp.mapped_id('Company', "companyId");
ALTER TABLE "DailyMetric" ALTER COLUMN "branchId" TYPE INTEGER USING pg_temp.mapped_id('Branch', "branchId");
ALTER TABLE "Review"
  ALTER COLUMN "id" TYPE INTEGER USING pg_temp.mapped_id('Review', "id"),
  ALTER COLUMN "branchId" TYPE INTEGER USING pg_temp.mapped_id('Branch', "branchId");

CREATE SEQUENCE "Company_id_seq" OWNED BY "Company"."id";
CREATE SEQUENCE "User_id_seq" OWNED BY "User"."id";
CREATE SEQUENCE "Branch_id_seq" OWNED BY "Branch"."id";
CREATE SEQUENCE "Review_id_seq" OWNED BY "Review"."id";
ALTER TABLE "Company" ALTER COLUMN "id" SET DEFAULT nextval('"Company_id_seq"');
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT nextval('"User_id_seq"');
ALTER TABLE "Branch" ALTER COLUMN "id" SET DEFAULT nextval('"Branch_id_seq"');
ALTER TABLE "Review" ALTER COLUMN "id" SET DEFAULT nextval('"Review_id_seq"');

SELECT setval('"Company_id_seq"', COALESCE(MAX("id"), 1), COUNT(*) > 0) FROM "Company";
SELECT setval('"User_id_seq"', COALESCE(MAX("id"), 1), COUNT(*) > 0) FROM "User";
SELECT setval('"Branch_id_seq"', COALESCE(MAX("id"), 1), COUNT(*) > 0) FROM "Branch";
SELECT setval('"Review_id_seq"', COALESCE(MAX("id"), 1), COUNT(*) > 0) FROM "Review";

ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
