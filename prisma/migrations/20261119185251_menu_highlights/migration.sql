-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "recommended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "specialty" BOOLEAN NOT NULL DEFAULT false;
