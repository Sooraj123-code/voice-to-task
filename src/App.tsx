import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { extractTaskFromTranscript, checkBackend } from "./api";
import { clearTasks, loadTasks, saveTasks } from "./storage";
import { Task, TaskStatus } from "./types";

const colors = {
  bg: "#07111f",
  panel: "#0d1b2a",
  panel2: "#12253a",
  border: "#21364d",
  text: "#f8fafc",
  muted: "#94a3b8",
  accent: "#38bdf8",
  accent2: "#22c55e",
  danger: "#fb7185",
  warning: "#fbbf24",
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [search, setSearch] = useState("");
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("result", (event) => {
    const value = event.results?.[0]?.transcript?.trim() || "";
    if (!value) return;
    setTranscript(value);
    if (event.isFinal) {
      void processTranscript(value);
    }
  });
  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);
    if (event.error !== "aborted") {
      Alert.alert("Speech recognition error", event.message || event.error);
    }
  });

  useEffect(() => {
    void initialize();
  }, []);

  async function initialize() {
    try {
      const stored = await loadTasks();
      setTasks(stored);
    } catch (error) {
      Alert.alert("Storage error", "Could not load saved tasks.");
    }
    void refreshBackendStatus();
  }

  async function refreshBackendStatus() {
    try {
      setBackendOnline(await checkBackend());
    } catch {
      setBackendOnline(false);
    }
  }

  async function startListening() {
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Microphone permission required",
          "Allow microphone and speech recognition access in your device settings.",
        );
        return;
      }
      setTranscript("");
      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: false,
      });
    } catch (error: any) {
      Alert.alert("Unable to start voice input", error?.message || "Try again.");
    }
  }

  function stopListening() {
    ExpoSpeechRecognitionModule.stop();
  }

  async function processTranscript(text: string) {
    if (!text.trim()) return;
    setIsProcessing(true);
    try {
      const extracted = await extractTaskFromTranscript(text);
      const newTask: Task = {
        ...extracted,
        id: `task-${Date.now()}`,
        rawSpeech: text,
        createdAt: Date.now(),
        extractedJson: extracted,
      };
      const updated = [newTask, ...tasks];
      setTasks(updated);
      await saveTasks(updated);
      setTranscript("");
    } catch (error: any) {
      Alert.alert(
        "AI extraction failed",
        error?.message || "Check that the backend is running and Gemini is configured.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function updateStatus(id: string) {
    const updated = tasks.map((task) => {
      if (task.id !== id) return task;
      const next: TaskStatus =
        task.status === "Pending"
          ? "In Progress"
          : task.status === "In Progress"
            ? "Completed"
            : "Pending";
      return { ...task, status: next };
    });
    setTasks(updated);
    await saveTasks(updated);
  }

  async function deleteTask(id: string) {
    const updated = tasks.filter((task) => task.id !== id);
    setTasks(updated);
    await saveTasks(updated);
  }

  async function resetTasks() {
    Alert.alert("Clear tasks?", "This removes all saved tasks from this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await clearTasks();
          setTasks([]);
        },
      },
    ]);
  }

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tasks;
    return tasks.filter((task) =>
      [task.taskTitle, task.category, task.priority, task.status, task.rawSpeech]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [tasks, search]);

  const completedCount = tasks.filter((task) => task.status === "Completed").length;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>AI PRODUCTIVITY</Text>
            <Text style={styles.title}>Voice-to-Task</Text>
            <Text style={styles.subtitle}>Speak naturally. AI structures it. Tasks persist.</Text>
          </View>
          <View style={[styles.onlineDot, backendOnline === false && styles.offlineDot]} />
        </View>

        <View style={styles.pipeline}>
          {[
            ["01", "Voice"],
            ["02", "Speech-to-text"],
            ["03", "Gemini AI"],
            ["04", "AsyncStorage"],
          ].map(([number, label]) => (
            <View style={styles.pipelineStep} key={number}>
              <Text style={styles.pipelineNumber}>{number}</Text>
              <Text style={styles.pipelineLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              {isListening ? "Listening…" : isProcessing ? "AI is structuring it…" : "Create a task by voice"}
            </Text>
            <Text style={styles.heroText}>
              Try: “Remind me to call John tomorrow at 5 PM.”
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isListening ? "Stop voice input" : "Start voice input"}
            style={[styles.micButton, isListening && styles.micButtonActive]}
            onPress={isListening ? stopListening : startListening}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#03111d" />
            ) : (
              <Text style={styles.micIcon}>{isListening ? "■" : "🎙"}</Text>
            )}
          </Pressable>
        </View>

        {transcript ? (
          <View style={styles.transcriptCard}>
            <Text style={styles.sectionLabel}>LIVE TRANSCRIPT</Text>
            <Text style={styles.transcriptText}>“{transcript}”</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Saved tasks</Text>
            <Text style={styles.countText}>{completedCount}/{tasks.length} completed</Text>
          </View>
          <Pressable onPress={resetTasks} hitSlop={10}>
            <Text style={styles.clearText}>Clear all</Text>
          </Pressable>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search tasks…"
          placeholderTextColor={colors.muted}
          style={styles.search}
        />

        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await refreshBackendStatus();
                setRefreshing(false);
              }}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>◌</Text>
              <Text style={styles.emptyTitle}>No tasks yet</Text>
              <Text style={styles.emptyText}>Tap the microphone and speak a reminder.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.taskCard}>
              <View style={styles.taskTopRow}>
                <View style={styles.badgeRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{item.category}</Text>
                  </View>
                  <View style={[styles.priorityBadge, item.priority === "Urgent" && styles.urgentBadge]}>
                    <Text style={styles.priorityText}>{item.priority}</Text>
                  </View>
                </View>
                <Pressable onPress={() => void deleteTask(item.id)} hitSlop={10}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>

              <Text style={styles.taskTitle}>{item.taskTitle}</Text>
              <Text style={styles.taskSpeech}>“{item.rawSpeech}”</Text>

              <View style={styles.metaRow}>
                <View>
                  <Text style={styles.metaLabel}>DATE</Text>
                  <Text style={styles.metaValue}>{item.formattedDate}</Text>
                </View>
                <View>
                  <Text style={styles.metaLabel}>TIME</Text>
                  <Text style={styles.metaValue}>{item.formattedTime}</Text>
                </View>
              </View>

              <View style={styles.bottomRow}>
                <Pressable onPress={() => void updateStatus(item.id)} style={styles.statusButton}>
                  <View
                    style={[
                      styles.statusDot,
                      item.status === "Completed" && styles.completedDot,
                      item.status === "In Progress" && styles.progressDot,
                    ]}
                  />
                  <Text style={styles.statusButtonText}>{item.status}</Text>
                </Pressable>
                <Text style={styles.confidence}>AI confidence: {item.confidence || "High"}</Text>
              </View>
            </View>
          )}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, paddingHorizontal: 18 },
  header: { paddingTop: 12, paddingBottom: 16, flexDirection: "row", justifyContent: "space-between" },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 30, fontWeight: "800", marginTop: 3 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 4, maxWidth: 290 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent2, marginTop: 10 },
  offlineDot: { backgroundColor: colors.danger },
  pipeline: { flexDirection: "row", backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 10, marginBottom: 12 },
  pipelineStep: { flex: 1 },
  pipelineNumber: { color: colors.accent, fontSize: 10, fontWeight: "800" },
  pipelineLabel: { color: colors.muted, fontSize: 10, marginTop: 4 },
  hero: { backgroundColor: colors.panel2, borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border },
  heroCopy: { flex: 1, paddingRight: 12 },
  heroTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  heroText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  micButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  micButtonActive: { backgroundColor: colors.danger },
  micIcon: { fontSize: 24, color: "#03111d", fontWeight: "800" },
  transcriptCard: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, padding: 14, borderRadius: 14, marginTop: 12 },
  sectionLabel: { color: colors.accent, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  transcriptText: { color: colors.text, fontSize: 13, lineHeight: 20, marginTop: 6 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 20, marginBottom: 10 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  countText: { color: colors.muted, fontSize: 11, marginTop: 2 },
  clearText: { color: colors.danger, fontSize: 12, fontWeight: "700" },
  search: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, color: colors.text, paddingHorizontal: 14, marginBottom: 10 },
  list: { paddingBottom: 28 },
  taskCard: { backgroundColor: colors.panel, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  taskTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badgeRow: { flexDirection: "row", gap: 7 },
  categoryBadge: { backgroundColor: "#123047", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  categoryText: { color: colors.accent, fontSize: 10, fontWeight: "800" },
  priorityBadge: { backgroundColor: "#2a2512", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  urgentBadge: { backgroundColor: "#3a1620" },
  priorityText: { color: colors.warning, fontSize: 10, fontWeight: "800" },
  deleteText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  taskTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 13 },
  taskSpeech: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  metaRow: { flexDirection: "row", gap: 34, marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border },
  metaLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  metaValue: { color: colors.text, fontSize: 12, marginTop: 3, fontWeight: "600" },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 15 },
  statusButton: { flexDirection: "row", alignItems: "center", paddingVertical: 7, paddingHorizontal: 9, borderRadius: 10, backgroundColor: "#15263a" },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.warning, marginRight: 7 },
  progressDot: { backgroundColor: colors.accent },
  completedDot: { backgroundColor: colors.accent2 },
  statusButtonText: { color: colors.text, fontSize: 11, fontWeight: "700" },
  confidence: { color: colors.muted, fontSize: 10 },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { color: colors.accent, fontSize: 42 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: "800", marginTop: 10 },
  emptyText: { color: colors.muted, fontSize: 12, marginTop: 5 },
});
