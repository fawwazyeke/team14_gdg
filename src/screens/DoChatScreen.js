import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDoTheme } from '../context/DoThemeContext';
import { CompanionOrb, PulseDot } from '../components/DoAtoms';
import { useAuth } from '../context/AuthContext';
import { sendMessage } from '../services/chatService';

const SEED = [
  { id: '0', from: 'ai', text: "Hey. I'm glad you're here. How's today landing for you?" },
];

export default function DoChatScreen() {
  const { P } = useDoTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState(SEED);
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const historyRef = useRef([]);

  const userProfile = { interests: profile?.interests || [], nickname: profile?.nickname || '' };

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || isTyping) return;
    setDraft('');
    setError('');

    const userMsg = { id: Date.now().toString(), from: 'me', text };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    historyRef.current = [...historyRef.current, { role: 'user', content: text }].slice(-20);

    try {
      const bot = await sendMessage(text, historyRef.current, userProfile);
      const aiMsg = { id: bot._id.toString(), from: 'ai', text: bot.text };
      historyRef.current = [...historyRef.current, { role: 'assistant', content: bot.text }].slice(-20);
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setError('Could not reach the AI. Check the backend.');
    } finally {
      setIsTyping(false);
    }
  }, [draft, isTyping, userProfile]);

  const renderItem = ({ item }) => {
    const isMe = item.from === 'me';
    return (
      <View style={[styles.bubbleRow, isMe && { justifyContent: 'flex-end' }]}>
        {isMe ? (
          <LinearGradient
            colors={[P.grad[0], P.grad[1]]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.bubbleMe]}
          >
            <Text style={[styles.bubbleText, { color: '#fff' }]}>{item.text}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.bubbleAi, { backgroundColor: P.surface, borderColor: P.line }]}>
            <Text style={[styles.bubbleText, { color: P.ink }]}>{item.text}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: P.bg }]}>
      {/* Header */}
      <LinearGradient
        colors={[P.wash + 'CC', P.bg]}
        style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: P.line }]}
      >
        <CompanionOrb size={52} P={P} animated />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: P.ink }]}>Your Companion</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <PulseDot P={P} />
            <Text style={[styles.headerSub, { color: P.inkSoft }]}>Here whenever you need.</Text>
          </View>
        </View>
      </LinearGradient>

      {error ? (
        <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>
      ) : null}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {isTyping && (
        <View style={[styles.typingRow, { backgroundColor: P.bg }]}>
          <ActivityIndicator size="small" color={P.primary} />
          <Text style={[styles.typingText, { color: P.inkMuted }]}>Companion is thinking…</Text>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.inputWrap, { borderTopColor: P.line, backgroundColor: P.bg, paddingBottom: insets.bottom + 80 }]}>
          <View style={[styles.inputBox, { backgroundColor: P.surface, borderColor: P.line }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="What's on your mind?"
              placeholderTextColor={P.inkMuted}
              multiline
              style={[styles.input, { color: P.ink }]}
              onSubmitEditing={send}
            />
            <TouchableOpacity onPress={send} disabled={!draft.trim() || isTyping} style={styles.sendBtn}>
              <LinearGradient
                colors={draft.trim() ? [P.grad[0], P.grad[2]] : [P.surfaceQuiet, P.surfaceQuiet]}
                style={styles.sendBtnGrad}
              >
                <Text style={{ color: draft.trim() ? '#fff' : P.inkMuted, fontSize: 18 }}>↑</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, fontWeight: '400' },

  errorBanner: { backgroundColor: '#b3261e', paddingHorizontal: 16, paddingVertical: 8 },
  errorText: { color: '#fff', fontSize: 13 },

  messageList: { padding: 18, paddingBottom: 8, gap: 10 },
  bubbleRow: { flexDirection: 'row', marginBottom: 10 },
  bubble: { maxWidth: '78%', padding: 14, borderRadius: 22 },
  bubbleMe: { borderTopRightRadius: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  bubbleAi: { borderTopLeftRadius: 6, borderWidth: 0.5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  bubbleText: { fontSize: 16, lineHeight: 23 },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  typingText: { fontSize: 13 },

  inputWrap: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 0.5 },
  inputBox: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingLeft: 18, paddingRight: 8, paddingVertical: 8,
    borderRadius: 26, borderWidth: 0.5,
  },
  input: { flex: 1, fontSize: 16, lineHeight: 22, maxHeight: 100, paddingVertical: 8 },
  sendBtn: { marginBottom: 2 },
  sendBtnGrad: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
});
