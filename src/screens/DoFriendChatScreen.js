import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import {
  collection, addDoc, onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { firebaseDb } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useDoTheme } from '../context/DoThemeContext';
import { RelateAvatar } from '../components/DoAtoms';

export default function DoFriendChatScreen() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const friend = params?.friend;
  const { P } = useDoTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [sendError, setSendError] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    const messagesRef = collection(firebaseDb, 'chat_rooms', friend.room_id, 'messages');
    const q = query(messagesRef, orderBy('created_at', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.() ?? null,
      }));
      setMessages(msgs);
      setReady(true);
    }, () => {
      setReady(true); // show empty state on error
    });

    return unsubscribe;
  }, [friend.room_id]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText('');
    setSendError(null);
    setSending(true);
    try {
      await addDoc(collection(firebaseDb, 'chat_rooms', friend.room_id, 'messages'), {
        sender_uid: user.uid,
        text: trimmed,
        created_at: serverTimestamp(),
      });
    } catch (e) {
      setSendError('Message not sent — check your connection');
      setText(trimmed); // restore so user can retry
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.root, { backgroundColor: P.bg }]}>
      {/* Header */}
      <View style={[styles.header, {
        paddingTop: insets.top + 8,
        backgroundColor: P.bg,
        borderBottomColor: P.line,
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.backText, { color: P.ink }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <RelateAvatar size={42} P={P} kind="other" tint={P.accentDeep} />
          <View>
            <Text style={[styles.headerName, { color: P.ink }]}>{friend.alias}</Text>
            <Text style={[styles.headerSub, { color: P.inkMuted }]}>anonymous · here now</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.endBtn, { borderColor: P.line }]}>
          <Text style={[styles.endText, { color: P.inkSoft }]}>End</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.disclaimer, { backgroundColor: P.surfaceQuiet, borderColor: P.line }]}>
        <Text style={[styles.disclaimerText, { color: P.inkSoft }]}>
          You're both anonymous. Be gentle.
        </Text>
      </View>

      {/* Messages */}
      {!ready ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={P.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={[styles.msgList, messages.length === 0 && styles.msgListEmpty]}
          ListEmptyComponent={
            <Text style={[styles.emptyMsg, { color: P.inkMuted }]}>
              Say something — only the two of you can see this.
            </Text>
          }
          renderItem={({ item }) => {
            const isMe = item.sender_uid === user.uid;
            return (
              <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
                {isMe ? (
                  <View style={styles.msgWrap}>
                    <LinearGradient colors={[P.grad[0], P.grad[1]]} style={[styles.bubble, styles.bubbleMe]}>
                      <Text style={styles.bubbleMeText}>{item.text}</Text>
                    </LinearGradient>
                    <Text style={[styles.timestamp, { color: P.inkMuted, textAlign: 'right' }]}>
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                ) : (
                  <>
                    <RelateAvatar size={34} P={P} kind="other" tint={P.accentDeep} />
                    <View style={styles.msgWrap}>
                      <View style={[styles.bubble, styles.bubbleThem, { backgroundColor: P.wash, borderColor: P.primary + '33' }]}>
                        <Text style={[styles.bubbleThemText, { color: P.ink }]}>{item.text}</Text>
                      </View>
                      <Text style={[styles.timestamp, { color: P.inkMuted }]}>
                        {formatTime(item.created_at)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Send error */}
      {sendError && (
        <View style={[styles.errorBanner, { backgroundColor: '#b3261e' }]}>
          <Text style={styles.errorBannerText}>{sendError}</Text>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.inputRow, {
          borderTopColor: P.line,
          backgroundColor: P.bg,
          paddingBottom: insets.bottom + 80,
        }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Say what you'd want someone to say to you..."
            placeholderTextColor={P.inkMuted}
            style={[styles.input, { color: P.ink, backgroundColor: P.bg, borderColor: P.line }]}
            onSubmitEditing={send}
            returnKeyType="send"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={send}
            disabled={!text.trim() || sending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[P.grad[0], P.grad[1]]}
              style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
            >
              <Text style={styles.sendArrow}>↑</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  backText: { fontSize: 34, fontWeight: '300', lineHeight: 34 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerName: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  headerSub: { fontSize: 12, marginTop: 1 },
  endBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  endText: { fontSize: 12, fontWeight: '500' },

  disclaimer: {
    margin: 14, marginBottom: 0, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 16, borderWidth: 0.5,
  },
  disclaimerText: { fontSize: 13, lineHeight: 18, textAlign: 'center' },

  msgList: { padding: 16, gap: 10, paddingBottom: 24 },
  msgListEmpty: { flex: 1, justifyContent: 'center' },
  emptyMsg: { textAlign: 'center', fontSize: 14, lineHeight: 21, paddingHorizontal: 32 },

  msgRow: { flexDirection: 'row', marginBottom: 6 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start', alignItems: 'flex-end', gap: 8 },
  msgWrap: { maxWidth: '76%' },

  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: { borderBottomLeftRadius: 4, borderWidth: 0.5 },
  bubbleMeText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  bubbleThemText: { fontSize: 15, lineHeight: 22 },
  timestamp: { fontSize: 11, marginTop: 3, paddingHorizontal: 4 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 10, gap: 8, borderTopWidth: 0.5,
  },
  input: {
    flex: 1, borderRadius: 22, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 100,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  sendArrow: { color: '#fff', fontSize: 18, fontWeight: '700' },

  errorBanner: { paddingHorizontal: 16, paddingVertical: 8 },
  errorBannerText: { color: '#fff', fontSize: 13, textAlign: 'center' },
});
