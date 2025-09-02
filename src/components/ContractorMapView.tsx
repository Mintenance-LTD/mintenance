import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { ContractorProfile, LocationData } from '../types';

interface Props {
  userLocation: LocationData;
  contractors: ContractorProfile[];
}

const ContractorMapView: React.FC<Props> = ({ userLocation, contractors }) => {
  const [selectedContractor, setSelectedContractor] = useState<ContractorProfile | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const handleMarkerPress = (contractor: ContractorProfile) => {
    setSelectedContractor(contractor);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={14} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color="#FFD700" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#FFD700" />
      );
    }

    return stars;
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* User Location Marker */}
        <Marker
          coordinate={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          }}
          title="Your Location"
          description="You are here"
          pinColor="blue"
        />
        
        {/* Contractor Markers */}
        {contractors.map((contractor) => (
          <Marker
            key={contractor.id}
            coordinate={{
              latitude: contractor.latitude!,
              longitude: contractor.longitude!,
            }}
            title={`${contractor.firstName} ${contractor.lastName}`}
            description={`${contractor.rating?.toFixed(1)} ⭐ • ${contractor.distance?.toFixed(1)}km`}
            pinColor="orange"
            onPress={() => handleMarkerPress(contractor)}
          >
            <View style={styles.customMarker}>
              <View style={styles.markerContent}>
                <Ionicons name="person" size={16} color="#fff" />
              </View>
              <View style={styles.markerPointer} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Contractor Details Modal */}
      <Modal
        visible={selectedContractor !== null}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedContractor && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Contractor Details</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedContractor(null)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.contractorDetails}>
                  <View style={styles.contractorHeader}>
                    <View style={styles.contractorAvatar}>
                      {selectedContractor.profileImageUrl ? (
                        <Image
                          source={{ uri: selectedContractor.profileImageUrl }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Ionicons name="person" size={30} color="#007AFF" />
                      )}
                    </View>
                    
                    <View style={styles.contractorInfo}>
                      <Text style={styles.contractorName}>
                        {selectedContractor.firstName} {selectedContractor.lastName}
                      </Text>
                      
                      <View style={styles.ratingRow}>
                        <View style={styles.starsContainer}>
                          {renderStars(selectedContractor.rating || 0)}
                        </View>
                        <Text style={styles.ratingText}>
                          {(selectedContractor.rating || 0).toFixed(1)} ({selectedContractor.totalJobsCompleted} jobs)
                        </Text>
                      </View>

                      <Text style={styles.distanceText}>
                        📍 {selectedContractor.distance?.toFixed(1)} km away
                      </Text>
                    </View>
                  </View>

                  {selectedContractor.bio && (
                    <View style={styles.bioSection}>
                      <Text style={styles.sectionTitle}>About</Text>
                      <Text style={styles.bioText}>{selectedContractor.bio}</Text>
                    </View>
                  )}

                  {selectedContractor.skills && selectedContractor.skills.length > 0 && (
                    <View style={styles.skillsSection}>
                      <Text style={styles.sectionTitle}>Specialties</Text>
                      <View style={styles.skillsGrid}>
                        {selectedContractor.skills.map((skill, index) => (
                          <View key={index} style={styles.skillTag}>
                            <Text style={styles.skillText}>{skill.skillName}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={styles.performanceSection}>
                    <Text style={styles.sectionTitle}>Performance</Text>
                    <View style={styles.performanceGrid}>
                      <View style={styles.performanceItem}>
                        <Text style={styles.performanceValue}>
                          {selectedContractor.rating?.toFixed(1) || '0.0'}
                        </Text>
                        <Text style={styles.performanceLabel}>Rating</Text>
                      </View>
                      <View style={styles.performanceItem}>
                        <Text style={styles.performanceValue}>
                          {selectedContractor.totalJobsCompleted || 0}
                        </Text>
                        <Text style={styles.performanceLabel}>Jobs Done</Text>
                      </View>
                      <View style={styles.performanceItem}>
                        <Text style={styles.performanceValue}>&lt; 2h</Text>
                        <Text style={styles.performanceLabel}>Response</Text>
                      </View>
                      <View style={styles.performanceItem}>
                        <Text style={styles.performanceValue}>5 yrs</Text>
                        <Text style={styles.performanceLabel}>Experience</Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.contactButton}>
                    <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                    <Text style={styles.contactButtonText}>Message</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.hireButton}>
                    <Ionicons name="checkmark-outline" size={20} color="#fff" />
                    <Text style={styles.hireButtonText}>Hire Now</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  customMarker: {
    alignItems: 'center',
  },
  markerContent: {
    backgroundColor: '#007AFF',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#007AFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  contractorDetails: {
    flex: 1,
    padding: 20,
  },
  contractorHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  contractorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  contractorInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ratingRow: {
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  distanceText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  bioSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  bioText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  skillsSection: {
    marginBottom: 20,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
  performanceSection: {
    marginBottom: 20,
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceItem: {
    alignItems: 'center',
    flex: 1,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6C757D',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  hireButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  hireButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ContractorMapView;