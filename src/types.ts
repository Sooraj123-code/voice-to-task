export type TaskStatus = "Pending" | "In Progress" | "Completed";
export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";

export interface ExtractedTaskData {
  taskTitle: string;
  date: string;
  formattedDate: string;
  time: string;
  formattedTime: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  notes?: string;
  confidence?: "High" | "Medium" | "Low";
}

export interface Task extends ExtractedTaskData {
  id: string;
  rawSpeech: string;
  createdAt: number;
  extractedJson: ExtractedTaskData;
}
