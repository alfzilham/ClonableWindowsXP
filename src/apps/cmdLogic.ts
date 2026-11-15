import { resolveRunCommand, type AppId } from '../core/appMeta';
import { IDS, VfsError, type VFS, type VNode } from '../core/vfsCore';

export interface CmdEnv {
  userName: string;
  now: Date;
}

export interface CmdResult {
  output: string[];
  cwd: string;
  clear?: boolean;
  exit?: boolean;
  launch?: { appId: AppId; props?: Record<string, unknown> };
}

export const BANNER = ['Microsoft Windows XP [Version 5.1.2600]', '(C) Copyright 1985-2001 Microsoft Corp. (clone)', ''];

export function promptFor(fs: VFS, cwd: string): string {
  return `${fs.pathOf(cwd)}>`;
}

/** Split a command line into tokens, honouring double quotes. */
export function tokenize(line: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push(m[1] ?? m[2]);
  return out;
}

const pad = (n: number) => String(n).padStart(2, '0');

function stamp(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours() % 12 || 12;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}  ${pad(h)}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

const NOT_FOUND = 'The system cannot find the file specified.';
const PATH_NOT_FOUND = 'The system cannot find the path specified.';

/** The shell never shows "My Computer": treat it as drive C:. */
function clampRoot(node: VNode | null): VNode | null {
  return node && node.id === IDS.root ? null : node;
}

function findTarget(fs: VFS, cwd: string, path: string): VNode | null {
  return clampRoot(fs.resolve(path, cwd));
}

function dir(fs: VFS, cwd: string, args: string[]): string[] {
  const target = args[0] ? findTarget(fs, cwd, args[0]) : fs.get(cwd) ?? null;
  if (!target) return ['File Not Found'];
  const lines = [' Volume in drive C has no label.', ' Volume Serial Number is 1A2B-3C4D', ''];
  if (target.type === 'file') {
    return [...lines, ` Directory of ${fs.pathOf(target.parent ?? IDS.c)}`, '', `${stamp(target.modified)}  ${String(target.content.length).padStart(14)} ${target.name}`];
  }
  lines.push(` Directory of ${fs.pathOf(target.id)}`, '');
  if (target.id !== IDS.c) {
    lines.push(`${stamp(target.modified)}    <DIR>          .`, `${stamp(target.modified)}    <DIR>          ..`);
  }
  const children = fs.children(target.id);
  let files = 0;
  let dirs = 0;
  let bytes = 0;
  for (const c of children) {
    if (c.type === 'dir') {
      dirs++;
      lines.push(`${stamp(c.modified)}    <DIR>          ${c.name}`);
    } else {
      files++;
      bytes += c.content.length;
      lines.push(`${stamp(c.modified)}  ${String(c.content.length).padStart(14)} ${c.name}`);
    }
  }
  lines.push(`${String(files).padStart(16)} File(s) ${String(bytes).padStart(14)} bytes`);
  lines.push(`${String(dirs + (target.id !== IDS.c ? 2 : 0)).padStart(16)} Dir(s)  10,737,418,240 bytes free`);
  return lines;
}

function tree(fs: VFS, id: string, prefix = ''): string[] {
  const out: string[] = [];
  const kids = fs.children(id).filter((c) => c.type === 'dir');
  kids.forEach((k, i) => {
    const last = i === kids.length - 1;
    out.push(`${prefix}${last ? '\\---' : '+---'}${k.name}`);
    out.push(...tree(fs, k.id, `${prefix}${last ? '    ' : '|   '}`));
  });
  return out;
}

const HELP = [
  'For more information on a specific command, type HELP command-name',
  'CD       Displays the name of or changes the current directory.',
  'CLS      Clears the screen.',
  'COPY     Copies a file.',
  'DATE     Displays the date.',
  'DEL      Deletes a file permanently.',
  'DIR      Displays a list of files and subdirectories in a directory.',
  'ECHO     Displays messages.',
  'EXIT     Quits the command prompt.',
  'MKDIR    Creates a directory (alias MD).',
  'REN      Renames a file or directory.',
  'RMDIR    Removes a directory (alias RD, /S for non-empty).',
  'START    Starts a program (notepad, calc, mspaint, winmine, sol, iexplore...).',
  'TIME     Displays the time.',
  'TREE     Graphically displays the folder structure.',
  'TYPE     Displays the contents of a text file.',
  'VER      Displays the Windows version.',
  'WHOAMI   Displays the current user.',
];

export function runCommand(input: string, cwd: string, fs: VFS, env: CmdEnv): CmdResult {
  const tokens = tokenize(input);
  const result = (output: string[], nextCwd = cwd, extra: Partial<CmdResult> = {}): CmdResult => ({ output, cwd: nextCwd, ...extra });
  if (tokens.length === 0) return result([]);
  const cmd = tokens[0].toLowerCase();
  const args = tokens.slice(1);

  // Drive change: "c:"
  if (/^[a-z]:$/.test(cmd)) {
    return cmd === 'c:' ? result([], IDS.c) : result(['The system cannot find the drive specified.']);
  }

  try {
    switch (cmd) {
      case 'help':
        return result(HELP);
      case 'cls':
        return result([], cwd, { clear: true });
      case 'exit':
        return result([], cwd, { exit: true });
      case 'ver':
        return result(['', 'Microsoft Windows XP [Version 5.1.2600]']);
      case 'whoami':
        return result([`pc\\${env.userName.toLowerCase()}`]);
      case 'date':
        return result([`The current date is: ${env.now.toLocaleDateString()}`]);
      case 'time':
        return result([`The current time is: ${env.now.toLocaleTimeString()}`]);
      case 'echo':
        return result([args.length ? args.join(' ') : 'ECHO is on.']);
      case 'dir':
        return result(dir(fs, cwd, args));
      case 'tree':
        return result([fs.pathOf(cwd), ...tree(fs, cwd)]);
      case 'cd':
      case 'chdir': {
        if (args.length === 0) return result([fs.pathOf(cwd)]);
        const target = findTarget(fs, cwd, args.join(' '));
        if (!target || target.type !== 'dir') return result([PATH_NOT_FOUND]);
        return result([], target.id);
      }
      case 'type': {
        if (!args[0]) return result(['The syntax of the command is incorrect.']);
        const node = findTarget(fs, cwd, args[0]);
        if (!node || node.type !== 'file') return result([NOT_FOUND]);
        return result(node.content.split(/\r?\n/));
      }
      case 'mkdir':
      case 'md': {
        if (!args[0]) return result(['The syntax of the command is incorrect.']);
        fs.createDir(cwd, args[0]);
        return result([]);
      }
      case 'del':
      case 'erase': {
        const node = args[0] ? findTarget(fs, cwd, args[0]) : null;
        if (!node || node.type !== 'file') return result(['Could Not Find ' + (args[0] ?? '')]);
        fs.purge(node.id);
        return result([]);
      }
      case 'rmdir':
      case 'rd': {
        const recursive = args.some((a) => a.toLowerCase() === '/s');
        const name = args.find((a) => !a.startsWith('/'));
        const node = name ? findTarget(fs, cwd, name) : null;
        if (!node || node.type !== 'dir') return result([PATH_NOT_FOUND]);
        if (!recursive && fs.children(node.id, true).length > 0) return result(['The directory is not empty.']);
        if (node.id === cwd || fs.isDescendantOf(cwd, node.id)) return result(['The process cannot access the file because it is being used by another process.']);
        fs.purge(node.id);
        return result([]);
      }
      case 'ren':
      case 'rename': {
        const node = args[0] ? findTarget(fs, cwd, args[0]) : null;
        if (!node || !args[1]) return result(['The syntax of the command is incorrect.']);
        fs.rename(node.id, args[1]);
        return result([]);
      }
      case 'copy': {
        const src = args[0] ? findTarget(fs, cwd, args[0]) : null;
        if (!src || src.type !== 'file' || !args[1]) return result([NOT_FOUND]);
        const dest = findTarget(fs, cwd, args[1]);
        if (dest && dest.type === 'dir') fs.copy(src.id, dest.id);
        else fs.createFile(cwd, args[1], src.content, src.mime);
        return result(['        1 file(s) copied.']);
      }
      case 'start': {
        const name = args[0] ?? '';
        const appId = resolveRunCommand(name);
        if (!appId) return result([`Windows cannot find '${name}'. Make sure you typed the name correctly.`]);
        return result([], cwd, { launch: { appId } });
      }
      default: {
        const appId = resolveRunCommand(cmd);
        if (appId) return result([], cwd, { launch: { appId } });
        return result([`'${tokens[0]}' is not recognized as an internal or external command,`, 'operable program or batch file.']);
      }
    }
  } catch (err) {
    if (err instanceof VfsError) {
      return result([err.code === 'exists' ? 'A subdirectory or file already exists.' : err.message]);
    }
    throw err;
  }
}
