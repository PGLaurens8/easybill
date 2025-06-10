# EasyBill - Construction Project Management PWA

A modern Progressive Web App for Quantity Surveyors and Subcontractors to manage construction projects, Bills of Quantities, and payments.

## Features

- 📊 Project Management
- 📝 BOQ Generation
- 💰 Payment Tracking
- 👥 Subcontractor Management
- 📱 Mobile-First PWA
- 🔍 Material Price Integration
- 📄 PDF Certificate Generation

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Firebase (Auth, Firestore)
- PWA Support

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/easybill.git
   cd easybill
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your Firebase configuration.

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password and Google Sign-in)
3. Create a Firestore database
4. Copy your Firebase configuration to `.env`

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
  ├── lib/           # Firebase and other utilities
  ├── types/         # TypeScript type definitions
  ├── hooks/         # Custom React hooks
  └── store/         # State management
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 