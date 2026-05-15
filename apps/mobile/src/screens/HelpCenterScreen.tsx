import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { HELP_LINKS } from '../config/links';
import { me } from '../design-system/mint-editorial';

const QUICK_ACTION_STYLES: Record<
  string,
  { iconColor: string; iconBg: string }
> = {
  contact: { iconColor: '#3B82F6', iconBg: '#DBEAFE' },
  chat: { iconColor: '#8B5CF6', iconBg: '#EDE9FE' },
  call: { iconColor: me.brand, iconBg: me.brandSoft },
  email: { iconColor: me.accent, iconBg: me.warnBg },
};

const RESOURCE_STYLES: Record<string, { iconColor: string; iconBg: string }> = {
  book: { iconColor: '#3B82F6', iconBg: '#DBEAFE' },
  'play-circle': { iconColor: me.errFg, iconBg: me.errBg },
  globe: { iconColor: '#8B5CF6', iconBg: '#EDE9FE' },
  people: {
    iconColor: me.brand,
    iconBg: me.brandSoft,
  },
};

const HelpCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const faqData = [
    {
      id: '1',
      question: 'How do I post a job?',
      answer:
        'To post a job, tap the "+" button in the center of the bottom navigation, select your service category, fill in the job details, and submit. Contractors will be able to see and bid on your job.',
    },
    {
      id: '2',
      question: 'How do I find contractors?',
      answer:
        'Use the Contractor Discovery feature by tapping on "Find Contractors" from the home screen. You can swipe through contractor profiles and connect with ones that match your needs.',
    },
    {
      id: '3',
      question: 'How does payment work?',
      answer:
        'We use an escrow system for secure payments. When you accept a bid, the payment is held securely until the job is completed to your satisfaction. Then the payment is released to the contractor.',
    },
    {
      id: '4',
      question: "What if I'm not satisfied with the work?",
      answer:
        "If you're not satisfied, contact the contractor first to resolve the issue. If that doesn't work, contact our support team through the app and we'll help mediate the situation.",
    },
    {
      id: '5',
      question: 'How do I become a verified contractor?',
      answer:
        'To become verified, complete your profile, upload required licenses and insurance documents, and pass our background check. Verified contractors get priority in search results.',
    },
    {
      id: '6',
      question: 'Can I cancel a job after posting?',
      answer:
        "Yes, you can cancel a job before accepting any bids without any fees. If you've already accepted a bid, cancellation policies may apply.",
    },
  ];

  const quickActions = [
    {
      id: 'contact',
      title: 'Contact Support',
      description: 'Get help from our team',
      icon: 'headset',
      action: () => handleContactSupport(),
    },
    {
      id: 'chat',
      title: 'Live Chat',
      description: 'Chat in real-time',
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
      description: 'support@mintenance.co.uk',
      icon: 'mail',
      action: () => handleEmailSupport(),
    },
  ];

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      "Choose how you'd like to contact our support team:",
      [
        { text: 'Email', onPress: handleEmailSupport },
        { text: 'Phone', onPress: handlePhoneCall },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLiveChat = () => {
    Alert.alert(
      'Live Chat',
      'Live chat is coming soon! Please use email or phone support for now.'
    );
  };

  const handlePhoneCall = () => {
    Linking.openURL('tel:+18006468435');
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@mintenance.co.uk?subject=Support Request');
  };

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const filteredFaqs = faqData.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resources = [
    { icon: 'book' as const, label: 'User Guide', url: HELP_LINKS.userGuide },
    {
      icon: 'play-circle' as const,
      label: 'Video Tutorials',
      url: HELP_LINKS.videos,
    },
    {
      icon: 'globe' as const,
      label: 'Knowledge Base',
      url: HELP_LINKS.knowledgeBase,
    },
    {
      icon: 'people' as const,
      label: 'Community Forum',
      url: HELP_LINKS.community,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <Input
            placeholder='Search for help...'
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon='search'
            variant='outline'
            size='lg'
            fullWidth
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get Help Now</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => {
              const colors = QUICK_ACTION_STYLES[action.id] || {
                iconColor: me.ink2,
                iconBg: me.bg2,
              };
              return (
                <TouchableOpacity
                  key={action.id}
                  style={styles.quickActionCard}
                  onPress={action.action}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.quickActionIcon,
                      { backgroundColor: colors.iconBg },
                    ]}
                  >
                    <Ionicons
                      name={action.icon as keyof typeof Ionicons.glyphMap}
                      size={22}
                      color={colors.iconColor}
                    />
                  </View>
                  <Text style={styles.quickActionTitle}>{action.title}</Text>
                  <Text style={styles.quickActionDescription}>
                    {action.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {filteredFaqs.map((faq, idx) => (
            <TouchableOpacity
              key={faq.id}
              style={[
                styles.faqItem,
                idx < filteredFaqs.length - 1 && styles.faqItemBorder,
              ]}
              onPress={() => toggleFaq(faq.id)}
              activeOpacity={0.7}
            >
              <View style={styles.faqQuestion}>
                <Text style={styles.faqQuestionText}>{faq.question}</Text>
                <View
                  style={[
                    styles.faqChevronWrap,
                    expandedFaq === faq.id && styles.faqChevronActive,
                  ]}
                >
                  <Ionicons
                    name={
                      expandedFaq === faq.id ? 'chevron-up' : 'chevron-down'
                    }
                    size={16}
                    color={expandedFaq === faq.id ? me.onBrand : me.ink3}
                  />
                </View>
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
              <View style={styles.noResultsIconWrap}>
                <Ionicons name='search' size={28} color={me.ink3} />
              </View>
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

          {resources.map((res, idx) => {
            const colors = RESOURCE_STYLES[res.icon] || {
              iconColor: me.ink2,
              iconBg: me.bg2,
            };
            return (
              <TouchableOpacity
                key={res.icon}
                style={[
                  styles.resourceItem,
                  idx < resources.length - 1 && styles.resourceItemBorder,
                ]}
                onPress={() => Linking.openURL(res.url)}
                activeOpacity={0.7}
              >
                <View style={styles.resourceLeft}>
                  <View
                    style={[
                      styles.resourceIconWrap,
                      { backgroundColor: colors.iconBg },
                    ]}
                  >
                    <Ionicons
                      name={res.icon}
                      size={17}
                      color={colors.iconColor}
                    />
                  </View>
                  <Text style={styles.resourceText}>{res.label}</Text>
                </View>
                <Ionicons name='chevron-forward' size={14} color={me.ink3} />
              </TouchableOpacity>
            );
          })}

          <Button
            variant='primary'
            title='Contact Support'
            onPress={handleContactSupport}
            fullWidth
            style={{ marginTop: 16, borderRadius: 28 }}
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
    backgroundColor: me.bg2,
  },
  header: {
    backgroundColor: me.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
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
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
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
    backgroundColor: me.surface,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    ...me.shadow.card,
  },
  section: {
    backgroundColor: me.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    ...me.shadow.card,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: me.bg2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: me.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionDescription: {
    fontSize: 11,
    color: me.ink2,
    textAlign: 'center',
  },
  faqItem: {
    paddingVertical: 14,
  },
  faqItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestionText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
    flex: 1,
    marginRight: 12,
  },
  faqChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqChevronActive: {
    backgroundColor: me.ink,
  },
  faqAnswer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
  },
  faqAnswerText: {
    fontSize: 14,
    color: me.ink2,
    lineHeight: 21,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noResultsIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  noResultsText: {
    fontSize: 17,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 13,
    color: me.ink2,
    textAlign: 'center',
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  resourceItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  resourceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resourceIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceText: {
    fontSize: 15,
    fontWeight: '500',
    color: me.ink,
  },
  bottomPadding: {
    height: 32,
  },
});

export default HelpCenterScreen;
