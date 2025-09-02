# Find Contractors Feature

## Overview

The Find Contractors feature allows homeowners to discover and interact with contractors in their area through an intuitive map-based interface and Tinder-style swiping mechanism.

## Key Features

### 🗺️ Interactive Map
- Shows homeowner's location and nearby contractors
- Contractors appear as markers on the map
- Tap markers to view contractor details
- Visual distance indicators

### 📱 Swipe Interface
- Tinder-style card interface for contractor profiles
- **Green Leaf (👍)**: Accept/Like contractor
- **Red X (👎)**: Pass on contractor
- Swipe right to like, swipe left to pass
- Visual feedback with overlay labels

### 👤 Contractor Profiles
- Professional photo or avatar
- Star rating system with job completion count
- Distance from homeowner
- Bio and specialties
- Skills/expertise tags
- Recent reviews and ratings
- Location information

## Usage Instructions

### For Homeowners

1. **Access Feature**: 
   - Open the app and navigate to Home screen
   - Tap "Find Contractors" card

2. **Location Permission**: 
   - Grant location access when prompted
   - This enables finding contractors near you

3. **Browse Contractors**:
   - View contractors on the interactive map
   - Tap map markers to see specific contractors
   - Swipe through contractor cards

4. **Interact with Contractors**:
   - Swipe RIGHT or tap the GREEN LEAF to like
   - Swipe LEFT or tap the RED X to pass
   - Liked contractors are saved to your favorites

## Database Schema Updates

### New Tables Created
- `contractor_skills`: Stores contractor specializations
- `contractor_matches`: Records homeowner swipe actions
- `reviews`: Contractor rating and review system

### Enhanced Users Table
- `latitude/longitude`: Contractor location coordinates
- `address`: Human-readable address
- `profile_image_url`: Profile photo
- `bio`: Professional biography
- `rating`: Average star rating
- `total_jobs_completed`: Job completion count
- `is_available`: Availability status

## Technical Implementation

### Key Components
- `FindContractorsScreen.tsx`: Main screen with map and card interface
- `ContractorCard.tsx`: Swipeable contractor profile component
- `ContractorService.ts`: Location-based contractor queries

### Dependencies Added
- `react-native-maps`: Interactive map functionality
- `react-native-deck-swiper`: Card swiping interface
- `expo-location`: Device location access

### Features Implemented
- Location-based contractor discovery
- Distance calculation and sorting
- Match recording and tracking
- Profile rating system
- Skills/specialization filtering

## Database Setup

Run the following migration after the main database setup:

```sql
-- Apply the contractor-location-migration.sql file
-- This adds location support and contractor profiles
```

## Permissions Required

### iOS
- Location When In Use: Required for finding nearby contractors

### Android  
- ACCESS_FINE_LOCATION: GPS-based location
- ACCESS_COARSE_LOCATION: Network-based location

## Future Enhancements

- Push notifications for contractor matches
- In-app messaging with liked contractors
- Advanced filtering (skills, rating, price range)
- Contractor availability calendar
- Direct job posting from contractor profiles
- Mutual matching system (contractor must also like homeowner)