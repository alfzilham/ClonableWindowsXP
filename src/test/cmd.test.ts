import { describe, expect, it } from 'vitest';
import { IDS, VFS } from '../core/vfsCore';
import { promptFor, runCommand, tokenize } from '../apps/cmdLogic';

const env = { userName: 'Tester', now: new Date(2026, 10, 14, 15, 30) };

describe('command prompt', () => {
  it('tokenizes with quotes', () => {
    expect(tokenize('copy "my file.txt" dest')).toEqual(['copy', 'my file.txt', 'dest']);
  });

  it('shows the prompt for the current directory', () => {
    const fs = new VFS();
    expect(promptFor(fs, IDS.user)).toBe('C:\\Documents and Settings\\User>');
    expect(promptFor(fs, IDS.c)).toBe('C:\\>');
  });

  it('navigates with cd and clamps at drive C', () => {
    const fs = new VFS();
    expect(runCommand('cd My Documents', IDS.user, fs, env).cwd).toBe(IDS.docs);
    expect(runCommand('cd ..', IDS.docs, fs, env).cwd).toBe(IDS.user);
    expect(runCommand('cd \\', IDS.docs, fs, env).cwd).toBe(IDS.c);
    expect(runCommand('cd nowhere', IDS.docs, fs, env).output[0]).toContain('cannot find the path');
    expect(runCommand('c:', IDS.docs, fs, env).cwd).toBe(IDS.c);
  });

  it('lists a directory with dir', () => {
    const fs = new VFS();
    const out = runCommand('dir', IDS.docs, fs, env).output.join('\n');
    expect(out).toContain('Directory of C:\\Documents and Settings\\User\\My Documents');
    expect(out).toContain('Welcome.txt');
    expect(out).toContain('<DIR>          My Pictures');
  });

  it('creates, copies, renames and deletes', () => {
    const fs = new VFS();
    runCommand('mkdir stuff', IDS.docs, fs, env);
    expect(fs.resolve('stuff', IDS.docs)?.type).toBe('dir');
    expect(runCommand('mkdir stuff', IDS.docs, fs, env).output[0]).toContain('already exists');
    runCommand('copy Welcome.txt stuff', IDS.docs, fs, env);
    expect(fs.resolve('stuff\\Welcome.txt', IDS.docs)).not.toBeNull();
    runCommand('ren stuff things', IDS.docs, fs, env);
    expect(fs.resolve('things', IDS.docs)).not.toBeNull();
    expect(runCommand('rd things', IDS.docs, fs, env).output[0]).toContain('not empty');
    runCommand('rd /s things', IDS.docs, fs, env);
    expect(fs.resolve('things', IDS.docs)).toBeNull();
    runCommand('del Welcome.txt', IDS.docs, fs, env);
    expect(fs.resolve('Welcome.txt', IDS.docs)).toBeNull();
  });

  it('types files and echoes text', () => {
    const fs = new VFS();
    expect(runCommand('type Welcome.txt', IDS.docs, fs, env).output[0]).toBe('Welcome to Windows XP Clone!');
    expect(runCommand('echo hello world', IDS.docs, fs, env).output).toEqual(['hello world']);
  });

  it('launches programs', () => {
    const fs = new VFS();
    expect(runCommand('start notepad', IDS.docs, fs, env).launch?.appId).toBe('notepad');
    expect(runCommand('calc', IDS.docs, fs, env).launch?.appId).toBe('calculator');
    expect(runCommand('start nothing', IDS.docs, fs, env).launch).toBeUndefined();
  });

  it('reports unknown commands and supports cls / exit / whoami', () => {
    const fs = new VFS();
    expect(runCommand('florp', IDS.docs, fs, env).output[0]).toContain("'florp' is not recognized");
    expect(runCommand('cls', IDS.docs, fs, env).clear).toBe(true);
    expect(runCommand('exit', IDS.docs, fs, env).exit).toBe(true);
    expect(runCommand('whoami', IDS.docs, fs, env).output).toEqual(['pc\\tester']);
  });
});
