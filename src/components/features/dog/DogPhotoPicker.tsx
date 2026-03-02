/**
 * DogPhotoPicker — 반려견 사진 선택 컴포넌트
 * Granite Native Bridge (pickImage) 연동
 */
import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Text } from 'react-native';
import { colors, typography } from 'styles/tokens';

// Granite 네이티브 모듈 임포트 (가정)
// import { bridge } from '@granite-js/native';

interface Props {
  uri?: string;
  onSelect: (uri: string) => void;
}

export function DogPhotoPicker({ uri, onSelect }: Props) {
  const handlePress = async () => {
    try {
      // 실제 구현 시 Granite Native Bridge 호출
      // const result = await bridge.pickImage({
      //   allowsEditing: true,
      //   aspect: [1, 1],
      //   quality: 0.8,
      // });
      // if (result.uri) onSelect(result.uri);

      // 테스트용 Mock (실제 환경에서는 브릿지 호출로 대체)
      console.log('Image picker triggered');
    } catch (e) {
      console.error('Image picking failed:', e);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.picker} onPress={handlePress} activeOpacity={0.7}>
        {uri ? (
          <Image source={{ uri }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.emoji}>{'\uD83D\uDCF7'}</Text>
          </View>
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>+</Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.hint}>반려견 사진을 등록해주세요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  picker: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    position: 'relative',
    overflow: 'visible',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 32,
  },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
  hint: {
    marginTop: 12,
    ...typography.detail,
    color: colors.textSecondary,
  },
});
