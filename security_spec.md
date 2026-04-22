# Firebase Security Specification - CarpoolConnect

## Data Invariants
1. **Identity Integrity**: Every document representing user action must have an `ownerId` or `userId` field matching the authenticated user.
2. **Relational Consistency**: Bookings must belong to a valid trip.
3. **Role Enforcement**: Only users with the `driver` role can create documents in the `trips` collection.
4. **Immutability**: `createdAt` and `ownerId` fields must never change after creation.
5. **Seat Validation**: `availableSeats` on a trip cannot be negative.

## The Dirty Dozen (Attack Payloads)
1. **Identity Spoofing**: User A attempts to create a profile with User B's UID as the document ID.
2. **Role Escalation**: A passenger attempts to create a trip document.
3. **Ghost Update**: User A attempts to update User B's profile.
4. **Illegal Seat Increment**: A passenger attempts to manually increment `availableSeats` on a trip.
5. **Orphaned Booking**: Attempting to create a booking for a non-existent `tripId`.
6. **Cross-Chat Injection**: User A attempts to send a message to a `chatId` they are not a participant of.
7. **Bypassing Verification**: Attempting a write with `email_verified: false`.
8. **Shadow Field Injection**: Adding an `isAdmin: true` field to a user profile update.
9. **Timestamp Tampering**: Sending a future `createdAt` date instead of `request.time`.
10. **ID Poisoning**: Using a 2KB string as a `tripId`.
11. **Outcome Locking Bypass**: Attempting to edit a trip after its status is set to `completed`.
12. **PII Leak**: An unauthenticated user attempting to list the `users` collection.

## Test Runner Logic
The following tests will be performed using `firestore.rules.test.ts`:
- `test('User cannot spoof identity')`
- `test('Only drivers can create trips')`
- `test('Users can only read their own notifications')`
- `test('Messages require participation check')`
- ... (Detailed in firestore.rules.test.ts)
