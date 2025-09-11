import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import Button from '../components/ui/Button';
import { HELP_LINKS } from '../config/links';

const HelpCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const faqData = [
    {
      id: '1',
      question: 'How do I post a job?',
      answer: 'To post a job, tap the "+" button in the center of the bottom navigation, select your service category, fill in the job details, and submit. Contractors will be able to see and bid on your job.',
    },
    {
      id: '2',
      question: 'How do I find contractors?',
      answer: 'Use the Contractor Discovery feature by tapping on "Find Contractors" from the home screen. You can swipe through contractor profiles and connect with ones that match your needs.',
    },
    {
      id: '3',
      question: 'How does payment work?',
      answer: 'We use an escrow system for secure payments. When you accept a bid, the payment is held securely until the job is completed to your satisfaction. Then the payment is released to the contractor.',
    },
    {
      id: '4',
      question: 'What if I\'m not satisfied with the work?',
      answer: 'If you\'re not satisfied, contact the contractor first to resolve the issue. If that doesn\'t work, contact our support team through the app and we\'ll help mediate the situation.',
    },
    {
      id: '5',
      question: 'How do I become a verified contractor?',
      answer: 'To become verified, complete your profile, upload required licenses and insurance documents, and pass our background check. Verified contractors get priority in search results.',
    },
    {
      id: '6',
      question: 'Can I cancel a job after posting?',
      answer: 'Yes, you can cancel a job before accepting any bids without any fees. If you\'ve already accepted a bid, cancellation policies may apply.',
    },
  ];

  const quickActions = [
    {
      id: 'contact',
      title: 'Contact Support',
      description: 'Get help from our support team',
      icon: 'headset',
      action: () => handleContactSupport(),
    },
    {
      id: 'chat',
      title: 'Live Chat',
      description: 'Chat with us in real-time',
      icon: 'chatbubbles',
      action: () => handleLiveChat(),
    },
    {
      id: 'call',
      title: 'Call Us',
      description: '1-800-MINT-HELP',
      icon: 'call',
      action: () => handlePhoneCall(),
    },
    {
      id: 'email',
      title: 'Email Support',
      description: 'support@mintenance.com',
      icon: 'mail',
      action: () => handleEmailSupport(),
    },
  ];

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Choose how you\'d like to contact our support team:',
      [
        { text: 'Email', onPress: handleEmailSupport },
        { text: 'Phone', onPress: handlePhoneCall },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLiveChat = () => {
    Alert.alert('Live Chat', 'Live chat is coming soon! Please use email or phone support for now.');
  };

  const handlePhoneCall = () => {
    Linking.openURL('tel:+18006468435');
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@mintenance.com?subject=Support Request');
  };

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const filteredFaqs = faqData.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={theme.colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for help..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get Help Now</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map(action => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={action.action}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name={action.icon as any} size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionDescription}>{action.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {filteredFaqs.map(faq => (
            <TouchableOpacity
              key={faq.id}
              style={styles.faqItem}
              onPress={() => toggleFaq(faq.id)}
            >
              <View style={styles.faqQuestion}>
                <Text style={styles.faqQuestionText}>{faq.question}</Text>
                <Ionicons
                  name={expandedFaq === faq.id ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.colors.textTertiary}
                />
              </View>
              {expandedFaq === faq.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          
      {filteredFaqs.length === 0 && searchQuery && (
        <View style={styles.noResults}>
          <Ionicons name="search" size={48} color={theme.colors.textTertiary} />
          <Text style={styles.noResultsText}>No results found</Text>
          <Text style={styles.noResultsSubtext}>
            Try different keywords or contact support
          </Text>
        </View>
      )}
    </View>

    {/* Additional Resources */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Additional Resources</Text>
          
          <TouchableOpacity style={styles.resourceItem} onPress={() => Linking.openURL(HELP_LINKS.userGuide)}>
            <View style={styles.resourceLeft}>
              <Ionicons name="book" size={20} color={theme.colors.primary} />
              <Text style={styles.resourceText}>User Guide</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resourceItem} onPress={() => Linking.openURL(HELP_LINKS.videos)}>
            <View style={styles.resourceLeft}>
              <Ionicons name="play-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.resourceText}>Video Tutorials</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resourceItem} onPress={() => Linking.openURL(HELP_LINKS.knowledgeBase)}>
            <View style={styles.resourceLeft}>
              <Ionicons name="globe" size={20} color={theme.colors.primary} />
              <Text style={styles.resourceText}>Knowledge Base</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resourceItem} onPress={() => Linking.openURL(HELP_LINKS.community)}>
            <View style={styles.resourceLeft}>
              <Ionicons name="people" size={20} color={theme.colors.primary} />
              <Text style={styles.resourceText}>Community Forum</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>

      <Button
        variant="primary"
        title="Contact Support"
        onPress={handleContactSupport}
        fullWidth
        style={{ marginTop: 16 }}
      />
    </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textInverse,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  searchSection: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  section: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionDescription: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    paddingVertical: 16,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  faqAnswerText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.textTertiary,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  resourceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resourceText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginLeft: 12,
  },
  bottomPadding: {
    height: 32,
  },
});

export default HelpCenterScreen;
