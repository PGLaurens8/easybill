import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'QuantEasy',
  description: 'Streamlined Quantity Surveying',
  manifest: '/manifest.json',
  applicationName: 'QuantEasy',
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
  return (
    <html lang="en">
      {/* 
        Next.js will automatically manage the <head> tag contents based on the metadata object.
        The <link> tags for fonts (Inter, Source Code Pro) and icons (favicon, apple-touch-icon)
        should be managed via the `metadata` object above or by using `next/font` for fonts,
        and following Next.js file conventions (e.g., app/favicon.ico) for icons.
        For example, to use next/font for Inter and Source Code Pro:
        
        import { Inter, Source_Code_Pro } from 'next/font/google';
        const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
        const sourceCodePro = Source_Code_Pro({ subsets: ['latin'], variable: '--font-source-code-pro', weight: ['400', '700'] });
        
        Then, in the body className: `${inter.variable} ${sourceCodePro.variable} font-body antialiased`
        And update tailwind.config.ts to use these CSS variables for fontFamily.body and fontFamily.code.
        
        Icon links should be specified in the `metadata.icons` object above or follow Next.js file conventions.
      */}
      <body className="font-body antialiased" suppressHydrationWarning={true}>
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
      </body>
    </html>
  );
}
