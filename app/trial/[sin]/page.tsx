import { SIN_ORDER } from '@/src/data/trials';
import TrialPageClient from './TrialPageClient';

export function generateStaticParams() {
  return SIN_ORDER.map((sin) => ({ sin }));
}

export default function TrialPage() {
  return <TrialPageClient />;
}
