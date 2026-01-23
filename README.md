# Xeva

A robust AI chat application featuring automatic model selection and complexity classification. Built with a FastAPI backend and a Next.js frontend, designed to optimize cost and performance by routing queries to the most appropriate OpenAI model.

## Features

- **Automatic Model Routing**: Intelligently classifies user intent to select the optimal model:
  - **Nano** (GPT-5-nano): For simple queries, greetings, and factual questions.
  - **Mini** (GPT-5-mini): For balanced tasks requiring moderate reasoning.
  - **Full** (GPT-5.2): For complex problem-solving, coding, and analysis.
- **Context-Aware**: Maintains conversation history for coherent multi-turn dialogues.
- **Modern Interface**: Clean, responsive UI built with Next.js and Tailwind CSS, featuring dark mode support.
- **Performance Metrics**: Displays model usage, response time, and token consumption for transparency.
- **Markdown Support**: Full rendering support for code blocks, tables, and formatted text.

## Tech Stack

- **Backend**: Python, FastAPI, OpenAI SDK
- **Frontend**: TypeScript, Next.js, Tailwind CSS, Lucide React
- **AI Models**: GPT-5.2, GPT-5-mini, GPT-5-nano

## Prerequisites

- Python 3.12+
- Node.js 22.22+
- OpenAI API Key

## Installation

### 1. Backend Setup

Navigate to the project root and set up the Python environment.

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Create .env file in the root directory
# Add your API key: OPENAI_API_KEY=your_key_here
```

### 2. Frontend Setup

Navigate to the frontend directory and install dependencies.

```bash
cd frontend
npm install
```

## Usage

To run the application locally, you need to start both the backend and frontend servers.

### Start Backend

From the project root:

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

### Start Frontend

From the `frontend` directory:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Configuration

### Environment Variables

Create a `.env` file in the `backend` directory (or root, depending on your setup) with the following:

```env
OPENAI_API_KEY=sk-...
```

### Model Configuration

Model settings and token limits can be configured in `backend/config.py`.

```python
# Example configuration in backend/config.py
MAX_TOKENS = {
    "nano": 16384,
    "mini": 16384,
    "full": 16384
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check / Redirect to frontend |
| `/api/chat` | POST | Process chat messages and return AI response |

## License

Proprietary - Neolytix Internal Use
