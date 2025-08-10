Voice Scam Shield – Real-Time Multilingual Call Scam Detection

Overview
This project implements a secure, real-time multilingual voice scam detection system. It monitors live phone calls, transcribes conversations, detects scam intent, and identifies synthetic voices to protect users during calls. Alerts are discreetly delivered via text and speech, supporting English, Spanish, and French.


Features
Real-time call audio streaming via Twilio Media Streams

Voice activity detection and speaker diarization

Multilingual transcription with Whisper API

Scam intent classification using GPT-4o-mini

Anti-spoofing detection via Hugging Face AASIST model

Discreet user alerts using ElevenLabs TTS

Secure communication (HTTPS/WSS) and environment-based secret management

Modular architecture for easy updates and testing



Tech Stack
Frontend: React / Next.js

Backend: Supabase Edge Functions (WebSockets)

ASR: Whisper API

Scam Detection: GPT-4o-mini

Anti-Spoofing: Hugging Face AASIST model

Telephony: Twilio Programmable Voice + Media Streams

TTS: ElevenLabs API

Setup Instructions


Prerequisites

Node.js v16+

Twilio Account with Media Streams enabled

OpenAI API Key

Hugging Face API Key (for AASIST model)

ElevenLabs API Key



Environment Variables
Create a .env file and add:

ini
Copy
Edit
TWILIO_ACCOUNT_SID=your_twilio_sid  
TWILIO_AUTH_TOKEN=your_twilio_auth_token  
OPENAI_API_KEY=your_openai_key  
HUGGINGFACE_API_KEY=your_huggingface_key  
ELEVENLABS_API_KEY=your_elevenlabs_key  


1. Running Locally
Install dependencies:

bash
Copy
Edit
npm install  


2. Start frontend:

bash
Copy
Edit
npm run dev  


3. Deploy or emulate backend Supabase Edge Functions locally per Supabase docs.


Testing without Live Calls
Use mock audio streams in /mock folder.
Set backend to mock mode by enabling MOCK_TWILIO=true in .env.


Security Considerations
All API keys are stored in environment variables, never committed.
Communication uses HTTPS and WSS protocols.
Role-based access controls protect dashboard and reports.

Contribution
This project was built for the Hack-Nation Global AI Hackathon. Feel free to fork, improve, and experiment!

GitHub Setup Notes
Use .gitignore to exclude .env, node_modules/, and any sensitive data.

Create branches for features: feature/streaming, feature/scam-detection, etc.

Write clear commit messages, e.g., “Add Whisper transcription integration.”

Include unit and integration tests for core components (mock streaming, classification).

Setup GitHub Actions for linting and tests on PRs.

Tag releases as v1.0-hackathon for submission snapshot.

Link GitHub repo to your demo deployment (Netlify/Vercel/Supabase).
