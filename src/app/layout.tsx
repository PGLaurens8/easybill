import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'QuantEasy',
  description: 'Streamlined Quantity Surveying',
  manifest: '/manifest.json',
  themeColor: '#73BEE3', // Primary color
  appleWebAppCapable: 'yes',
  appleWebAppStatusBarStyle: 'default',
  // Note: Font links (Inter, Source Code Pro) and icon links (favicon, apple-touch-icon)
  // that were previously in the manual <head> tag should be managed here
  // or via next/font for fonts, and file conventions (e.g., app/favicon.ico) for icons.
  // Example for icons:
  // icons: {
  //   icon: '/favicon.ico', // Assuming it's in public/favicon.ico or app/favicon.ico
  //   apple: '/icons/apple-touch-icon.png', // Assuming it's in public/icons/apple-touch-icon.png or app/apple-icon.png
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The <html> and <body> tags are managed by Next.js in the App Router.
  // ClassNames like 'font-body' and 'antialiased' are now applied globally via globals.css.
  return (
    <AuthProvider>
      {children}
      <Toaster />
      <Script id="service-worker-registration">
        {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(registration => {
                  console.log('SW registered: ', registration);
                }).catch(registrationError => {
                  console.log('SW registration failed: ', registrationError);
                });
              });
            }
          `}
      </Script>
    </AuthProvider>
  );
}
