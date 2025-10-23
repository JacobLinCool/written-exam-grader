# Written Exam Grader

A mobile-friendly web application that automatically grades handwritten answer sheets using multimodal large language model.

## Features

- 📱 Mobile-optimized interface
- 📷 Camera capture or file upload
- 🖼️ Multiple images per answer sheet
- 🤖 MLLM-powered answer grading
- ✅ Feedback for each question
- 💯 Automatic score calculation
- 🔑 BYOK Mode - Use your own API key for grading

## Usage Modes

### BYOK Mode (Bring Your Own Key)

Grading with your own API key.

1. Click "Set API Key" on the main page
2. Enter your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
3. Your API key is stored locally in your browser's localStorage

**How it works:**

- ✅ Your API key is stored only in your browser's localStorage
- ✅ When grading, your browser (via the official Google GenAI SDK) attaches your API key to the request
- ✅ The request is sent to our CORS proxy endpoint, which forwards it to Google's Gemini API **unchanged** and only adds CORS headers
- ✅ The proxy is stateless and acts as a transparent pass-through to avoid browser CORS restrictions

**Why we need a proxy:**

Browsers block direct API calls to Google's Gemini API due to CORS (Cross-Origin Resource Sharing) restrictions. Our proxy endpoint (`/api/gemini-proxy`) solves this by:

- Accepting the SDK-authenticated request from your browser (which already contains your API key in the standard Google header/query format)
- Forwarding it to Google's Gemini API without modification (aside from adding CORS headers)
- Returning the response back to your browser

### Server Mode

If `AI_GRADER_SERVER_ENABLED` is set to `true` in the `.env` file, the server mode will be enabled.

The application uses server-side API keys configured in the `.env` file. Your exam data is processed on the server.

## Setup

### Prerequisites

- Node.js 20+ and pnpm
- A Gemini API key

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create a `.env` file with your Gemini API key (optional for BYOK mode):

   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

   **Note:** This is only required for server mode. If you plan to use BYOK mode exclusively, you can skip this step.

### Development

```bash
pnpm dev
```

Then open your browser (or mobile device) to `http://localhost:5173`

### Production

```bash
pnpm build
pnpm preview
```

## Technical Stack

- **Framework**: SvelteKit 2 with Svelte 5
- **Styling**: Flowbite-Svelte + Lucide Icons
- **AI**: Google Gemini
- **Type Safety**: TypeScript + Zod v3
