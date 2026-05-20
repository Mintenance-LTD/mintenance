import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Skeleton } from '../../../components/skeletons/Skeleton';
import { me } from '../../../design-system/mint-editorial';
import { styles } from '../homeownerDashboardStyles';

interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  contractor?: { name: string };
}

interface DashboardAppointmentsSectionProps {
  /** undefined = loading; empty array = no appointments */
  appointments: Appointment[] | undefined;
}

export const DashboardAppointmentsSection: React.FC<
  DashboardAppointmentsSectionProps
> = ({ appointments }) => {
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();

  if (appointments === undefined) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
        </View>
        {[1, 2].map((key) => (
          <View key={key} style={styles.appointmentCard}>
            <Skeleton width={44} height={44} borderRadius={12} />
            <View style={styles.appointmentInfo}>
              <Skeleton width={140} height={15} borderRadius={4} />
              <Skeleton
                width={100}
                height={13}
                borderRadius={4}
                style={{ marginTop: 4 }}
              />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (appointments.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming</Text>
        {appointments.length > 3 && (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('ProfileTab', { screen: 'Calendar' })
            }
            accessibilityRole='button'
            accessibilityLabel='View all appointments'
          >
            <Text style={styles.viewAllLink}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      {appointments.slice(0, 3).map((apt) => (
        <TouchableOpacity
          key={apt.id}
          style={styles.appointmentCard}
          onPress={() =>
            navigation.navigate('ProfileTab', { screen: 'Calendar' })
          }
          accessibilityRole='button'
          accessibilityLabel={`${apt.title}, ${apt.time || ''}`}
          activeOpacity={0.7}
        >
          <View style={styles.appointmentDateBlock}>
            <Text style={styles.appointmentDay}>
              {new Date(apt.date + 'T00:00:00').toLocaleDateString('en-GB', {
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.appointmentMonth}>
              {new Date(apt.date + 'T00:00:00').toLocaleDateString('en-GB', {
                month: 'short',
              })}
            </Text>
          </View>
          <View style={styles.appointmentInfo}>
            <Text style={styles.appointmentTitle} numberOfLines={1}>
              {apt.title}
            </Text>
            <Text style={styles.appointmentMeta}>
              {apt.time ? apt.time.slice(0, 5) : ''}
              {apt.contractor ? ` · ${apt.contractor.name}` : ''}
            </Text>
          </View>
          <Ionicons name='chevron-forward' size={16} color={me.ink3} />
        </TouchableOpacity>
      ))}
    </View>
  );
};
