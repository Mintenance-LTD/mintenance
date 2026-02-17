import React from 'react';
import { View, StyleSheet, Animated, Easing, ViewStyle } from 'react-native';

interface JobListSkeletonProps {
  count?: number;
  style?: ViewStyle;
}

const SkeletonBox: React.FC<{
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}> = ({ width = '100%', height = 20, borderRadius = 4, style }) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const JobListSkeleton: React.FC<JobListSkeletonProps> = ({
  count = 5,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <JobCardSkeleton key={index} />
      ))}
    </View>
  );
};

const JobCardSkeleton: React.FC = () => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <SkeletonBox width="70%" height={18} style={styles.mb4} />
          <SkeletonBox width="50%" height={14} />
        </View>
        <SkeletonBox width={60} height={24} borderRadius={12} />
      </View>

      <View style={styles.cardBody}>
        <SkeletonBox width="100%" height={14} style={styles.mb4} />
        <SkeletonBox width="90%" height={14} style={styles.mb8} />
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <SkeletonBox width={80} height={14} style={styles.mr8} />
          <SkeletonBox width={100} height={14} />
        </View>
        <SkeletonBox width={60} height={16} />
      </View>
    </View>
  );
};

export const JobDetailSkeleton: React.FC = () => {
  return (
    <View style={styles.detailContainer}>
      {/* Header */}
      <View style={styles.detailHeader}>
        <SkeletonBox width="80%" height={24} style={styles.mb8} />
        <View style={styles.badges}>
          <SkeletonBox width={60} height={24} borderRadius={12} style={styles.mr8} />
          <SkeletonBox width={80} height={24} borderRadius={12} style={styles.mr8} />
          <SkeletonBox width={70} height={24} borderRadius={12} />
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <SkeletonBox width={120} height={18} style={styles.mb8} />
        <SkeletonBox width="100%" height={14} style={styles.mb4} />
        <SkeletonBox width="100%" height={14} style={styles.mb4} />
        <SkeletonBox width="80%" height={14} />
      </View>

      {/* Details Grid */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <SkeletonBox width={60} height={12} style={styles.mb4} />
          <SkeletonBox width={80} height={16} />
        </View>
        <View style={styles.detailItem}>
          <SkeletonBox width={60} height={12} style={styles.mb4} />
          <SkeletonBox width={100} height={16} />
        </View>
        <View style={styles.detailItem}>
          <SkeletonBox width={60} height={12} style={styles.mb4} />
          <SkeletonBox width={90} height={16} />
        </View>
        <View style={styles.detailItem}>
          <SkeletonBox width={60} height={12} style={styles.mb4} />
          <SkeletonBox width={70} height={16} />
        </View>
      </View>

      {/* Photos */}
      <View style={styles.section}>
        <SkeletonBox width={80} height={18} style={styles.mb8} />
        <View style={styles.photoGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBox
              key={i}
              width="48%"
              height={100}
              borderRadius={8}
              style={styles.photo}
            />
          ))}
        </View>
      </View>

      {/* Action Button */}
      <SkeletonBox width="100%" height={48} borderRadius={8} style={styles.mt16} />
    </View>
  );
};

export const ContractorListSkeleton: React.FC<{ count?: number }> = ({
  count = 3,
}) => {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <ContractorCardSkeleton key={index} />
      ))}
    </View>
  );
};

const ContractorCardSkeleton: React.FC = () => {
  return (
    <View style={styles.contractorCard}>
      <View style={styles.contractorHeader}>
        <SkeletonBox width={60} height={60} borderRadius={30} />
        <View style={styles.contractorInfo}>
          <SkeletonBox width="70%" height={18} style={styles.mb4} />
          <SkeletonBox width="50%" height={14} style={styles.mb4} />
          <View style={styles.badges}>
            <SkeletonBox width={50} height={20} borderRadius={10} style={styles.mr4} />
            <SkeletonBox width={60} height={20} borderRadius={10} />
          </View>
        </View>
      </View>
      <View style={styles.contractorBody}>
        <SkeletonBox width="100%" height={14} style={styles.mb4} />
        <SkeletonBox width="80%" height={14} />
      </View>
      <View style={styles.contractorFooter}>
        <SkeletonBox width={100} height={14} />
        <SkeletonBox width={80} height={32} borderRadius={6} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F7F7F7',
  },
  skeleton: {
    backgroundColor: '#EBEBEB',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardBody: {
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  detailHeader: {
    marginBottom: 20,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  section: {
    marginBottom: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  detailItem: {
    width: '50%',
    paddingRight: 8,
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photo: {
    marginBottom: 8,
  },
  contractorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  contractorHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  contractorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contractorBody: {
    marginBottom: 12,
  },
  contractorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mb4: {
    marginBottom: 4,
  },
  mb8: {
    marginBottom: 8,
  },
  mt16: {
    marginTop: 16,
  },
  mr4: {
    marginRight: 4,
  },
  mr8: {
    marginRight: 8,
  },
});

export default JobListSkeleton;