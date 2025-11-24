# Device Access Control Security Fix

**Date:** 2025-11-23
**Issue:** Users could see all devices in the system, regardless of ownership
**Severity:** Medium (Information Disclosure)

## Problem Statement

The `/admin` dashboard and `/map` page were calling `/api/devices/public`, which returned **all devices** without authentication or filtering. This meant:
- Any authenticated user could see device names, IDs, and colors for all devices
- Regular ADMIN users could see devices owned by other users
- VIEWER users could see devices they shouldn't have access to

## Root Cause

The `/api/devices/public` endpoint:
1. Had no authentication check
2. Called `deviceDb.findAll()` without any `userId` filter
3. Was designed as a "public" endpoint despite containing sensitive information

## Solution Implemented

### 1. Created Centralized Access Control Helper (`lib/db.ts`)

Added `userDb.getAllowedDeviceIds(userId, role, username)` function that implements role-based access control:

```typescript
/**
 * Get list of device IDs that a user is allowed to access
 * @param userId - The user's ID
 * @param role - The user's role (ADMIN, VIEWER)
 * @param username - The user's username (for super admin check)
 * @returns Array of device IDs the user can access
 */
getAllowedDeviceIds: (userId: string, role: string, username: string): string[]
```

**Access Control Rules:**
- **Super Admin** (`username === "admin"`): Sees ALL devices
- **VIEWER** (with `parent_user_id`): Sees parent user's devices only
- **Regular ADMIN**: Sees only their own devices (`ownerId = userId`)
- **Others**: No access (empty array)

### 2. Secured `/api/devices/public` Endpoint

**Changes to `app/api/devices/public/route.ts`:**
- Added `auth()` check at the beginning
- Returns 401 if no session
- Uses `userDb.getAllowedDeviceIds()` to filter devices
- Maintains backward-compatible response format

**Before:**
```typescript
export async function GET() {
  const devices = deviceDb.findAll();
  // Returns ALL devices without auth
}
```

**After:**
```typescript
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedDeviceIds = userDb.getAllowedDeviceIds(userId, role, username);
  const userDevices = allDevices.filter(device =>
    allowedDeviceIds.includes(device.id)
  );
  // Returns only devices user can access
}
```

### 3. Enhanced `/api/locations` Endpoint

**Changes to `app/api/locations/route.ts`:**
- Replaced manual parent user lookup with centralized `getAllowedDeviceIds()`
- Ensures location data is filtered to only show locations from owned devices
- Simplified code by removing duplicate logic

**Before:**
```typescript
let targetUserId = userId;
if (currentUser?.role === 'VIEWER' && currentUser.parent_user_id) {
  targetUserId = currentUser.parent_user_id;
}
const userDevices = deviceDb.findAll({ userId: targetUserId });
```

**After:**
```typescript
const userDeviceIds = userDb.getAllowedDeviceIds(userId, role, sessionUsername);
// Filter locations to only include user's devices
locations = locations.filter(loc => userDeviceIds.includes(loc.username));
```

## Testing Results

Created test script `scripts/test-device-access.js` to verify access control.

**Test Results:**
```
User: admin (ADMIN)
  Can see devices: 10, 11, 12, 15 ✓ (ALL devices)

User: joachim (ADMIN)
  Can see devices: 12, 15 ✓ (only owned devices)

User: hummel (VIEWER, parent: joachim)
  Can see devices: 12, 15 ✓ (parent's devices)

User: joachiminfo (ADMIN, no devices)
  Can see devices: NONE ✓ (no owned devices)
```

All tests passed! Each user sees only the devices they should have access to.

## Impact

### Security Improvements
- ✅ Users can no longer see devices they don't own
- ✅ Device ownership is enforced at the API level
- ✅ Location data is filtered by device ownership
- ✅ Centralized access control logic prevents future bugs

### User Experience
- No breaking changes for legitimate users
- Each user sees only their own data
- Super admin retains full visibility for system administration
- VIEWER users see their parent's devices as intended

### Files Modified
1. `lib/db.ts` - Added `getAllowedDeviceIds()` helper function
2. `app/api/devices/public/route.ts` - Added authentication and filtering
3. `app/api/locations/route.ts` - Updated to use centralized access control
4. `scripts/test-device-access.js` - New test script (can be deleted after verification)

## Deployment Notes

### Server Restart Required
After deploying these changes, the Next.js server must be restarted to pick up the new code:
```bash
pkill -f "next dev"
npm run dev
```

Or in production:
```bash
npm run build
pm2 restart location-tracker-app
```

### Database Schema
No database migrations required. The fix uses existing columns:
- `Device.ownerId` (already exists)
- `User.parent_user_id` (already exists)
- `User.role` (already exists)

### Backward Compatibility
The API response format remains unchanged. Frontend components (dashboard, map) require no modifications.

## Future Recommendations

### 1. Rename Endpoint
Consider renaming `/api/devices/public` to `/api/devices/my-devices` to better reflect its authenticated, filtered nature.

### 2. Add API Tests
Create automated tests for device access control:
- Test super admin access
- Test regular admin access
- Test VIEWER access with parent
- Test VIEWER access without parent

### 3. Audit Other Endpoints
Review other API endpoints for similar access control issues:
- `/api/users` - Should users see other users?
- `/api/mqtt/credentials` - Should credentials be filtered by user?

### 4. Add Logging
Consider adding audit logging for device access:
```typescript
console.log(`[Access Control] User ${username} (${role}) accessed devices: ${allowedDeviceIds.join(', ')}`);
```

## Verification Steps for Deployment

1. **Login as regular ADMIN user** (e.g., "joachim")
   - Navigate to `/admin`
   - Verify "Configured Devices" shows only devices you own
   - Verify `/map` shows only your devices

2. **Login as VIEWER user** (e.g., "hummel")
   - Navigate to `/admin`
   - Verify you see parent user's devices
   - Verify `/map` shows parent's devices

3. **Login as super admin** (username: "admin")
   - Navigate to `/admin`
   - Verify you see ALL devices
   - Verify `/map` shows all devices

## Conclusion

The device access control security issue has been successfully fixed. Users now only see devices they own (or their parent's devices for VIEWER users), with the exception of the super admin who retains full system visibility.

The fix is backward-compatible, requires no database changes, and centralizes access control logic for easier maintenance.
