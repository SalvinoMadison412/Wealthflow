import { StatusBar } from 'expo-status-bar';
import { PdfExtractorProvider } from './src/pdf/PdfExtractorProvider';
import { HomeScreen } from './src/screens/HomeScreen';

export default function App() {
  return (
    <PdfExtractorProvider>
      <HomeScreen />
      <StatusBar style="auto" />
    </PdfExtractorProvider>
  );
}
