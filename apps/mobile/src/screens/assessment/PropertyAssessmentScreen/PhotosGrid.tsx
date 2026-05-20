import React from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { me } from '../../../design-system/mint-editorial';
import { styles } from './styles';

interface Props {
  photos: string[];
  onTakePhoto: () => void;
  onPickFromGallery: () => void;
  onRemovePhoto: (index: number) => void;
}

export const PhotosGrid: React.FC<Props> = ({
  photos,
  onTakePhoto,
  onPickFromGallery,
  onRemovePhoto,
}) => (
  <View style={styles.formSection}>
    <View style={styles.photoHeader}>
      <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
      <TouchableOpacity
        onPress={() =>
          Alert.alert('Add More', 'Choose a source', [
            { text: 'Camera', onPress: onTakePhoto },
            { text: 'Gallery', onPress: onPickFromGallery },
            { text: 'Cancel', style: 'cancel' },
          ])
        }
      >
        <Icon name='add-circle' size={24} color={me.brand} />
      </TouchableOpacity>
    </View>
    <View style={styles.photoGrid}>
      {photos.map((uri, idx) => (
        <View key={idx} style={styles.photoThumb}>
          <Image source={{ uri }} style={styles.photoImage} />
          <TouchableOpacity
            style={styles.photoRemove}
            onPress={() => onRemovePhoto(idx)}
          >
            <Icon name='close' size={14} color='#fff' />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  </View>
);
