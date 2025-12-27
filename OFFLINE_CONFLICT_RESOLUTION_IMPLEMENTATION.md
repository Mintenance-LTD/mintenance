# Offline Conflict Resolution Implementation

## Summary

Comprehensive offline conflict resolution system implemented in `apps/mobile/src/services/OfflineManager.ts` (991 lines).

## Features Implemented

### 1. Version Tracking
- **Entity Version Storage**: Each entity (job, bid, profile) has a version number stored in AsyncStorage
- **Base Version Capture**: When queuing an offline action, we capture the current server version
- **Version Comparison**: During sync, we compare client base version with current server version to detect conflicts

### 2. Conflict Detection
- **Automatic Detection**: When syncing, we fetch current server data and compare versions
- **Conflict Structure**: Full conflict information captured including:
  - Client and server versions
  - Client and server data snapshots
  - Timestamps for both versions
  - Recommended resolution strategy
  - Entity type and ID

### 3. Conflict Resolution Strategies

#### a. Last-Write-Wins (Default)
- Compares timestamps
- Most recent change wins
- Used when no specific strategy is defined

#### b. Server-Wins
- Server data always takes precedence
- Used for critical data (payments, escrow)
- Prevents accidental overwrites of financial data

#### c. Client-Wins
- Client data always takes precedence
- Used for user preferences and settings
- Ensures user's local changes are preserved

#### d. Manual Resolution
- Requires user intervention via UI dialog
- Adds conflict to queue for manual review
- User can choose client, server, or merged version

#### e. Intelligent Merge
- Entity-specific merge logic
- Preserves changes from both versions where possible
- Falls back to last-write-wins if merge fails

### 4. Conflict Queue Management

**Storage**: Separate AsyncStorage key for conflicts (`CONFLICT_QUEUE`)

**Public API**:
```typescript
// Get all pending conflicts
async getConflicts(): Promise<DataConflict[]>

// Manually resolve a conflict
async resolveConflictManually(
  conflictId: string,
  resolution: 'client' | 'server' | 'merged',
  mergedData?: any
): Promise<void>

// Clear resolved conflicts
async clearResolvedConflicts(): Promise<void>

// Subscribe to conflict updates
onConflictDetected(callback: (conflicts: DataConflict[]) => void): () => void
```

### 5. Entity-Specific Merge Strategies

#### Job Merging
```typescript
private mergeJobData(clientData: any, serverData: any): any {
  return {
    ...serverData,
    // Client updates for editable fields
    title: clientData.title || serverData.title,
    description: clientData.description || serverData.description,
    budget: clientData.budget !== undefined ? clientData.budget : serverData.budget,
    priority: clientData.priority || serverData.priority,
    // Server wins for status and critical fields
    status: serverData.status,
    contractorId: serverData.contractorId,
    homeownerId: serverData.homeownerId,
    // Merge photos (union of both sets)
    photos: Array.from(new Set([
      ...(serverData.photos || []),
      ...(clientData.photos || []),
    ])),
    // Keep server timestamps
    createdAt: serverData.createdAt,
    updatedAt: serverData.updatedAt,
  };
}
```

#### Bid Merging
- Server wins for status and amount (immutable after acceptance)
- Client can update description only while bid is pending
- Prevents contractor from changing bid after homeowner review

#### Profile Merging
- Client wins for user-editable fields (name, phone, bio)
- Merges skills arrays (union of both sets)
- Server wins for verification status and computed fields

## Integration with Sync Flow

### Before (No Conflict Resolution)
1. Queue offline action
2. Attempt sync when online
3. Execute action (might overwrite server changes)
4. Success or retry

### After (With Conflict Resolution)
1. Queue offline action with version tracking
2. Attempt sync when online
3. **Fetch current server data**
4. **Detect conflict if versions don't match**
5. **Resolve conflict based on strategy**:
   - Auto-resolve: Continue with merged/chosen data
   - Manual: Add to conflict queue, skip action
6. Execute action with resolved data
7. Update entity version
8. Success or retry

## Usage Examples

### Basic: Queue Action with Version Tracking
```typescript
await OfflineManager.queueAction({
  type: 'UPDATE',
  entity: 'job',
  entityId: 'job-123',
  data: { title: 'Updated Title' },
  strategy: 'merge', // Optional: specify strategy
});
```

### Strategy Selection by Entity Type
```typescript
// Critical data - server wins
await OfflineManager.queueAction({
  type: 'UPDATE',
  entity: 'payment',
  entityId: paymentId,
  data: paymentData,
  strategy: 'server-wins',
});

// User preferences - client wins
await OfflineManager.queueAction({
  type: 'UPDATE',
  entity: 'profile',
  entityId: userId,
  data: preferences,
  strategy: 'client-wins',
});

// Collaborative data - manual resolution
await OfflineManager.queueAction({
  type: 'UPDATE',
  entity: 'job',
  entityId: jobId,
  data: updates,
  strategy: 'manual',
});
```

### Manual Conflict Resolution UI
```typescript
// Subscribe to conflicts
useEffect(() => {
  const unsubscribe = OfflineManager.onConflictDetected((conflicts) => {
    setConflicts(conflicts);
    Alert.alert('Sync Conflict Detected', `${conflicts.length} conflicts need resolution`);
  });
  return unsubscribe;
}, []);

// Resolve conflict
const handleResolve = async (conflictId: string, choice: 'client' | 'server') => {
  await OfflineManager.resolveConflictManually(conflictId, choice);
};
```

## Storage Structure

### Entity Versions
```
ENTITY_VERSIONS: {
  "job:123": 5,
  "job:456": 3,
  "bid:789": 2,
  "profile:user-1": 12
}
```

### Conflict Queue
```
CONFLICT_QUEUE: [
  {
    id: "conflict_1234567890_abc123",
    actionId: "1234567890_xyz789",
    entity: "job",
    entityId: "job-123",
    clientVersion: 4,
    serverVersion: 5,
    clientData: { title: "Client Title", budget: 500 },
    serverData: { title: "Server Title", budget: 600 },
    clientTimestamp: 1640000000000,
    serverTimestamp: 1640000001000,
    detectedAt: 1640000002000,
    strategy: "merge",
    resolved: false
  }
]
```

## Default Strategy Assignment

The system automatically chooses appropriate strategies:
- **payment, escrow**: `server-wins` (critical financial data)
- **profile (UPDATE)**: `client-wins` (user preferences)
- **message**: `last-write-wins` (append-only, rare conflicts)
- **job, bid**: `merge` (collaborative data)
- **default**: `last-write-wins`

## Benefits

1. **Data Safety**: Prevents silent data loss from overwriting server changes
2. **User Control**: Manual resolution for important conflicts
3. **Smart Merging**: Preserves changes from both versions when possible
4. **Flexibility**: Different strategies for different data types
5. **Transparency**: Full conflict information available to users
6. **Non-Breaking**: Backward compatible with existing code

## Testing Recommendations

1. **Unit Tests**: Test each merge strategy independently
2. **Integration Tests**: Test conflict detection during sync
3. **E2E Tests**: Test manual resolution UI flow
4. **Edge Cases**:
   - Multiple conflicts for same entity
   - Rapid online/offline transitions
   - Network failures during conflict resolution
   - Concurrent modifications

## Future Enhancements

1. **Field-Level Merging**: Merge at individual field level instead of object level
2. **Conflict History**: Keep audit trail of all conflicts and resolutions
3. **Smart Notifications**: Different notification strategies for different conflict types
4. **Auto-Resolution Rules**: User-configurable rules for automatic resolution
5. **Conflict Analytics**: Track conflict frequency to identify UX improvements
