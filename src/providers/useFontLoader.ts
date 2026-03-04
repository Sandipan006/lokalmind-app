import { type FontSource, loadAsync } from 'expo-font';
import { useEffect, useState } from 'react';

export interface FontLoaderResult {
  fontsLoaded: boolean;
  fontError: string | null;
}

const FONT_MAP: Record<string, FontSource> = {
  // Figtree — primary UI font
  'Figtree-Regular': require('../../assets/fonts/figtree/Figtree-Regular.ttf'),
  'Figtree-Medium': require('../../assets/fonts/figtree/Figtree-Medium.ttf'),
  'Figtree-SemiBold': require('../../assets/fonts/figtree/Figtree-SemiBold.ttf'),
  'Figtree-Bold': require('../../assets/fonts/figtree/Figtree-Bold.ttf'),
  'Figtree-ExtraBold': require('../../assets/fonts/figtree/Figtree-ExtraBold.ttf'),
  'Figtree-Black': require('../../assets/fonts/figtree/Figtree-Black.ttf'),
  'Figtree-Light': require('../../assets/fonts/figtree/Figtree-Light.ttf'),
  'Figtree-Italic': require('../../assets/fonts/figtree/Figtree-Italic.ttf'),
  'Figtree-MediumItalic': require('../../assets/fonts/figtree/Figtree-MediumItalic.ttf'),
  'Figtree-SemiBoldItalic': require('../../assets/fonts/figtree/Figtree-SemiBoldItalic.ttf'),
  'Figtree-BoldItalic': require('../../assets/fonts/figtree/Figtree-BoldItalic.ttf'),
  'Figtree-ExtraBoldItalic': require('../../assets/fonts/figtree/Figtree-ExtraBoldItalic.ttf'),
  'Figtree-BlackItalic': require('../../assets/fonts/figtree/Figtree-BlackItalic.ttf'),
  'Figtree-LightItalic': require('../../assets/fonts/figtree/Figtree-LightItalic.ttf'),

  // Instrument Serif — accent/display font
  'InstrumentSerif-Regular': require('../../assets/fonts/instrument/InstrumentSerif-Regular.ttf'),
  'InstrumentSerif-Italic': require('../../assets/fonts/instrument/InstrumentSerif-Italic.ttf'),

  // Bricolage Grotesque — secondary display font
  'BricolageGrotesque-ExtraLight': require('../../assets/fonts/BricolageGrotesque/BricolageGrotesque-ExtraLight.ttf'),
  'BricolageGrotesque-Light': require('../../assets/fonts/BricolageGrotesque/BricolageGrotesque-Light.ttf'),
  'BricolageGrotesque-Regular': require('../../assets/fonts/BricolageGrotesque/BricolageGrotesque-Regular.ttf'),
  'BricolageGrotesque-Medium': require('../../assets/fonts/BricolageGrotesque/BricolageGrotesque-Medium.ttf'),
  'BricolageGrotesque-SemiBold': require('../../assets/fonts/BricolageGrotesque/BricolageGrotesque-SemiBold.ttf'),
  'BricolageGrotesque-Bold': require('../../assets/fonts/BricolageGrotesque/BricolageGrotesque-Bold.ttf'),
  'BricolageGrotesque-ExtraBold': require('../../assets/fonts/BricolageGrotesque/BricolageGrotesque-ExtraBold.ttf'),
};

export function useFontLoader(): FontLoaderResult {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await loadAsync(FONT_MAP);
        if (!cancelled) setFontsLoaded(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown font loading error';
        if (!cancelled) {
          setFontError(message);
          setFontsLoaded(true); // unblock render even on error
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { fontsLoaded, fontError };
}
