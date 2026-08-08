-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE INDEX "Address_districtId_idx" ON "Address"("districtId");

-- CreateIndex
CREATE INDEX "AvailabilityPreference_requestId_idx" ON "AvailabilityPreference"("requestId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_requestId_idx" ON "AvailabilitySlot"("requestId");

-- CreateIndex
CREATE INDEX "Notification_status_scheduledFor_idx" ON "Notification"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "PickupRequest_status_routeId_idx" ON "PickupRequest"("status", "routeId");

-- CreateIndex
CREATE INDEX "PickupRequest_userId_idx" ON "PickupRequest"("userId");

-- CreateIndex
CREATE INDEX "PickupRequest_addressId_idx" ON "PickupRequest"("addressId");

-- CreateIndex
CREATE INDEX "PickupRequest_routeId_idx" ON "PickupRequest"("routeId");

-- CreateIndex
CREATE INDEX "RequestItem_requestId_idx" ON "RequestItem"("requestId");

-- CreateIndex
CREATE INDEX "RequestItem_electronicsItemId_idx" ON "RequestItem"("electronicsItemId");

-- CreateIndex
CREATE INDEX "Route_districtId_status_idx" ON "Route"("districtId", "status");

-- CreateIndex
CREATE INDEX "Route_emailSentAt_idx" ON "Route"("emailSentAt");

-- CreateIndex
CREATE INDEX "RouteStop_routeId_idx" ON "RouteStop"("routeId");

-- CreateIndex
CREATE INDEX "RouteStop_requestId_idx" ON "RouteStop"("requestId");

-- CreateIndex
CREATE INDEX "RouteStop_isReserve_idx" ON "RouteStop"("isReserve");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");
