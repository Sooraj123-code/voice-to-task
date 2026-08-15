import AsyncStorage from "@react-native-async-storage/async-storage";
import { Task } from "./types";

const STORAGE_KEY = "@voice_task_ai/tasks/v1";

const SAMPLE_TASK: Task = {
  id: "sample-1",
  taskTitle: "Call John",
  date: "2026-08-16",
  formattedDate: "16 August 2026",
  time: "5:00 PM",
  formattedTime: "5:00 PM",
  status: "Pending",
  priority: "Medium",
  category: "Call",
  notes: "Sample task — try the microphone to create your own.",
  confidence: "High",
  rawSpeech: "Remind me to call John tomorrow at 5 PM.",
  createdAt: Date.now(),
  extractedJson: {
    taskTitle: "Call John",
    date: "2026-08-16",
    formattedDate: "16 August 2026",
    time: "5:00 PM",
    formattedTime: "5:00 PM",
    status: "Pending",
    priority: "Medium",
    category: "Call",
    notes: "Sample task — try the microphone to create your own.",
    confidence: "High"
  }
};

export async function loadTasks(): Promise<Task[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_TASK]));
    return [SAMPLE_TASK];
  }
  try {
    return JSON.parse(raw) as Task[];
  } catch {
    return [];
  }
}

export async function saveTasks(tasks: Task[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export async function clearTasks() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
