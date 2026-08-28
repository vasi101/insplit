import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../../src/store/auth.store';
import { useRoomStore } from '../../../src/store/room.store';
import { useFeedStore } from '../../../src/store/feed.store';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { uploadImages } from '../../../src/services/api/upload.api';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import { TransactionCategory } from '../../../src/types';

const CATEGORIES: TransactionCategory[] = [
  'GROCERY',
  'FOOD',
  'UTILITIES',
  'RENT',
  'CLEANING',
  'TRANSPORT',
  'MEDICAL',
  'ENTERTAINMENT',
  'OTHER',
];

export default function CreateExpenseScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const currentRoom = useRoomStore((state) => state.currentRoom);
  const members = useRoomStore((state) => state.members);
  const createTx = useFeedStore((state) => state.createTransaction);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('GROCERY');
  const [paidBy, setPaidBy] = useState<string>(user?._id || '');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; amount?: string }>({});

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Permission to access your photos is required to attach receipts.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Permission to access your camera is required to take photos of receipts.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const validate = () => {
    const errs: { title?: string; amount?: string } = {};
    if (!title.trim()) {
      errs.title = 'Title is required';
    }
    const num = parseFloat(amount);
    if (!amount.trim() || isNaN(num) || num <= 0) {
      errs.amount = 'Please enter a valid amount greater than 0';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!currentRoom) {
      Alert.alert('No Room', 'Please select a room before adding expenses.');
      return;
    }
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      let uploadedUrls: string[] = [];
      if (imageUri) {
        try {
          uploadedUrls = await uploadImages([{ uri: imageUri }]);
        } catch {
          // If upload fails (e.g. Cloudinary not configured), still allow transaction creation
          console.warn('Image upload failed, creating transaction without image.');
        }
      }

      await createTx({
        roomId: currentRoom._id,
        title: title.trim(),
        amount: parseFloat(amount),
        currency: 'NPR',
        category,
        paidBy: paidBy || user!._id,
        expenseDate: new Date().toISOString(),
        description: description.trim() || undefined,
        images: uploadedUrls,
      });

      Alert.alert(
        'Expense Created ⏳',
        'Your expense is pending verification. Other room members have been notified to review and approve.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Title & Amount */}
        <Input
          label="Expense Title"
          placeholder="e.g. Cooking Gas, Vegetable Market"
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            if (errors.title) setErrors((p) => ({ ...p, title: undefined }));
          }}
          error={errors.title}
        />

        <Input
          label="Amount (NPR)"
          placeholder="1800"
          value={amount}
          onChangeText={(t) => {
            setAmount(t);
            if (errors.amount) setErrors((p) => ({ ...p, amount: undefined }));
          }}
          keyboardType="decimal-pad"
          error={errors.amount}
          style={styles.amountInput}
        />

        {/* Category Picker Chips */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.7}
                  onPress={() => setCategory(cat)}
                  style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                >
                  <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Paid By Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Paid By</Text>
          <View style={styles.memberChips}>
            {members.map((member) => {
              const memberUser = typeof member?.userId === 'object' && member.userId !== null ? member.userId : null;
              if (!memberUser) return null;
              const isSelected = (paidBy || user?._id) === memberUser._id;
              const isMe = user && memberUser._id === user._id;

              return (
                <TouchableOpacity
                  key={memberUser._id}
                  activeOpacity={0.7}
                  onPress={() => setPaidBy(memberUser._id)}
                  style={[styles.memberChip, isSelected && styles.memberChipSelected]}
                >
                  <Text style={[styles.memberChipText, isSelected && styles.memberChipTextSelected]}>
                    {memberUser.name || 'Member'} {isMe ? '(You)' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Optional Description */}
        <Input
          label="Notes / Description (Optional)"
          placeholder="e.g. Bought from local vendor, receipt included"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={2}
          style={styles.textArea}
        />

        {/* Receipt / Item Photo */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Attach Receipt or Item Photo (Optional)</Text>
          {imageUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
                <Text style={styles.removeImageText}>✕ Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                <Text style={styles.photoBtnIcon}>📷</Text>
                <Text style={styles.photoBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                <Text style={styles.photoBtnIcon}>🖼️</Text>
                <Text style={styles.photoBtnText}>From Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <Button
          title="Submit for Verification"
          onPress={handleSubmit}
          loading={isSubmitting}
          size="lg"
          style={styles.submitBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl * 2,
  },
  amountInput: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  section: {
    marginBottom: Spacing.base,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.xs + 2,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  categoryChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  categoryChipTextSelected: {
    color: Colors.textInverted,
  },
  memberChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  memberChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberChipSelected: {
    backgroundColor: Colors.surfaceSubtle,
    borderColor: Colors.primary,
  },
  memberChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  memberChipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  photoBtnIcon: {
    fontSize: 18,
    marginRight: Spacing.xs,
  },
  photoBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  previewContainer: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.xs,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.md,
  },
  removeImageBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  removeImageText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: Spacing.lg,
  },
});
