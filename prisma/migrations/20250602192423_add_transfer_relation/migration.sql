-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_transferToId_fkey" FOREIGN KEY ("transferToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
