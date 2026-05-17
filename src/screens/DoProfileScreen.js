import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useDoTheme } from '../context/DoThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { MOODS } from '../theme/doTheme';
import { Card, Chip } from '../components/DoAtoms';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/backendClient';
import { ensureBackendProfile } from '../services/onboardingSurveyService';
import { saveUserProfile, saveUserPreferences } from '../services/firebaseProfileService';

const INTERESTS = [
  { id: 'sports',  label: 'Sports',  emoji: '⚽' },
  { id: 'music',   label: 'Music',   emoji: '🎵' },
  { id: 'gaming',  label: 'Gaming',  emoji: '🎮' },
  { id: 'art',     label: 'Art',     emoji: '🎨' },
  { id: 'books',   label: 'Books',   emoji: '📖' },
  { id: 'nature',  label: 'Nature',  emoji: '🌿' },
  { id: 'food',    label: 'Food',    emoji: '🥖' },
  { id: 'tech',    label: 'Tech',    emoji: '💡' },
  { id: 'film',    label: 'Film',    emoji: '🎬' },
  { id: 'fitness', label: 'Fitness', emoji: '🏃' },
];

const LANGUAGES = [
  { code: 'en', flag: '🇺🇸' },
  { code: 'ko', flag: '🇰🇷' },
  { code: 'ja', flag: '🇯🇵' },
];

function MoodSwatch({ id, m, active, onPress, P }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.swatchBtn} activeOpacity={0.7}>
      <LinearGradient
        colors={[m.grad[0], m.grad[1], m.grad[2]]}
        style={[styles.swatch, active && { transform: [{ scale: 1.08 }] }]}
      >
        <View style={[styles.swatchAccent, { backgroundColor: m.accent, borderColor: P.bg }]} />
        {active && (
          <View style={[styles.swatchCheck, { borderColor: P.bg }]}>
            <View style={[styles.swatchDot, { backgroundColor: P.bg }]} />
          </View>
        )}
      </LinearGradient>
      <Text style={[styles.swatchName, { color: active ? P.ink : P.inkSoft }]}>{m.name}</Text>
    </TouchableOpacity>
  );
}

export default function DoProfileScreen() {
  const { P, mood, setMood, mode, setMode } = useDoTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user, profile, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const name = profile?.nickname || user?.displayName || 'You';
  const initial = name.charAt(0).toUpperCase();

  const [interests, setInterests] = useState(profile?.interests || []);
  const [interestSaving, setInterestSaving] = useState(false);

  const toggleInterest = async (id) => {
    const updated = interests.includes(id)
      ? interests.filter(i => i !== id)
      : [...interests, id];
    setInterests(updated);
    setInterestSaving(true);
    try {
      await saveUserProfile({
        uid: user.uid,
        nickname: name,
        email: user?.email ?? null,
        photoURL: user?.photoURL ?? null,
        interests: updated,
      });
      showToast(t('save') + ' ✓');
    } catch {
      showToast('Could not save');
    } finally {
      setInterestSaving(false);
    }
  };

  const [score, setScore] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (!user || !name) return;
      let mounted = true;
      ensureBackendProfile({ nickname: name, interests, age: profile?.age })
        .then(() => apiFetch('/users/me'))
        .then(data => { if (mounted) setScore(data.stability_score ?? 0); })
        .catch(() => { if (mounted) setScore(0); });
      return () => { mounted = false; };
    }, [user, name, interests, profile?.age])
  );

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 1800);
  };

  const save = () => { setEditing(false); showToast('✓ ' + t('save')); };

  const handleSetLanguage = async (code) => {
    await setLanguage(code);
    if (user) {
      saveUserPreferences(user.uid, { language: code }).catch(() => {});
    }
    showToast('✓');
  };

  return (
    <View style={[styles.root, { backgroundColor: P.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={{ paddingTop: insets.top + 8 }} />

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <LinearGradient colors={[P.grad[0], P.grad[1], P.grad[2]]} style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </LinearGradient>

          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                autoFocus
                style={[styles.nameInput, { color: P.ink, borderBottomColor: P.primary }]}
              />
              <View style={styles.editBtns}>
                <TouchableOpacity onPress={() => setEditing(false)} style={[styles.editCancel, { borderColor: P.line }]}>
                  <Text style={{ color: P.inkSoft, fontSize: 13 }}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={save} activeOpacity={0.85}>
                  <LinearGradient colors={[P.grad[0], P.grad[1]]} style={styles.editSave}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{t('save')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setDraft(name); setEditing(true); }} style={styles.nameRow}>
              <Text style={[styles.displayName, { color: P.ink }]}>{name}</Text>
              <Text style={[styles.editIcon, { color: P.inkMuted }]}> ✎</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.daysIn, { color: P.inkMuted }]}>{t('profile_stability_score')}: {score ?? '…'}</Text>
        </View>

        {/* Journey card */}
        <View style={styles.section}>
          <Card P={P} style={{ padding: 18 }}>
            <Text style={[styles.sectionMicro, { color: P.inkMuted }]}>{t('profile_journey')}</Text>
            <View style={{ flexDirection: 'row', gap: 18, marginTop: 10 }}>
              {[[t('profile_score'), score ?? '…'], [t('profile_days'), '–'], [t('profile_chats'), '–']].map(([label, val]) => (
                <View key={label} style={{ flex: 1 }}>
                  <Text style={[styles.statVal, { color: P.ink }]}>{val}</Text>
                  <Text style={[styles.statLabel, { color: P.inkSoft }]}>{label}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.journeyNote, { color: P.inkSoft }]}>{t('profile_journey_note')}</Text>
          </Card>
        </View>

        {/* Mood (accent colour) */}
        <View style={[styles.section, { paddingHorizontal: 24 }]}>
          <Text style={[styles.sectionTitle, { color: P.ink }]}>{t('profile_mood')}</Text>
          <Text style={[styles.sectionSub, { color: P.inkSoft }]}>{t('profile_mood_sub')}</Text>
          <View style={styles.swatchGrid}>
            {Object.entries(MOODS).map(([id, m]) => (
              <MoodSwatch key={id} id={id} m={m} active={mood === id} onPress={() => setMood(id)} P={P} />
            ))}
          </View>
        </View>

        {/* Theme (light / dark) */}
        <View style={[styles.section, { paddingHorizontal: 24 }]}>
          <Text style={[styles.sectionTitle, { color: P.ink }]}>{t('profile_theme')}</Text>
          <Text style={[styles.sectionSub, { color: P.inkSoft }]}>{t('profile_theme_sub')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              ['light', t('profile_theme_light'), '☀️', t('profile_theme_morning')],
              ['dark',  t('profile_theme_dark'),  '🌙', t('profile_theme_evening')],
            ].map(([m, label, illo, sub]) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={[styles.themeTile, {
                  backgroundColor: mode === m ? P.surface : 'transparent',
                  borderColor: mode === m ? P.primary : P.line,
                }]}
              >
                <Text style={{ fontSize: 28 }}>{illo}</Text>
                <Text style={[styles.themeLabel, { color: P.ink }]}>{label}</Text>
                <Text style={[styles.themeSub, { color: P.inkSoft }]}>{sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Language */}
        <View style={[styles.section, { paddingHorizontal: 24 }]}>
          <Text style={[styles.sectionTitle, { color: P.ink }]}>{t('profile_language')}</Text>
          <Text style={[styles.sectionSub, { color: P.inkSoft }]}>{t('profile_language_sub')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {LANGUAGES.map(({ code, flag }) => {
              const active = language === code;
              return (
                <TouchableOpacity
                  key={code}
                  onPress={() => handleSetLanguage(code)}
                  style={[styles.langTile, {
                    backgroundColor: active ? P.surface : 'transparent',
                    borderColor: active ? P.primary : P.line,
                  }]}
                >
                  <Text style={{ fontSize: 26 }}>{flag}</Text>
                  <Text style={[styles.langCode, { color: active ? P.ink : P.inkSoft }]}>
                    {t(`lang_${code}`)}
                  </Text>
                  {active && (
                    <View style={[styles.langDot, { backgroundColor: P.primary }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Interests */}
        <View style={[styles.section, { paddingHorizontal: 24 }]}>
          <Text style={[styles.sectionTitle, { color: P.ink }]}>{t('profile_interests')}</Text>
          <Text style={[styles.sectionSub, { color: P.inkSoft }]}>{t('profile_interests_sub')}</Text>
          <View style={styles.chipsWrap}>
            {INTERESTS.map(it => (
              <Chip
                key={it.id}
                P={P}
                active={interests.includes(it.id)}
                onPress={() => toggleInterest(it.id)}
                icon={it.emoji}
                disabled={interestSaving}
              >
                {it.label}
              </Chip>
            ))}
          </View>
        </View>

        {/* Settings rows */}
        <View style={styles.section}>
          <Card P={P} style={{ overflow: 'hidden' }}>
            {[
              [t('profile_notifications'),  t('profile_notifications_sub')],
              [t('profile_how_do_works'),   t('profile_how_do_works_sub')],
              [t('profile_privacy'),        t('profile_privacy_sub')],
            ].map((row, i, arr) => (
              <View key={row[0]} style={[styles.settingsRow, {
                borderBottomWidth: i < arr.length - 1 ? 0.5 : 0,
                borderBottomColor: P.line,
              }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingsLabel, { color: P.ink }]}>{row[0]}</Text>
                  <Text style={[styles.settingsSub, { color: P.inkMuted }]}>{row[1]}</Text>
                </View>
                <Text style={{ color: P.inkMuted, fontSize: 18 }}>→</Text>
              </View>
            ))}
            <TouchableOpacity onPress={signOut} style={[styles.settingsRow, { borderTopWidth: 0.5, borderTopColor: P.line }]}>
              <Text style={{ color: '#b3261e', fontSize: 15, fontWeight: '500' }}>{t('profile_sign_out')}</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>

      {toastMsg && (
        <View style={[styles.toast, { backgroundColor: P.ink }]}>
          <Text style={{ color: P.bg, fontSize: 13, fontWeight: '500' }}>{toastMsg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 20,
  },
  avatarText: { fontSize: 42, fontWeight: '500', color: '#fff' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  displayName: { fontSize: 32, fontWeight: '500', letterSpacing: -0.5 },
  editIcon: { fontSize: 18 },
  daysIn: { fontSize: 13, marginTop: 4 },
  editRow: { alignItems: 'center', gap: 10 },
  nameInput: {
    fontSize: 28, fontWeight: '400', textAlign: 'center',
    borderBottomWidth: 1.5, paddingHorizontal: 8, paddingVertical: 4, minWidth: 160,
    backgroundColor: 'transparent',
  },
  editBtns: { flexDirection: 'row', gap: 10 },
  editCancel: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1 },
  editSave: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999 },

  section: { paddingHorizontal: 20, marginBottom: 16 },
  sectionMicro: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  sectionSub: { fontSize: 13, marginBottom: 16, lineHeight: 19 },

  statVal: { fontSize: 30, fontWeight: '500', letterSpacing: -0.5 },
  statLabel: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  journeyNote: { fontSize: 13, marginTop: 14, lineHeight: 19 },

  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  swatchBtn: { alignItems: 'center', gap: 6, width: '18%' },
  swatch: { width: 46, height: 46, borderRadius: 23 },
  swatchAccent: { position: 'absolute', right: -2, bottom: -2, width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  swatchCheck: { position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatchDot: { width: 6, height: 6, borderRadius: 3 },
  swatchName: { fontSize: 10, fontWeight: '500' },

  themeTile: {
    flex: 1, padding: 14, borderRadius: 16, borderWidth: 1.5,
    alignItems: 'center', gap: 4,
  },
  themeLabel: { fontSize: 15, fontWeight: '600' },
  themeSub: { fontSize: 12 },

  langTile: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: 16, borderWidth: 1.5,
    alignItems: 'center', gap: 6,
    position: 'relative',
  },
  langCode: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  langDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
  },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  settingsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 12 },
  settingsLabel: { fontSize: 15, fontWeight: '500' },
  settingsSub: { fontSize: 12, marginTop: 2 },

  toast: {
    position: 'absolute', bottom: 120, alignSelf: 'center',
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 20,
  },
});
