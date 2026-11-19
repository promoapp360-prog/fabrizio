-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "description" TEXT,
ADD COLUMN     "images" TEXT[];

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "ageing" TEXT,
ADD COLUMN     "breedName" TEXT,
ADD COLUMN     "cookingNotes" TEXT,
ADD COLUMN     "cutName" TEXT,
ADD COLUMN     "farming" TEXT,
ADD COLUMN     "meatCharacteristics" TEXT,
ADD COLUMN     "pricePending" BOOLEAN NOT NULL DEFAULT false;
