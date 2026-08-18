import { permanentRedirect } from 'next/navigation';

export default function LegacyHome() {
  permanentRedirect('/');
}
