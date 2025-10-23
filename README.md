# Written Exam Grader

A mobile-friendly web application that automatically grades handwritten answer sheets using multimodal large language model.

## Features

- 📱 Mobile-optimized interface
- 📷 Camera capture or file upload
- 🖼️ Multiple images per answer sheet
- 🤖 MLLM-powered answer grading
- ✅ Feedback for each question
- 💯 Automatic score calculation
- � Visual position tracking - See exactly where each answer is on the sheet with color-coded bounding boxes
- �🔑 BYOK Mode - Use your own API key for grading

## Usage Modes

### BYOK Mode (Bring Your Own Key)

Grading with your own API key.

1. Click "Set API Key" on the main page
2. Enter your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
3. Your API key is stored locally in your browser's localStorage
4. When grading, your API key is attached to the request but not stored on the server

#### Why not provide direct client-to-Gemini API calls?

Browsers block direct API calls to Google's Gemini API due to CORS (Cross-Origin Resource Sharing) restrictions.

If you have strict privacy requirements, we recommend self-hosting the app so that no third-party server handles your requests.

### Server Mode

If `GEMINI_API_KEY` is set in the `.env` file, the server mode will be enabled.

If the user has not set a personal API key, the application will use the configured API key to process the requests.

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
