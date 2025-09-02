import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

// Simple demo screens
const HomeScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🏠 Mintenance</Text>
      <Text style={styles.subtitle}>Contractor Discovery Marketplace</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome!</Text>
        <Text style={styles.cardText}>
          This is the Mintenance app in demo mode. Here's what you can do:
        </Text>
        
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>• Post maintenance jobs</Text>
          <Text style={styles.featureItem}>• Find qualified contractors</Text>
          <Text style={styles.featureItem}>• Get bids on your projects</Text>
          <Text style={styles.featureItem}>• Message contractors directly</Text>
          <Text style={styles.featureItem}>• Secure payment processing</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚀 App Status</Text>
        <Text style={styles.cardText}>
          The app is running in development mode with demo data. 
          All core features are being prepared for production.
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.button}
        onPress={() => Alert.alert('Demo Mode', 'This feature is being developed. Coming soon!')}
      >
        <Text style={styles.buttonText}>Explore Features</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>👤 Profile</Text>
      
      {user ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome, {user.firstName}!</Text>
          <Text style={styles.cardText}>Email: {user.email}</Text>
          <Text style={styles.cardText}>Role: {user.role}</Text>
          
          <TouchableOpacity style={styles.button} onPress={signOut}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Not Signed In</Text>
          <Text style={styles.cardText}>Please sign in to access your profile.</Text>
        </View>
      )}
    </ScrollView>
  );
};

const AuthScreen = () => {
  const { signIn, signUp, loading } = useAuth();
  
  const handleDemoSignIn = () => {
    signIn('demo@mintenance.com', 'demo123');
  };
  
  const handleDemoSignUp = () => {
    signUp('newuser@mintenance.com', 'demo123', {
      firstName: 'New',
      lastName: 'User',
      role: 'homeowner'
    });
  };
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🔐 Sign In</Text>
      <Text style={styles.subtitle}>Welcome to Mintenance</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Demo Mode</Text>
        <Text style={styles.cardText}>
          Try the app with demo credentials:
        </Text>
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleDemoSignIn}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Signing In...' : 'Demo Sign In'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.buttonSecondary]} 
          onPress={handleDemoSignUp}
        >
          <Text style={[styles.buttonText, styles.buttonSecondaryText]}>Demo Sign Up</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Real Authentication Coming Soon!</Text>
        <Text style={styles.cardText}>
          Full authentication with email, biometrics, and social login will be available in production.
        </Text>
      </View>
    </ScrollView>
  );
};

// Simple tab navigation
const AppNavigator = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = React.useState('home');
  
  const renderScreen = () => {
    if (!user) {
      return <AuthScreen />;
    }
    
    switch (currentTab) {
      case 'home':
        return <HomeScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  };
  
  if (!user) {
    return <AuthScreen />;
  }
  
  return (
    <View style={styles.navigator}>
      <View style={styles.screen}>
        {renderScreen()}
      </View>
      
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, currentTab === 'home' && styles.tabActive]}
          onPress={() => setCurrentTab('home')}
        >
          <Text style={[styles.tabText, currentTab === 'home' && styles.tabTextActive]}>
            🏠 Home
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, currentTab === 'jobs' && styles.tabActive]}
          onPress={() => {
            Alert.alert('Coming Soon', 'Jobs feature is being developed!');
          }}
        >
          <Text style={[styles.tabText, currentTab === 'jobs' && styles.tabTextActive]}>
            💼 Jobs
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, currentTab === 'messages' && styles.tabActive]}
          onPress={() => {
            Alert.alert('Coming Soon', 'Messages feature is being developed!');
          }}
        >
          <Text style={[styles.tabText, currentTab === 'messages' && styles.tabTextActive]}>
            💬 Chat
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, currentTab === 'profile' && styles.tabActive]}
          onPress={() => setCurrentTab('profile')}
        >
          <Text style={[styles.tabText, currentTab === 'profile' && styles.tabTextActive]}>
            👤 Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navigator: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a73e8',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 15,
  },
  featureList: {
    marginTop: 10,
  },
  featureItem: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#1a73e8',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonSecondary: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#1a73e8',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#1a73e8',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#e3f2fd',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#1a73e8',
    fontWeight: '600',
  },
});

export default AppNavigator;