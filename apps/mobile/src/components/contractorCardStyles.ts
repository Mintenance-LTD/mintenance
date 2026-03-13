import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardStyle: {
    top: 0,
    left: 0,
    bottom: 80,
    right: 0,
  },
  cardContent: {
    flex: 1,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  profileImageContainer: {
    marginRight: 15,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  placeholderImage: {
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contractorName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 8,
  },
  ratingContainer: {
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#717171',
  },
  distanceText: {
    fontSize: 14,
    color: '#717171',
  },
  bioSection: {
    marginBottom: 20,
  },
  bioText: {
    fontSize: 16,
    color: '#222222',
    lineHeight: 22,
  },
  skillsSection: {
    marginBottom: 20,
  },
  skillsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 14,
    color: '#222222',
    fontWeight: '500',
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationText: {
    fontSize: 14,
    color: '#717171',
    marginLeft: 5,
    flex: 1,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
    marginBottom: 10,
  },
  detailsButtonText: {
    fontSize: 16,
    color: '#222222',
    fontWeight: '500',
    marginRight: 5,
  },
  reviewsSection: {
    marginTop: 10,
  },
  reviewsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 10,
  },
  reviewsContainer: {
    maxHeight: 200,
  },
  reviewCard: {
    backgroundColor: '#F7F7F7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reviewDate: {
    fontSize: 12,
    color: '#717171',
  },
  reviewComment: {
    fontSize: 14,
    color: '#222222',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  passButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  likeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  // Enhanced profile styles
  companyLogoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  companyLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#EBEBEB',
  },
  personalName: {
    fontSize: 14,
    color: '#717171',
    marginTop: 2,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 15,
    paddingVertical: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 8,
    minWidth: '45%',
  },
  detailText: {
    fontSize: 12,
    color: '#717171',
    marginLeft: 6,
    flex: 1,
  },
  // Portfolio styles
  portfolioHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  portfolioTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
  },
  portfolioSubtitle: {
    fontSize: 14,
    color: '#717171',
    marginTop: 5,
  },
  portfolioScroll: {
    marginBottom: 20,
  },
  portfolioImageContainer: {
    width: screenWidth - 80,
    marginRight: 10,
  },
  portfolioImage: {
    width: '100%',
    height: 250,
    borderRadius: 16,
  },
  portfolioSpecialties: {
    marginTop: 10,
  },
  specialtiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 10,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  specialtyText: {
    fontSize: 12,
    color: '#222222',
    fontWeight: '500',
  },
  connectButton: {
    marginHorizontal: 10,
  },
});
