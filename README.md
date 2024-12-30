# Interphase

A modern HTTP, WebSocket, TCP, and MQTT client built with Next.js. Interphase provides an intuitive interface for testing and debugging various network protocols.

## Features

- HTTP request testing (GET, POST, PUT, DELETE)
- WebSocket connections with real-time messaging
- TCP client functionality
- MQTT publish/subscribe capabilities
- Request history tracking
- Support for multiple concurrent connections
- Clean, modern UI built with Tailwind CSS

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/abbychau/interphase.git
cd interphase
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development

This project uses:
- [Next.js 14](https://nextjs.org) - React framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Radix UI](https://www.radix-ui.com) - Headless UI primitives

## Building for Production

To create an optimized production build:

```bash
npm run build
npm run start
```

## License

[MIT License](LICENSE)