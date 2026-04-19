-- AlterTable
ALTER TABLE "ElectronicsItem" ADD COLUMN     "isSmallItem" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Route" ADD COLUMN     "emailSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RouteStop" ADD COLUMN     "isReserve" BOOLEAN NOT NULL DEFAULT false;
