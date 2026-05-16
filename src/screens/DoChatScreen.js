import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDoTheme } from '../context/DoThemeContext';
import { CompanionSketch, PulseDot } from '../components/DoAtoms';
import { useAuth } from '../context/AuthContext';
import { getChatMemory, sendMessage } from '../services/chatService';

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

  useEffect(() => {
    let mounted = true;
    getChatMemory()
      .then((history) => {
        if (!mounted || history.length === 0) return;
        historyRef.current = history.slice(-20);
        const restored = history.slice(-20).map((turn, index) => ({
          id: `saved-${index}`,
          from: turn.role === 'assistant' ? 'ai' : 'me',
          text: turn.content,
        }));
        setMessages(restored.length ? restored : SEED);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

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
      <View style={[styles.bubbleRow, isMe ? { justifyContent: 'flex-end' } : { maxWidth: '90%' }]}>
        {isMe ? (
          <LinearGradient
            colors={[P.grad[0], P.grad[1]]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.bubbleMe]}
          >
            <Text style={[styles.bubbleText, { color: '#fff' }]}>{item.text}</Text>
          </LinearGradient>
        ) : (
          <>
            <CompanionSketch size={34} P={P} animated={false} style={styles.messageAvatar} />
            <View style={[styles.bubble, styles.bubbleAi, { backgroundColor: P.surface, borderColor: P.line }]}>
              <Text style={[styles.bubbleText, { color: P.ink }]}>{item.text}</Text>
            </View>
          </>
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
        <View>
          <Text style={[styles.wordmark, { color: P.ink }]}>Do</Text>
        </View>
        <View style={styles.statusWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <PulseDot P={P} />
            <Text style={[styles.headerSub, { color: P.inkSoft }]}>Here whenever you need</Text>
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
        ListHeaderComponent={<Text style={[styles.dayLabel, { color: P.inkMuted }]}>This morning</Text>}
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
              returnKeyType="send"
              submitBehavior="submit"
              style={[styles.input, Platform.OS === 'web' && styles.inputWeb, { color: P.ink }]}
              onSubmitEditing={send}
              onKeyPress={(event) => {
                if (Platform.OS !== 'web') return;
                if (event.nativeEvent.key !== 'Enter' || event.nativeEvent.shiftKey) return;
                event.preventDefault?.();
                send();
              }}
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
  wordmark: { fontSize: 22, fontWeight: '600', letterSpacing: -0.4 },
  statusWrap: { flex: 1, alignItems: 'flex-end', marginRight: 54 },
  headerSub: { fontSize: 13, fontWeight: '400' },

  errorBanner: { backgroundColor: '#b3261e', paddingHorizontal: 16, paddingVertical: 8 },
  errorText: { color: '#fff', fontSize: 13 },

  messageList: { padding: 18, paddingBottom: 8, gap: 10 },
  dayLabel: {
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 10,
  },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 },
  messageAvatar: { marginBottom: -4 },
  bubble: { maxWidth: '78%', padding: 14, borderRadius: 22 },
  bubbleMe: { borderTopRightRadius: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  bubbleAi: { borderTopLeftRadius: 6, borderWidth: 0.5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  bubbleText: { fontSize: 16, lineHeight: 23 },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  typingText: { fontSize: 13 },

  inputWrap: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 0.5 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingLeft: 16, paddingRight: 7, paddingVertical: 5,
    borderRadius: 22, borderWidth: 0.5,
  },
  input: { flex: 1, fontSize: 15, lineHeight: 20, maxHeight: 82, paddingVertical: 5 },
  inputWeb: { outlineStyle: 'none', outlineWidth: 0, boxShadow: 'none' },
  sendBtn: {},
  sendBtnGrad: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
});
