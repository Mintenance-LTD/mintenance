import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BeforeAfterSlider } from '../../../components/BeforeAfterSlider';
import { theme } from '../../../theme';
import { styles } from '../photoReviewStyles';

interface PhotoInfo {
  url: string;
  id: string;
  timestamp?: string;
}

interface PhotoPair {
  before: PhotoInfo;
  after: PhotoInfo;
}

interface BeforeAfterSliderViewProps {
  photoPairs: PhotoPair[];
  activePairIndex: number;
  onSelectPair: (index: number) => void;
}

export const BeforeAfterSliderView: React.FC<BeforeAfterSliderViewProps> = ({
  photoPairs,
  activePairIndex,
  onSelectPair,
}) => {
  const currentPair = photoPairs[activePairIndex];
  if (!currentPair) return null;

  return (
    <>
      {/* Before/After Slider */}
      <View style={styles.sliderContainer}>
        <BeforeAfterSlider
          beforeUrl={currentPair.before.url}
          afterUrl={currentPair.after.url}
          height={320}
        />
        {/* Photo Timestamps */}
        {(currentPair.before.timestamp || currentPair.after.timestamp) && (
          <View style={styles.timestampRow}>
            {currentPair.before.timestamp && (
              <View style={styles.timestampBadge}>
                <Ionicons
                  name='camera-outline'
                  size={12}
                  color={theme.colors.textTertiary}
                />
                <Text style={styles.timestampText}>
                  Before:{' '}
                  {new Date(currentPair.before.timestamp).toLocaleDateString(
                    'en-GB',
                    {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </Text>
              </View>
            )}
            {currentPair.after.timestamp && (
              <View style={styles.timestampBadge}>
                <Ionicons
                  name='checkmark-circle-outline'
                  size={12}
                  color={theme.colors.textTertiary}
                />
                <Text style={styles.timestampText}>
                  After:{' '}
                  {new Date(currentPair.after.timestamp).toLocaleDateString(
                    'en-GB',
                    {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Photo Pair Thumbnails */}
      {photoPairs.length > 1 && (
        <ScrollView
          horizontal
          style={styles.thumbnailRow}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailContent}
        >
          {photoPairs.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.thumbnail,
                index === activePairIndex && styles.thumbnailActive,
              ]}
              onPress={() => onSelectPair(index)}
              accessibilityRole='button'
              accessibilityLabel={`Photo pair ${index + 1} of ${photoPairs.length}`}
            >
              <Text style={styles.thumbnailText}>{index + 1}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Instructions */}
      <View style={styles.instructions}>
        <Ionicons
          name='information-circle-outline'
          size={20}
          color={theme.colors.textTertiary}
        />
        <Text style={styles.instructionsText}>
          Drag the slider to compare before and after photos. Approve if
          satisfied, or request changes.
        </Text>
      </View>
    </>
  );
};
