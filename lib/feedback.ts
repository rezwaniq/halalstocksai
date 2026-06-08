import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.csv');

const CSV_HEADER =
  'timestamp,email,q1_shariah_accuracy,q2_geo_usefulness,q3_ease_of_use,q4_data_quality,q5_recommend,free_text\n';

export interface FeedbackEntry {
  email: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  freeText: string;
}

export function appendFeedback(entry: FeedbackEntry): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const fileExists = fs.existsSync(FEEDBACK_FILE);
  const timestamp = new Date().toISOString();
  const escaped = `"${entry.freeText.replace(/"/g, '""')}"`;
  const row = `${timestamp},${entry.email},${entry.q1},${entry.q2},${entry.q3},${entry.q4},${entry.q5},${escaped}\n`;
  if (!fileExists) {
    fs.writeFileSync(FEEDBACK_FILE, CSV_HEADER + row);
  } else {
    fs.appendFileSync(FEEDBACK_FILE, row);
  }
}
