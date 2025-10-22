# Written Exam Grader

A mobile-friendly web application that automatically grades handwritten answer sheets using multimodal large language model.

## Features

- 📱 Mobile-optimized interface
- 📷 Camera capture or file upload
- 🖼️ Multiple images per answer sheet
- 🤖 MLLM-powered answer grading
- ✅ Feedback for each question
- 💯 Automatic score calculation
- 🔑 **BYOK Mode** - Bring Your Own Key for client-side grading (no server required!)

## Usage Modes

### BYOK Mode (Bring Your Own Key)

**Privacy-first client-side grading** - perfect for sensitive exam data!

1. Click "Set API Key" on the main page
2. Enter your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
3. Start grading - all processing happens in your browser
4. Your API key is stored locally and **never sent to our servers**

**Benefits:**

- ✅ Complete data privacy - nothing leaves your browser
- ✅ No server costs or limits (use your own quota)
- ✅ Your API key, your control

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
