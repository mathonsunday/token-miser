import { useState } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { TerminalInterface } from './components/TerminalInterface';

export function ScroogeExperience() {
  const [hasEntered, setHasEntered] = useState(false);

  if (!hasEntered) {
    return <WelcomeScreen onEnter={() => setHasEntered(true)} />;
  }

  return <TerminalInterface />;
}
