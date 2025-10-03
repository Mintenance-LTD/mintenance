# 🎨 Mintenance Design System Implementation

Based on "Signature Salon" UI/UX inspiration, we've implemented a modern, professional design system for the Mintenance contractor marketplace app.

## 📱 New Components Created

### 1. **ExploreMapScreen.tsx**
Map-based contractor discovery with location search.

**Features:**
- Interactive Google Maps integration
- Custom map markers for contractors
- Location-based search with filters
- Contractor info cards with ratings and pricing
- Real-time distance calculations
- Navigation to contractor profiles

**Key Design Elements:**
- Floating search bar with filter button
- Custom marker styling with icons
- Bottom card preview with contractor details
- Smooth map interactions

**Usage:**
```tsx
import ExploreMapScreen from '@/screens/ExploreMapScreen';

// In navigation
<Stack.Screen name="ExploreMap" component={ExploreMapScreen} />
```

---

### 2. **PaymentMethodsScreen.tsx**
Comprehensive payment management with Stripe integration.

**Features:**
- Multiple payment options (Cash, Card, PayPal, Apple Pay)
- Realistic card visualization
- Stripe CardForm integration
- Save card functionality
- Card number formatting
- Secure CVV input

**Key Design Elements:**
- Interactive card preview with live updates
- Visual card design (VISA style)
- Clean form inputs with validation
- Radio button selection
- Checkbox for save card option

**Usage:**
```tsx
import PaymentMethodsScreen from '@/screens/PaymentMethodsScreen';

// In navigation
<Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
```

**Stripe Setup Required:**
```tsx
// Wrap app with StripeProvider
import { StripeProvider } from '@stripe/stripe-react-native';

<StripeProvider
  publishableKey="pk_test_your_key"
  merchantIdentifier="merchant.com.mintenance"
>
  {/* Your app */}
</StripeProvider>
```

---

### 3. **EnhancedHomeScreen.tsx**
Modern homepage with special offers and service categories.

**Features:**
- Location selector with dropdown
- Search bar with filter
- Special offers carousel with pagination
- Service categories with icons
- Top-rated contractors list
- Pull-to-refresh capability

**Key Design Elements:**
- Horizontal scrolling offers
- Circular service icons
- Contractor cards with ratings
- Badge notifications
- Smooth animations

**Usage:**
```tsx
import EnhancedHomeScreen from '@/screens/EnhancedHomeScreen';

// In navigation
<Tab.Screen name="Home" component={EnhancedHomeScreen} />
```

---

### 4. **ContractorProfileScreen.tsx**
Comprehensive contractor profile with photos and reviews.

**Features:**
- Profile header with stats (followers/following)
- Photo gallery grid
- Reviews with ratings
- Tab switching (Photos/Reviews)
- Action buttons (Add review, Add photo, Edit)
- Social sharing

**Key Design Elements:**
- Large avatar with edit button
- Stats display
- Dual-tab interface
- Photo grid layout (2 columns)
- Review cards with user info
- Star ratings visualization

**Usage:**
```tsx
import ContractorProfileScreen from '@/screens/ContractorProfileScreen';

// In navigation
<Stack.Screen name="ContractorProfile" component={ContractorProfileScreen} />
```

---

## 🎨 Design Tokens

### Colors
```typescript
const colors = {
  // Primary
  primary: '#666',        // Dark gray/charcoal
  background: '#F8F9FA',  // Light gray background
  surface: '#FFFFFF',     // White cards/surfaces
  
  // Text
  text: '#333',           // Dark text
  textSecondary: '#666',  // Medium gray text
  textTertiary: '#999',   // Light gray text
  
  // Accents
  rating: '#FFB800',      // Gold star rating
  error: '#FF4444',       // Red errors/notifications
  border: '#E5E5E5',      // Light border
}
```

### Typography
```typescript
const typography = {
  // Headings
  h1: { fontSize: 24, fontWeight: '600' },
  h2: { fontSize: 20, fontWeight: '600' },
  h3: { fontSize: 18, fontWeight: '600' },
  h4: { fontSize: 16, fontWeight: '600' },
  
  // Body
  body: { fontSize: 16, fontWeight: '400' },
  bodySmall: { fontSize: 14, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '400' },
  
  // Buttons
  button: { fontSize: 16, fontWeight: '600' },
}
```

### Spacing
```typescript
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}
```

### Border Radius
```typescript
const borderRadius = {
  small: 8,
  medium: 12,
  large: 16,
  xl: 20,
  round: 50,
}
```

---

## 🔧 Dependencies Added

```json
{
  "@stripe/stripe-react-native": "^0.41.3",
  "expo-location": "~18.1.0",
  "react-native-maps": "1.18.0"
}
```

### Installation
```bash
cd apps/mobile
npm install @stripe/stripe-react-native expo-location react-native-maps
```

### Configuration

**1. React Native Maps (Android)**
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<meta-data
  android:name="com.google.android.geo.API_KEY"
  android:value="YOUR_GOOGLE_MAPS_API_KEY"/>
```

**2. React Native Maps (iOS)**
Add to `ios/Podfile`:
```ruby
pod 'GoogleMaps'
pod 'Google-Maps-iOS-Utils'
```

**3. Stripe Configuration**
Add to `app.config.js`:
```javascript
{
  plugins: [
    [
      "@stripe/stripe-react-native",
      {
        merchantIdentifier: "merchant.com.mintenance",
        enableGooglePay: true,
      }
    ]
  ]
}
```

**4. Location Permissions**
Already configured in `app.config.js`:
```javascript
{
  ios: {
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "We need your location to find nearby contractors."
    }
  },
  android: {
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION"
    ]
  }
}
```

---

## 🎯 Navigation Integration

Update your `AppNavigator.tsx`:

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import new screens
import EnhancedHomeScreen from '@/screens/EnhancedHomeScreen';
import ExploreMapScreen from '@/screens/ExploreMapScreen';
import ContractorProfileScreen from '@/screens/ContractorProfileScreen';
import PaymentMethodsScreen from '@/screens/PaymentMethodsScreen';

const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#666',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={EnhancedHomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Explore" 
        component={ExploreMapScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Bookings" 
        component={BookingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Stack Navigator for nested screens
const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="ContractorProfile" component={ContractorProfileScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
    </Stack.Navigator>
  );
}
```

---

## 🚀 API Integration

### Map Screen - Load Contractors
```typescript
// apps/mobile/src/services/ContractorService.ts
export const loadNearbyContractors = async (lat: number, lng: number) => {
  const { data, error } = await supabase
    .from('contractors')
    .select('*')
    .within('location', [lng, lat], 5000); // 5km radius
  
  return data;
};
```

### Payment - Create Payment Intent
```typescript
// Backend endpoint
POST /api/payment/create-intent
{
  "amount": 5000,
  "currency": "usd",
  "customerId": "cus_xxx"
}
```

### Profile - Load Reviews
```typescript
export const loadContractorReviews = async (contractorId: string) => {
  const { data } = await supabase
    .from('reviews')
    .select('*, user:users(*)')
    .eq('contractor_id', contractorId)
    .order('created_at', { ascending: false });
  
  return data;
};
```

---

## 📸 Screenshots Reference

The design is based on the "Signature Salon" app inspiration screenshots:
- Home screen with special offers carousel
- Map-based search with location pins
- User profile with stats and photo grid
- Payment methods with card visualization

---

## ✅ Next Steps

1. **Install dependencies**: `npm install`
2. **Configure Google Maps API key**
3. **Set up Stripe publishable key**
4. **Update navigation** to include new screens
5. **Connect to backend APIs**
6. **Test on real devices**
7. **Deploy updates**

---

## 🎉 Features Implemented

✅ Map-based contractor discovery  
✅ Multiple payment methods with Stripe  
✅ Special offers carousel  
✅ Service categories  
✅ Contractor profiles with photos/reviews  
✅ Location-based search  
✅ Real-time distance calculations  
✅ Professional UI/UX design  

---

**Design System Version**: 1.0.0  
**Last Updated**: January 2025  
**Based on**: Signature Salon UI/UX Inspiration
