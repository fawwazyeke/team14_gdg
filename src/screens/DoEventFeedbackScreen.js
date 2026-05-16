import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDoTheme } from '../context/DoThemeContext';
import {
  sendFeedbackMessage,
  completeFeedback,
  getFeedbackMessages,
} from '../services/eventsService';

export default function DoEventFeedbackScreen() {
  const { P } = useDoTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute();
  const { participation } = params;  // EventParticipationResponse shape

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [done, setDone] = useState(participation?.feedback_completed || false);
  const [result, setResult] = useState(null);  // EventFeedbackCompleteResponse

  const scrollRef = useRef(null);

  // Load existing conversation if any
  useEffect(() => {
    getFeedbackMessages(participation.event_id)
      .then(data => {
        if (Array.isArray(data?.messages)) setMessages(data.messages);
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [participation.event_id]);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const optimisticUser = { role: 'user', content: text };
    setMessages(prev => [...prev, optimisticUser]);
    scrollToBottom();

    try {
      const data = await sendFeedbackMessage(participation.event_id, text);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      scrollToBottom();
    } catch (e) {
      setInput(text); // restore for retry
      setMessages(prev => prev.filter(m => m !== optimisticUser));
      Alert.alert('Could not send', e?.message || 'Try again.');
    } finally {
      setSending(false);
    }
  };

  const finish = async () => {
    if (completing) return;
    const userTurns = messages.filter(m => m.role === 'user');
    if (userTurns.length === 0) {
      Alert.alert('Share first', 'Tell Do how it went before wrapping up.');
      return;
    }

    Alert.alert(
      'Done reflecting?',
      'Do will read your conversation and score your reflection. This can\'t be undone.',
      [
        { text: 'Keep talking', style: 'cancel' },
        {
          text: 'Yes, finish',
          onPress: async () => {
            setCompleting(true);
            try {
              const data = await completeFeedback(participation.event_id);
              setResult(data);
              setDone(true);
              scrollToBottom();
            } catch (e) {
              Alert.alert('Error', e?.message || 'Could not complete feedback.');
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
  };

  const openingPrompt = messages.length === 0 && !loadingHistory;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: P.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: P.line, backgroundColor: P.bg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: P.inkSoft }]}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: P.ink }]} numberOfLines={1}>
            {participation.event_title}
          </Text>
          <Text style={[styles.headerSub, { color: P.inkMuted }]}>Reflect with Do</Text>
        </View>
        {!done && (
          <TouchableOpacity onPress={finish} disabled={completing} style={styles.doneBtn}>
            {completing
              ? <ActivityIndicator size="small" color={P.primary} />
              : <Text style={[styles.doneBtnText, { color: P.primary }]}>Done</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.messageList, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      >
        {loadingHistory ? (
          <ActivityIndicator color={P.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Opening prompt from Do */}
            {openingPrompt && (
              <View style={[styles.bubble, styles.bubbleAssistant, { backgroundColor: P.surface }]}>
                <Text style={[styles.bubbleText, { color: P.ink }]}>
                  How did "{participation.event_title}" go for you? I'd love to hear about it.
                </Text>
              </View>
            )}

            {messages.map((msg, i) => (
              <View
                key={i}
                style={[
                  styles.bubble,
                  msg.role === 'user'
                    ? styles.bubbleUser
                    : [styles.bubbleAssistant, { backgroundColor: P.surface }],
                ]}
              >
                {msg.role === 'user' ? (
                  <LinearGradient
                    colors={[P.grad[0], P.grad[1]]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.bubbleUserInner}
                  >
                    <Text style={styles.bubbleUserText}>{msg.content}</Text>
                  </LinearGradient>
                ) : (
                  <Text style={[styles.bubbleText, { color: P.ink }]}>{msg.content}</Text>
                )}
              </View>
            ))}

            {/* Completion result card */}
            {done && result && (
              <View style={[styles.resultCard, { backgroundColor: P.surface, borderColor: P.line }]}>
                <Text style={[styles.resultTitle, { color: P.ink }]}>Reflection complete ✓</Text>
                <Text style={[styles.resultSummary, { color: P.inkSoft }]}>{result.summary}</Text>
                <View style={[styles.resultScoreRow, { borderTopColor: P.line }]}>
                  <View style={styles.resultStat}>
                    <Text style={[styles.resultStatVal, { color: P.primary }]}>{result.reflection_score}<Text style={[styles.resultStatUnit, { color: P.inkMuted }]}>/10</Text></Text>
                    <Text style={[styles.resultStatLabel, { color: P.inkMuted }]}>Reflection</Text>
                  </View>
                  <View style={[styles.resultDivider, { backgroundColor: P.line }]} />
                  <View style={styles.resultStat}>
                    <Text style={[styles.resultStatVal, { color: P.primary }]}>+{result.delta}</Text>
                    <Text style={[styles.resultStatLabel, { color: P.inkMuted }]}>Score</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Already completed (no result in state, came from history) */}
            {done && !result && (
              <View style={[styles.resultCard, { backgroundColor: P.surface, borderColor: P.line }]}>
                <Text style={[styles.resultTitle, { color: P.ink }]}>Reflection complete ✓</Text>
                <Text style={[styles.resultSummary, { color: P.inkSoft }]}>
                  You've already reflected on this event. Your score was recorded.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Input */}
      {!done && (
        <View style={[styles.inputRow, {
          paddingBottom: insets.bottom + 10,
          backgroundColor: P.bg,
          borderTopColor: P.line,
        }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="How did it go…"
            placeholderTextColor={P.inkMuted}
            multiline
            style={[styles.input, { color: P.ink, backgroundColor: P.surface, borderColor: P.line }]}
            onSubmitEditing={send}
            blurOnSubmit={false}
          />
          <TouchableOpacity onPress={send} disabled={sending || !input.trim()} activeOpacity={0.8}>
            <LinearGradient
              colors={input.trim() ? [P.grad[0], P.grad[1]] : [P.surfaceQuiet, P.surfaceQuiet]}
              style={styles.sendBtn}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={[styles.sendBtnText, { color: input.trim() ? '#fff' : P.inkMuted }]}>↑</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 0.5, gap: 8,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 15, fontWeight: '500' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  headerSub: { fontSize: 12, marginTop: 1 },
  doneBtn: { padding: 4 },
  doneBtnText: { fontSize: 15, fontWeight: '600' },

  messageList: { padding: 16, gap: 10 },

  bubble: { maxWidth: '82%', marginBottom: 4 },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    borderRadius: 18, borderBottomLeftRadius: 4,
    padding: 14,
  },
  bubbleUser: { alignSelf: 'flex-end' },
  bubbleUserInner: {
    borderRadius: 18, borderBottomRightRadius: 4,
    padding: 14,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleUserText: { color: '#fff', fontSize: 15, lineHeight: 22 },

  resultCard: {
    marginTop: 16, borderRadius: 20, borderWidth: 0.5,
    overflow: 'hidden', alignSelf: 'stretch',
  },
  resultTitle: { fontSize: 16, fontWeight: '600', padding: 16, paddingBottom: 6 },
  resultSummary: { fontSize: 14, lineHeight: 21, paddingHorizontal: 16, paddingBottom: 16 },
  resultScoreRow: {
    flexDirection: 'row', borderTopWidth: 0.5,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  resultStat: { flex: 1, alignItems: 'center', gap: 2 },
  resultStatVal: { fontSize: 28, fontWeight: '600', letterSpacing: -0.5 },
  resultStatUnit: { fontSize: 14, fontWeight: '400' },
  resultStatLabel: { fontSize: 12, fontWeight: '500' },
  resultDivider: { width: 0.5, marginHorizontal: 8 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingTop: 10, gap: 8,
    borderTopWidth: 0.5,
  },
  input: {
    flex: 1, borderWidth: 1, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 100,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { fontSize: 18, fontWeight: '700' },
});
