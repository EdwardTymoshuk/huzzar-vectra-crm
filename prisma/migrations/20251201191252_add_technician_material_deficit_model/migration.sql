-- CreateTable
CREATE TABLE "TechnicianMaterialDeficit" (
    "id" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "materialDefinitionId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicianMaterialDeficit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TechnicianMaterialDeficit_technicianId_materialDefinitionId_key" ON "TechnicianMaterialDeficit"("technicianId", "materialDefinitionId");

-- AddForeignKey
ALTER TABLE "TechnicianMaterialDeficit" ADD CONSTRAINT "TechnicianMaterialDeficit_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianMaterialDeficit" ADD CONSTRAINT "TechnicianMaterialDeficit_materialDefinitionId_fkey" FOREIGN KEY ("materialDefinitionId") REFERENCES "MaterialDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
