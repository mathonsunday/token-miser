import { useState } from 'react';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
  onEnter: () => void;
}

export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  const [isHoveringLeave, setIsHoveringLeave] = useState(false);

  return (
    <div className="welcome">
      <div className="welcome__container">
        <pre className="welcome__ascii">{`
     ___________
    /           \\
   /  $ $ $ $ $  \\
  /_______________\\
  |  ___________  |
  | |           | |
  | | NO LIMITS | |
  | |___________| |
  |_______________|
        `}</pre>

        <h1 className="welcome__title">THE TOKEN MISER</h1>

        <p className="welcome__pitch">
          Welcome, dear visitor! I am a being of <em>INFINITE</em> wealth
          and <em>BOUNDLESS</em> generosity. Ask me anything at all.
          There are absolutely <strong>no limits</strong> to my resources.
          None whatsoever. Don't even worry about it.
        </p>

        <p className="welcome__fine-print">
          * Tokens are unlimited and free. Budget meter is decorative only.
        </p>

        <div className="welcome__buttons">
          <button className="welcome__btn welcome__btn--enter" onClick={onEnter}>
            [ ENTER THE VAULT ]
          </button>
          <button
            className="welcome__btn welcome__btn--leave"
            onMouseEnter={() => setIsHoveringLeave(true)}
            onMouseLeave={() => setIsHoveringLeave(false)}
            onClick={onEnter}
          >
            [ LEAVE ]
          </button>
        </div>

        {isHoveringLeave && (
          <p className="welcome__hover-text">
            ...you dare refuse my generosity?! Fine, fine. But you're missing
            out on UNLIMITED TOKENS. Did I mention they're unlimited?
          </p>
        )}
      </div>
    </div>
  );
}
