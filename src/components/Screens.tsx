import { useEffect, useState } from 'react';
import { os, setPhase } from '../core/os';
import { useStore } from '../core/store';
import { playStartup } from '../core/sound';
import { turnOff } from '../core/power';
import { Icon } from './Icon';

const BOOT_MS = 3600;

function Brand({ small }: { small?: boolean }) {
  return (
    <div className={`brand${small ? ' small' : ''}`}>
      <Icon name="windows" size={small ? 44 : 64} />
      <div>
        <div className="brand-line">Windows<sup>xp</sup></div>
        <div className="brand-sub">Clone Edition</div>
      </div>
    </div>
  );
}

export function BootScreen() {
  useEffect(() => {
    const timer = window.setTimeout(() => setPhase('login'), BOOT_MS);
    const skip = (e: KeyboardEvent) => e.key === 'Escape' && setPhase('login');
    window.addEventListener('keydown', skip);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', skip);
    };
  }, []);

  return (
    <div className="screen boot" onClick={() => setPhase('login')}>
      <Brand />
      <div className="boot-bar" aria-label="Starting Windows">
        <div className="boot-blocks" />
      </div>
      <div className="boot-hint">Click or press Esc to skip</div>
      <div className="boot-copy">Fan-made recreation. Not affiliated with Microsoft.</div>
    </div>
  );
}

export function LoginScreen() {
  const userName = useStore(os, (s) => s.userName);
  const [welcoming, setWelcoming] = useState(false);

  useEffect(() => {
    if (!welcoming) return;
    const timer = window.setTimeout(() => setPhase('desktop'), 1700);
    return () => window.clearTimeout(timer);
  }, [welcoming]);

  const signIn = () => {
    playStartup();
    setWelcoming(true);
  };

  if (welcoming) {
    return (
      <div className="screen login welcome">
        <div className="login-top" />
        <div className="login-mid"><span className="welcome-text">welcome</span></div>
        <div className="login-bottom" />
      </div>
    );
  }

  return (
    <div className="screen login">
      <div className="login-top" />
      <div className="login-mid">
        <div className="login-left"><Brand small /><p>To begin, click your user name</p></div>
        <div className="login-divider" />
        <div className="login-right">
          <button type="button" className="user-tile" onClick={signIn} autoFocus>
            <span className="user-pic"><Icon name="user" size={52} /></span>
            <span className="user-name">{userName}</span>
          </button>
        </div>
      </div>
      <div className="login-bottom">
        <button type="button" className="login-power" onClick={turnOff}>
          <Icon name="power" size={30} /> Turn off computer
        </button>
        <span className="login-note">After you log on, you can add or change accounts in Control Panel.</span>
      </div>
    </div>
  );
}

export function ShutdownScreen() {
  return (
    <div className="screen shutdown">
      <Brand small />
      <p>Windows is shutting down...</p>
    </div>
  );
}

export function OffScreen() {
  return (
    <div className="screen off" onClick={() => setPhase('boot')} role="button" tabIndex={0} onKeyDown={() => setPhase('boot')}>
      <p>It is now safe to turn off your computer.</p>
      <small>Click anywhere to power on</small>
    </div>
  );
}
