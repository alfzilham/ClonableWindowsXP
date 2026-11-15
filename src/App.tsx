import { useEffect } from 'react';
import { os } from './core/os';
import { useStore } from './core/store';
import { initVfs } from './core/vfs';
import { Desktop } from './components/Desktop';
import { BootScreen, LoginScreen, OffScreen, ShutdownScreen } from './components/Screens';

export function App() {
  const phase = useStore(os, (s) => s.phase);
  const themeColor = useStore(os, (s) => s.themeColor);

  useEffect(() => {
    void initVfs();
  }, []);

  return (
    <div className="os-root" data-theme={themeColor} onContextMenu={(e) => e.preventDefault()}>
      {phase === 'boot' && <BootScreen />}
      {phase === 'login' && <LoginScreen />}
      {phase === 'desktop' && <Desktop />}
      {phase === 'shutdown' && <ShutdownScreen />}
      {phase === 'off' && <OffScreen />}
    </div>
  );
}
