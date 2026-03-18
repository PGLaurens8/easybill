gi# QuantEasy - Construction Project Management PWA

A modern Progressive Web App for Quantity Surveyors and Subcontractors to manage construction projects, Bills of Quantities, and payments.

## Features

- 📊 Project Management
- 📝 BOQ Generation with Rate Build-ups
- 💰 Progress Claim Tracking (Dual Rate: Sub vs Developer)
- 👥 Subcontractor Management
- 📱 Mobile-First PWA
- 🔍 Material Price Integration
- 📄 PDF Certificate Generation

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- FastAPI (Backend)
- Supabase (Auth, Postgres, Storage)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/quanteasy.git
   cd quanteasy
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your Supabase configuration.

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
  ├── components/     # Reusable UI components
  ├── pages/         # Page components
  ├── lib/           # Supabase and API utilities
  ├── types/         # TypeScript type definitions
  ├── context/       # React Context (Auth, App State)
  └── utils/         # Helpers (Formatters, Generators)
```

## License

This project is licensed under the MIT License.

## Project Docs

- Session brief and handoff: [docs/session-brief.md](/home/user/studio/docs/session-brief.md)
