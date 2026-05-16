import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { userStorageKeys } from '../services/firebaseProfileService';
import { colors } from '../theme/colors';

const INTERESTS = ['Sports', 'Music', 'Gaming', 'Art', 'Books', 'Nature', 'Food', 'Tech'];

const ProfileScreen = () => {
  const { user, profile, signOut, completeProfile } = useAuth();
  const [name, setName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    const keys = userStorageKeys(user.uid);
    AsyncStorage.multiGet([keys.name, keys.interests]).then(pairs => {
      setName(pairs[0][1] || profile?.nickname || '');
      setSelectedInterests(JSON.parse(pairs[1][1] || '[]'));
    });
  }, [profile, user]);

  const save = async () => {
    if (!user) {
      return;
    }

    const keys = userStorageKeys(user.uid);
    await AsyncStorage.multiSet([
      [keys.name, name],
      [keys.interests, JSON.stringify(selectedInterests)],
    ]);
    await completeProfile(name, { interests: selectedInterests });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleInterest = (interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const initial = name ? name[0].toUpperCase() : '?';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>

      {editing ? (
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.textLight}
          autoFocus
        />
      ) : (
        <Text style={styles.name}>{name || 'Set your name'}</Text>
      )}

      <TouchableOpacity
        style={styles.editButton}
        onPress={editing ? save : () => setEditing(true)}
      >
        <Text style={styles.editButtonText}>{editing ? 'Save' : 'Edit Name'}</Text>
      </TouchableOpacity>

      {saved && <Text style={styles.savedText}>✓ Saved!</Text>}

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Your Interests</Text>
      <Text style={styles.sectionSubtitle}>
        We'll use these to suggest relevant events and missions.
      </Text>

      <View style={styles.chips}>
        {INTERESTS.map(interest => {
          const active = selectedInterests.includes(interest);
          return (
            <TouchableOpacity
              key={interest}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleInterest(interest)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {interest}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={save}>
        <Text style={styles.saveButtonText}>Save Interests</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutButtonText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 38,
    color: '#fff',
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  nameInput: {
    fontSize: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    width: '80%',
    textAlign: 'center',
    marginBottom: 12,
    paddingVertical: 4,
    color: colors.text,
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  savedText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textLight,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    marginBottom: 24,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textLight,
    fontWeight: '500',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signOutButton: {
    marginTop: 12,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
  },
  signOutButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ProfileScreen;
