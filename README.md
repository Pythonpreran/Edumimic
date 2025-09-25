# EduMimic - AI-Powered Teacher Training Simulator

**EduMimic** is a virtual teaching simulation platform designed to help educators improve engagement and delivery in a classroom environment. Through real-time speech transcription, dynamic virtual student interactions, and engagement analysis based on voice clarity and facial expressions, teachers can practice and receive actionable insights to enhance their teaching skills.

---

## 🚀 Project Overview

In modern education, student engagement is a critical factor, yet teachers often lack practical tools to measure and improve it. EduMimic solves this by providing:

- **Real-time transcription:** Converts teacher speech to text for monitoring lesson flow.
- **Virtual student interactions:** AI-generated students ask questions and react dynamically.
- **Engagement tracking:** Facial expressions and voice clarity are analyzed to provide feedback.
- **Actionable insights:** Teachers receive engagement scores and suggested improvements.

---

## 📊 Key Features

1. **Live Teaching Simulation**  
   Conduct lessons in a controlled virtual environment.

2. **Dynamic AI Students**  
   Virtual students ask relevant questions and provide reactions based on your speech.

3. **Speech Analysis**  
   Uses Whisper (or Web Speech API) for accurate transcription of lessons.

4. **Engagement Monitoring**  
   Facial expression and voice clarity tracking to calculate an engagement score.

5. **Session Feedback**  
   Detailed summary of lesson performance, including transcript, emotions, and AI interactions.

---

## 🖥️ Tech Stack

- **Frontend:** React, TypeScript, Vite  
- **AI & ML:** Whisper API (speech transcription), Gemini API (AI student interactions), face-api.js (facial expression tracking)  
- **UI Components:** Tailwind CSS, shadcn/ui  
- **Others:** MediaRecorder API for audio capture, browser speech recognition

---

## ⚡ Getting Started

Follow these steps to set up and run EduMimic locally:

### 1. Clone the repository
git clone <your-repo-url>
cd <repo-name>

text

### 2. Install dependencies
npm install

text

### 3. Configure API Keys
Create a file at `src/config/api.ts` and add your API keys:

export const OPENAI_API_KEY = 'your-openai-key';
export const GOOGLE_GEMINI_API_KEY = 'your-google-gemini-key';

text
Make sure to replace the placeholders with your actual keys.

### 4. Run the development server
npm run dev

text
Open your browser at http://localhost:5173 to access the simulator.

---

## 🧩 Usage

1. Enter your teaching topic.
2. Toggle Whisper transcription if you prefer higher accuracy over the browser speech API.
3. Start the session. The virtual students will respond dynamically.
4. Observe engagement feedback based on voice clarity and facial expressions.
5. End the session to view detailed insights including transcripts, student interactions, and engagement score.

---

## 🛠️ Notes for Developers

- Ensure camera and microphone permissions are enabled in the browser.
- Face mesh lines may not appear due to limitations in face-api.js landmarks rendering, but emotion detection works accurately.
- Whisper records in 10-second chunks to minimize background noise interference.
- AI student responses are triggered either randomly or when questions are asked.

---

## 🔒 Security & Privacy

- All audio processing is done locally or via secure API endpoints.
- No personal data is stored without consent.

---

## 🎯 Future Enhancements

- Improved face mesh visualization.
- More nuanced AI student behaviors based on real lesson context.
- Voice clarity scoring to provide detailed feedback per sentence.

---

## 📜 License

MIT License © [Pythonpreran]
