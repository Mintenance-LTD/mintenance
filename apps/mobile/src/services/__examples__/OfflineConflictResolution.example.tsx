/**
 * OFFLINE CONFLICT RESOLUTION - USAGE EXAMPLES
 *
 * This file demonstrates how to use the enhanced OfflineManager
 * with conflict resolution capabilities.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, Alert } from 'react-native';
import { OfflineManager, DataConflict, ConflictResolutionStrategy } from '../OfflineManager';

// =============================================
// EXAMPLE 1: Queue Action with Version Tracking
// =============================================

export const UpdateJobWithVersioning = async (jobId: string, updates: any) => {
  try {
    // Queue an update action with version tracking
    const actionId = await OfflineManager.queueAction({
      type: 'UPDATE',
      entity: 'job',
      entityId: jobId,
      data: updates,
      maxRetries: 3,
      queryKey: ['jobs', jobId],
      // Optional: Specify conflict resolution strategy
      strategy: 'merge', // Will attempt intelligent merge on conflict
    });

    console.log('Job update queued:', actionId);
  } catch (error) {
    console.error('Failed to queue job update:', error);
  }
};

// =============================================
// EXAMPLE 2: Different Strategies for Different Entities
// =============================================

// Critical data: Server always wins
export const UpdatePaymentInfo = async (paymentId: string, data: any) => {
  await OfflineManager.queueAction({
    type: 'UPDATE',
    entity: 'payment',
    entityId: paymentId,
    data,
    strategy: 'server-wins', // Never overwrite server data
  });
};

// User preferences: Client always wins
export const UpdateUserPreferences = async (userId: string, preferences: any) => {
  await OfflineManager.queueAction({
    type: 'UPDATE',
    entity: 'profile',
    entityId: userId,
    data: preferences,
    strategy: 'client-wins', // User's local changes take precedence
  });
};

// Collaborative data: Require manual resolution
export const UpdateSharedJob = async (jobId: string, updates: any) => {
  await OfflineManager.queueAction({
    type: 'UPDATE',
    entity: 'job',
    entityId: jobId,
    data: updates,
    strategy: 'manual', // Force user to resolve conflicts
  });
};

// =============================================
// EXAMPLE 3: Conflict Resolution UI Component
// =============================================

export const ConflictResolutionScreen: React.FC = () => {
  const [conflicts, setConflicts] = useState<DataConflict[]>([]);

  useEffect(() => {
    // Load initial conflicts
    loadConflicts();

    // Subscribe to new conflicts
    const unsubscribe = OfflineManager.onConflictDetected((newConflicts) => {
      setConflicts(newConflicts);
      if (newConflicts.length > 0) {
        Alert.alert(
          'Sync Conflict',
          `${newConflicts.length} conflict(s) require your attention`,
          [{ text: 'Review', onPress: () => {} }]
        );
      }
    });

    return unsubscribe;
  }, []);

  const loadConflicts = async () => {
    const pending = await OfflineManager.getConflicts();
    setConflicts(pending);
  };

  const handleResolve = async (
    conflictId: string,
    resolution: 'client' | 'server' | 'merged'
  ) => {
    try {
      await OfflineManager.resolveConflictManually(conflictId, resolution);
      Alert.alert('Success', 'Conflict resolved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to resolve conflict');
    }
  };

  const renderConflict = ({ item }: { item: DataConflict }) => (
    <View style={{ padding: 16, borderBottomWidth: 1 }}>
      <Text style={{ fontWeight: 'bold' }}>
        {item.entity} Conflict
      </Text>
      <Text>Entity ID: {item.entityId}</Text>
      <Text>Strategy: {item.strategy}</Text>

      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: '600' }}>Your Changes:</Text>
        <Text>{JSON.stringify(item.clientData, null, 2)}</Text>
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: '600' }}>Server Version:</Text>
        <Text>{JSON.stringify(item.serverData, null, 2)}</Text>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 16, gap: 8 }}>
        <Button
          title="Keep Mine"
          onPress={() => handleResolve(item.id, 'client')}
        />
        <Button
          title="Use Server"
          onPress={() => handleResolve(item.id, 'server')}
        />
        {item.strategy === 'merge' && (
          <Button
            title="Merge Both"
            onPress={() => handleResolve(item.id, 'merged')}
          />
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', padding: 16 }}>
        Sync Conflicts ({conflicts.length})
      </Text>

      <FlatList
        data={conflicts}
        keyExtractor={(item) => item.id}
        renderItem={renderConflict}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', padding: 32 }}>
            No conflicts to resolve
          </Text>
        }
      />

      <Button
        title="Clear Resolved Conflicts"
        onPress={() => OfflineManager.clearResolvedConflicts()}
      />
    </View>
  );
};

// =============================================
// EXAMPLE 4: Monitoring Sync Status with Conflicts
// =============================================

export const useSyncStatus = () => {
  const [status, setStatus] = useState<{
    syncStatus: 'syncing' | 'synced' | 'error' | 'pending' | 'conflict';
    pendingCount: number;
    conflictCount: number;
  }>({
    syncStatus: 'synced',
    pendingCount: 0,
    conflictCount: 0,
  });

  useEffect(() => {
    // Monitor sync status
    const unsubscribeSync = OfflineManager.onSyncStatusChange((syncStatus, pendingCount) => {
      setStatus(prev => ({ ...prev, syncStatus, pendingCount }));
    });

    // Monitor conflicts
    const unsubscribeConflicts = OfflineManager.onConflictDetected((conflicts) => {
      setStatus(prev => ({ ...prev, conflictCount: conflicts.length }));
    });

    return () => {
      unsubscribeSync();
      unsubscribeConflicts();
    };
  }, []);

  return status;
};

// Usage in a component
export const SyncStatusIndicator: React.FC = () => {
  const { syncStatus, pendingCount, conflictCount } = useSyncStatus();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {syncStatus === 'syncing' && <Text>⏳ Syncing...</Text>}
      {syncStatus === 'synced' && <Text>✅ Synced</Text>}
      {syncStatus === 'error' && <Text>❌ Error</Text>}
      {syncStatus === 'pending' && <Text>📤 Pending ({pendingCount})</Text>}
      {syncStatus === 'conflict' && <Text>⚠️ Conflicts ({conflictCount})</Text>}
    </View>
  );
};

// =============================================
// EXAMPLE 5: Advanced Merge with Custom Logic
// =============================================

export const resolveJobConflictWithCustomMerge = async (
  conflictId: string,
  clientData: any,
  serverData: any
) => {
  // Create custom merge logic for specific use case
  const mergedData = {
    ...serverData,
    // Keep client's title if changed
    title: clientData.title !== serverData.title
      ? clientData.title
      : serverData.title,
    // Merge photos from both versions
    photos: Array.from(new Set([
      ...(serverData.photos || []),
      ...(clientData.photos || []),
    ])),
    // Keep higher budget
    budget: Math.max(clientData.budget || 0, serverData.budget || 0),
    // Server wins for status
    status: serverData.status,
  };

  await OfflineManager.resolveConflictManually(conflictId, 'merged', mergedData);
};

// =============================================
// EXAMPLE 6: Batch Conflict Resolution
// =============================================

export const resolveBatchConflicts = async (
  strategy: 'all-client' | 'all-server' | 'smart'
) => {
  const conflicts = await OfflineManager.getConflicts();

  for (const conflict of conflicts) {
    switch (strategy) {
      case 'all-client':
        await OfflineManager.resolveConflictManually(conflict.id, 'client');
        break;

      case 'all-server':
        await OfflineManager.resolveConflictManually(conflict.id, 'server');
        break;

      case 'smart':
        // Use last-write-wins logic
        const resolution = conflict.clientTimestamp > conflict.serverTimestamp
          ? 'client'
          : 'server';
        await OfflineManager.resolveConflictManually(conflict.id, resolution);
        break;
    }
  }
};

// =============================================
// EXAMPLE 7: Testing Conflict Scenarios
// =============================================

export const simulateConflict = async () => {
  const jobId = 'test-job-123';

  // 1. User edits job offline
  await OfflineManager.queueAction({
    type: 'UPDATE',
    entity: 'job',
    entityId: jobId,
    data: {
      title: 'Updated Title (Offline)',
      budget: 500,
    },
    strategy: 'merge',
  });

  // 2. Simulate server update (in real app, another user would do this)
  // This would be detected during sync when we fetch current server state

  // 3. Trigger sync - conflict will be detected
  await OfflineManager.syncQueue();

  // 4. Check for conflicts
  const conflicts = await OfflineManager.getConflicts();
  console.log('Detected conflicts:', conflicts.length);
};
