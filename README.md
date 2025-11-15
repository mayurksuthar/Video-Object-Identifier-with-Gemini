# 🎥 AI Video Object Analyzer (Powered by Google Gemini API)

This project is an AI-powered video analysis tool that detects **specific objects defined by the user**, extracts **real frame images**, draws **bounding boxes**, and returns:

- ✔ Identified object name  
- ✔ Cropped detected frame  
- ✔ Bounding box position  
- ✔ Estimated USD price (AI-generated)  

Built using **Google Gemini API (1.5 Flash / 1.5 Pro)** for high-accuracy video understanding.

---

## 🧠 Features

### 🔍 1. **User-Defined Object Identification**
Users can enter custom object names such as:

- “iPhone”
- “Golden ring”
- “Car”
- “Shoes”
- “Laptop”
- “Apple fruit”
- etc.

The AI will detect them inside the uploaded video.

---

### 🎥 2. **Video Frame Analysis**
- Extracts the most relevant frames
- Detects selected objects
- Draws bounding boxes over frames
- Provides the original frame + highlighted frame

---

### 💵 3. **AI-Generated Price Estimation (USD)**
For each detected object, Gemini attempts to estimate a realistic price in USD based on:

- Object type  
- Condition (visible through video)  
- Brand (if identifiable)  

---
## 🛠 Tech Stack

- **Google Gemini API (Video + Vision models)**
- **Vite frontend** (your choice)
- **TailwindCSS** for UI styling
- **PM2** (optional) for deployment

---


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
