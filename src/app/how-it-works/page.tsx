import type { Metadata } from 'next';
import HowItWorks from '@/components/howto/HowItWorks';
import './howto.css';

export const metadata: Metadata = {
  title: 'How it works · ArchStudio',
  description: 'Layers, scopes, components, dependencies and flows — the whole format, on one worked example.'
};

export default function HowItWorksPage() {
  return <HowItWorks />;
}
