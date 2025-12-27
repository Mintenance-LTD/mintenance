# Offline Conflict Resolution - Implementation Complete

## Summary

Comprehensive offline conflict resolution system has been successfully implemented in the mobile app's `OfflineManager` service.

## Implementation Details

**File**: `apps/mobile/src/services/OfflineManager.ts` (991 lines)
**Example Usage**: `apps/mobile/src/services/__examples__/OfflineConflictResolution.example.tsx`

## Core Features

### 1. Version Tracking
- Each entity (job, bid, profile) has a version number stored in AsyncStorage
- Base version captured when offline action is queued
- Version comparison during sync to detect conflicts

### 2. Conflict Detection
- Automatic detection during sync by fetching current server data
- Compares client base version with server version
- Only UPDATE operations are checked (CREATE/DELETE don't have conflicts)

### 3. Five Resolution Strategies

#### a. Last-Write-Wins (Default)
```typescript
// Compares timestamps, most recent wins
strategy: 'last-write-wins'
```

#### b. Server-Wins
```typescript
// Server data always takes precedence (for critical data)
strategy: 'server-wins'
// Used for: payments, escrow
```

#### c. Client-Wins
```typescript
// Client data always takes precedence (for user preferences)
strategy: 'client-wins'
// Used for: profile updates
```

#### d. Manual Resolution
```typescript
// Requires user intervention via UI
strategy: 'manual'
// Adds conflict to queue for user review
```

#### e. Intelligent Merge
```typescript
// Entity-specific merge logic
strategy: 'merge'
// Used for: jobs, bids
```

### 4. Conflict Queue Management

New AsyncStorage keys:
- `CONFLICT_QUEUE` - Stores pending conflicts
- `ENTITY_VERSIONS` - Tracks entity version numbers

### 5. Entity-Specific Merge Logic

**Job Merging**:
- Client wins: title, description, budget, priority
- Server wins: status, contractorId, homeownerId
- Union merge: photos array

**Bid Merging**:
- Server wins: status, amount
- Client can update: description (only if pending)

**Profile Merging**:
- Client wins: name, phone, bio
- Union merge: skills array
- Server wins: verification status, rating, completedJobs

## Public API

### Queue Action with Version Tracking
```typescript
await OfflineManager.queueAction({
  type: 'UPDATE',
  entity: 'job',
  entityId: 'job-123',
  data: { title: 'Updated Title' },
  strategy: 'merge', // Optional
});
```

### Conflict Management
```typescript
// Get all pending conflicts
const conflicts = await OfflineManager.getConflicts();

// Manually resolve a conflict
await OfflineManager.resolveConflictManually(
  conflictId,
  'client', // or 'server' or 'merged'
  mergedData // optional for 'merged'
);

// Clear resolved conflicts
await OfflineManager.clearResolvedConflicts();

// Subscribe to conflict updates
const unsubscribe = OfflineManager.onConflictDetected((conflicts) => {
  console.log('Conflicts detected:', conflicts.length);
});
```

## Type Definitions

```typescript
type ConflictResolutionStrategy =
  | 'last-write-wins'
  | 'server-wins'
  | 'client-wins'
  | 'manual'
  | 'merge';

interface DataConflict {
  id: string;
  actionId: string;
  entity: string;
  entityId: string;
  clientVersion: number;
  serverVersion: number;
  clientData: any;
  serverData: any;
  clientTimestamp: number;
  serverTimestamp: number;
  detectedAt: number;
  strategy: ConflictResolutionStrategy;
  resolved: boolean;
  resolution?: 'client' | 'server' | 'merged';
  mergedData?: any;
}

type OfflineAction = {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  queryKey?: string[];
  // New fields for conflict resolution
  version?: number;
  entityId?: string;
  baseVersion?: number;
  strategy?: ConflictResolutionStrategy;
};

type SyncStatus = 'syncing' | 'synced' | 'error' | 'pending' | 'conflict';
```

## Sync Flow Integration

### Before Conflict Resolution
1. Queue offline action
2. Attempt sync when online
3. Execute action (might overwrite server changes)
4. Success or retry

### After Conflict Resolution
1. Queue offline action with version tracking
2. Attempt sync when online
3. **Fetch current server data**
4. **Detect conflict if versions don't match**
5. **Resolve conflict based on strategy**:
   - Auto-resolve: Continue with merged/chosen data
   - Manual: Add to conflict queue, skip for now
6. Execute action with resolved data
7. Update entity version
8. Success or retry

## Default Strategy Assignment

The system automatically chooses appropriate strategies based on entity type:

- `payment`, `escrow` → `server-wins` (critical financial data)
- `profile` (UPDATE) → `client-wins` (user preferences)
- `message` → `last-write-wins` (append-only, rare conflicts)
- `job`, `bid` → `merge` (collaborative data)
- Default → `last-write-wins`

## Usage Examples

### Example 1: Queue Update with Auto-Merge
```typescript
// Jobs use merge strategy by default
await OfflineManager.queueAction({
  type: 'UPDATE',
  entity: 'job',
  entityId: 'job-123',
  data: {
    title: 'New Title',
    budget: 500,
    photos: ['photo1.jpg', 'photo2.jpg'],
  },
});
// If conflict: merges intelligently (title from client, status from server, photos union)
```

### Example 2: Critical Data (Server Always Wins)
```typescript
await OfflineManager.queueAction({
  type: 'UPDATE',
  entity: 'payment',
  entityId: 'payment-456',
  data: paymentData,
  strategy: 'server-wins', // Explicit override
});
// If conflict: client changes discarded, server data kept
```

### Example 3: User Preferences (Client Always Wins)
```typescript
await OfflineManager.queueAction({
  type: 'UPDATE',
  entity: 'profile',
  entityId: userId,
  data: { theme: 'dark', notifications: true },
});
// If conflict: client preferences always applied
```

### Example 4: Manual Resolution Required
```typescript
await OfflineManager.queueAction({
  type: 'UPDATE',
  entity: 'job',
  entityId: 'job-789',
  data: updates,
  strategy: 'manual',
});

// User will see conflict in UI
useEffect(() => {
  const unsubscribe = OfflineManager.onConflictDetected((conflicts) => {
    Alert.alert('Sync Conflict', `${conflicts.length} conflicts need review`);
  });
  return unsubscribe;
}, []);
```

### Example 5: Conflict Resolution UI
```typescript
const ConflictItem = ({ conflict }: { conflict: DataConflict }) => (
  <View>
    <Text>Conflict: {conflict.entity}</Text>
    <Text>Your changes: {JSON.stringify(conflict.clientData)}</Text>
    <Text>Server version: {JSON.stringify(conflict.serverData)}</Text>

    <Button
      title="Keep My Changes"
      onPress={() =>
        OfflineManager.resolveConflictManually(conflict.id, 'client')
      }
    />
    <Button
      title="Use Server Version"
      onPress={() =>
        OfflineManager.resolveConflictManually(conflict.id, 'server')
      }
    />
    {conflict.strategy === 'merge' && (
      <Button
        title="Merge Both"
        onPress={() =>
          OfflineManager.resolveConflictManually(conflict.id, 'merged')
        }
      />
    )}
  </View>
);
```

## Testing Strategy

### Unit Tests Needed
1. Version tracking (get/update)
2. Conflict detection logic
3. Each resolution strategy
4. Entity-specific merge functions
5. Conflict queue management

### Integration Tests Needed
1. Full sync flow with conflicts
2. Multiple concurrent conflicts
3. Network failure during conflict resolution
4. Manual resolution then re-sync

### E2E Tests Needed
1. User edits job offline
2. Another user edits same job
3. First user comes online
4. Conflict UI appears
5. User resolves conflict
6. Changes sync successfully

## Benefits

✅ **Data Safety**: Prevents silent data loss
✅ **User Control**: Manual resolution for important conflicts
✅ **Smart Merging**: Preserves changes from both versions when possible
✅ **Flexibility**: Different strategies for different data types
✅ **Transparency**: Full conflict information available to users
✅ **Non-Breaking**: Backward compatible with existing code
✅ **TypeScript**: Fully typed for safety and autocomplete

## Files Changed

1. `apps/mobile/src/services/OfflineManager.ts`
   - Added conflict resolution types (60 lines)
   - Enhanced OfflineAction type
   - Integrated conflict detection in syncQueue
   - Implemented 5 resolution strategies
   - Added conflict queue management
   - Created entity-specific merge logic (460+ lines of new code)

2. `apps/mobile/src/services/__examples__/OfflineConflictResolution.example.tsx` (NEW)
   - 7 comprehensive usage examples
   - UI component examples
   - Testing scenarios

## Next Steps

1. **Testing**: Write unit tests for conflict resolution strategies
2. **UI Components**: Create conflict resolution screen
3. **Monitoring**: Add analytics for conflict frequency
4. **Documentation**: Update app documentation with conflict resolution guide
5. **User Training**: Add onboarding for conflict resolution UI

## Performance Impact

- **Negligible overhead** on queue operations (just version lookup)
- **Conflict detection** only during sync (when online)
- **Minimal storage**: Version map is small (entity:id → number)
- **Network**: One extra fetch per entity to check server state

## Security Considerations

✅ Client versions are hints only; server is source of truth
✅ Critical fields (status, IDs) always preserved from server
✅ Financial data uses server-wins strategy by default
✅ Conflict data stays local until manually resolved

---

**Status**: ✅ Implementation Complete
**Lines Added**: ~460 lines of production code
**Backward Compatible**: Yes
**Ready for Testing**: Yes
**Documentation**: Complete with examples
