CREATE TABLE "PaymentIntent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "razorpayOrderId" TEXT NOT NULL,
  "customerNameEncrypted" TEXT NOT NULL,
  "customerEmailEncrypted" TEXT,
  "customerPhoneEncrypted" TEXT NOT NULL,
  "customerPhoneHash" TEXT NOT NULL,
  "fulfillmentType" TEXT NOT NULL,
  "fulfillmentData" TEXT NOT NULL,
  "itemsJson" TEXT NOT NULL,
  "subtotal" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" TEXT NOT NULL DEFAULT 'CREATED',
  "razorpayPaymentId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentIntent_razorpayOrderId_key" ON "PaymentIntent"("razorpayOrderId");
CREATE UNIQUE INDEX "PaymentIntent_razorpayPaymentId_key" ON "PaymentIntent"("razorpayPaymentId");
CREATE INDEX "PaymentIntent_status_createdAt_idx" ON "PaymentIntent"("status", "createdAt");
CREATE INDEX "PaymentIntent_customerPhoneHash_idx" ON "PaymentIntent"("customerPhoneHash");
