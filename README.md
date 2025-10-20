# Written Exam Grader

A mobile-friendly web application that automatically grades handwritten answer sheets using multimodal large language model.

## Features

- 📱 Mobile-optimized interface
- 📷 Camera capture or file upload
- 🖼️ Multiple images per answer sheet
- 🤖 MLLM-powered answer grading
- ✅ Feedback for each question
- 💯 Automatic score calculation

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

3. Create a `.env` file with your Gemini API key:

   ```
   GEMINI_API_KEY=your_api_key_here
   ```

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
