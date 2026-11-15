/**
 * Pure in-memory virtual file system. No browser APIs here so it can be unit tested;
 * persistence lives in vfs.ts.
 */

export type NodeType = 'file' | 'dir';

export interface VNode {
  id: string;
  name: string;
  type: NodeType;
  parent: string | null;
  content: string;
  mime: string;
  created: number;
  modified: number;
  /** Parent id before the node was moved to the Recycle Bin. */
  origin?: string;
  hidden?: boolean;
  /** System nodes cannot be renamed, moved or deleted. */
  system?: boolean;
}

export interface VfsSnapshot {
  nodes: VNode[];
  nextId: number;
}

export const IDS = {
  root: 'root',
  c: 'c',
  windows: 'windows',
  programs: 'programs',
  users: 'users',
  user: 'user',
  docs: 'docs',
  pictures: 'pictures',
  music: 'music',
  desktop: 'desktop',
  recycle: 'recycle',
} as const;

export type VfsErrorCode = 'invalid-name' | 'exists' | 'not-found' | 'not-dir' | 'forbidden' | 'cycle';

export class VfsError extends Error {
  readonly code: VfsErrorCode;
  constructor(code: VfsErrorCode, message: string) {
    super(message);
    this.name = 'VfsError';
    this.code = code;
  }
}

const ILLEGAL_NAME = /[\\/:*?"<>|]/;

export function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function validateName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed === '.' || trimmed === '..' || ILLEGAL_NAME.test(trimmed)) {
    throw new VfsError('invalid-name', 'A file name cannot be empty or contain any of the following characters: \\ / : * ? " < > |');
  }
  return trimmed;
}

export class VFS {
  private nodes = new Map<string, VNode>();
  private nextId = 1;
  onChange: (() => void) | null = null;

  constructor(
    snapshot?: VfsSnapshot,
    private readonly clock: () => number = () => Date.now(),
  ) {
    if (snapshot) this.load(snapshot);
    else this.seed();
  }

  // ---------- snapshot ----------
  toSnapshot(): VfsSnapshot {
    return { nodes: [...this.nodes.values()].map((n) => ({ ...n })), nextId: this.nextId };
  }

  load(snapshot: VfsSnapshot): void {
    this.nodes = new Map(snapshot.nodes.map((n) => [n.id, { ...n }]));
    this.nextId = snapshot.nextId;
    if (!this.nodes.has(IDS.root) || !this.nodes.has(IDS.recycle)) {
      this.nodes.clear();
      this.seed();
    }
    this.changed();
  }

  private changed(): void {
    this.onChange?.();
  }

  // ---------- queries ----------
  get(id: string): VNode | undefined {
    return this.nodes.get(id);
  }

  require(id: string): VNode {
    const node = this.nodes.get(id);
    if (!node) throw new VfsError('not-found', 'The system cannot find the file specified.');
    return node;
  }

  children(id: string, includeHidden = false): VNode[] {
    const out: VNode[] = [];
    for (const n of this.nodes.values()) {
      if (n.parent === id && (includeHidden || !n.hidden)) out.push(n);
    }
    return out.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }

  findChild(parentId: string, name: string): VNode | undefined {
    const lower = name.toLowerCase();
    for (const n of this.nodes.values()) {
      if (n.parent === parentId && n.name.toLowerCase() === lower) return n;
    }
    return undefined;
  }

  isDescendantOf(id: string, ancestorId: string): boolean {
    let cur = this.nodes.get(id);
    while (cur) {
      if (cur.id === ancestorId) return true;
      cur = cur.parent ? this.nodes.get(cur.parent) : undefined;
    }
    return false;
  }

  isInRecycle(id: string): boolean {
    return id !== IDS.recycle && this.isDescendantOf(id, IDS.recycle);
  }

  pathOf(id: string): string {
    if (id === IDS.root) return 'My Computer';
    if (id === IDS.recycle) return 'Recycle Bin';
    const parts: string[] = [];
    let cur = this.nodes.get(id);
    while (cur && cur.id !== IDS.root) {
      parts.unshift(cur.name);
      cur = cur.parent ? this.nodes.get(cur.parent) : undefined;
    }
    if (parts.length === 1) return `${parts[0]}\\`;
    return parts.join('\\');
  }

  /** Resolve an absolute (C:\...) or relative path. Accepts / or \ separators. */
  resolve(path: string, cwdId: string = IDS.root): VNode | null {
    const segments = path.split(/[\\/]+/).filter((s) => s.length > 0);
    let cur: VNode | undefined = this.nodes.get(cwdId);
    if (/^[a-z]:$/i.test(segments[0] ?? '') || path.startsWith('\\') || path.startsWith('/')) {
      cur = this.nodes.get(IDS.root);
      if (!/^[a-z]:$/i.test(segments[0] ?? '')) cur = this.nodes.get(IDS.c);
    }
    for (const seg of segments) {
      if (!cur) return null;
      if (seg === '.') continue;
      if (seg === '..') {
        cur = cur.parent ? this.nodes.get(cur.parent) : cur;
        continue;
      }
      if (cur.type !== 'dir') return null;
      cur = this.findChild(cur.id, seg);
    }
    return cur ?? null;
  }

  sizeOf(node: VNode): number {
    if (node.type === 'file') return node.content.length;
    return this.children(node.id, true).reduce((sum, c) => sum + this.sizeOf(c), 0);
  }

  // ---------- mutations ----------
  uniqueName(parentId: string, base: string): string {
    if (!this.findChild(parentId, base)) return base;
    const dot = base.lastIndexOf('.');
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const ext = dot > 0 ? base.slice(dot) : '';
    for (let i = 2; ; i++) {
      const candidate = `${stem} (${i})${ext}`;
      if (!this.findChild(parentId, candidate)) return candidate;
    }
  }

  private makeNode(parentId: string, name: string, type: NodeType, content: string, mime: string): VNode {
    const parent = this.require(parentId);
    if (parent.type !== 'dir') throw new VfsError('not-dir', 'The directory name is invalid.');
    const clean = validateName(name);
    if (this.findChild(parentId, clean)) {
      throw new VfsError('exists', `A file or folder named "${clean}" already exists.`);
    }
    const now = this.clock();
    const node: VNode = {
      id: `n${this.nextId++}`,
      name: clean,
      type,
      parent: parentId,
      content,
      mime,
      created: now,
      modified: now,
    };
    this.nodes.set(node.id, node);
    this.changed();
    return node;
  }

  createDir(parentId: string, name: string): VNode {
    return this.makeNode(parentId, name, 'dir', '', '');
  }

  createFile(parentId: string, name: string, content = '', mime = 'text/plain'): VNode {
    return this.makeNode(parentId, name, 'file', content, mime);
  }

  /** Create with an automatically unique name (used by "New > Folder"). */
  createUnique(parentId: string, base: string, type: NodeType, content = '', mime = 'text/plain'): VNode {
    const name = this.uniqueName(parentId, base);
    return type === 'dir' ? this.createDir(parentId, name) : this.createFile(parentId, name, content, mime);
  }

  writeFile(id: string, content: string, mime?: string): void {
    const node = this.require(id);
    if (node.type !== 'file') throw new VfsError('not-dir', 'Access is denied.');
    node.content = content;
    if (mime) node.mime = mime;
    node.modified = this.clock();
    this.changed();
  }

  rename(id: string, newName: string): void {
    const node = this.require(id);
    if (node.system) throw new VfsError('forbidden', 'Access is denied.');
    const clean = validateName(newName);
    const clash = node.parent ? this.findChild(node.parent, clean) : undefined;
    if (clash && clash.id !== id) throw new VfsError('exists', `A file or folder named "${clean}" already exists.`);
    node.name = clean;
    node.modified = this.clock();
    this.changed();
  }

  move(id: string, newParentId: string): void {
    const node = this.require(id);
    const parent = this.require(newParentId);
    if (node.system) throw new VfsError('forbidden', 'Access is denied.');
    if (parent.type !== 'dir') throw new VfsError('not-dir', 'The destination is not a folder.');
    if (this.isDescendantOf(newParentId, id)) throw new VfsError('cycle', 'Cannot move a folder into itself.');
    if (node.parent === newParentId) return;
    node.name = this.uniqueName(newParentId, node.name);
    node.parent = newParentId;
    delete node.origin;
    node.modified = this.clock();
    this.changed();
  }

  copy(id: string, newParentId: string): VNode {
    const node = this.require(id);
    this.require(newParentId);
    if (node.type === 'dir' && this.isDescendantOf(newParentId, id)) {
      throw new VfsError('cycle', 'Cannot copy a folder into itself.');
    }
    const name = this.uniqueName(newParentId, node.name);
    const created =
      node.type === 'dir'
        ? this.createDir(newParentId, name)
        : this.createFile(newParentId, name, node.content, node.mime);
    if (node.type === 'dir') for (const child of this.children(id, true)) this.copy(child.id, created.id);
    return created;
  }

  /** Delete = move to the Recycle Bin. Items already in the bin are purged. */
  remove(id: string): void {
    const node = this.require(id);
    if (node.system) throw new VfsError('forbidden', 'Access is denied.');
    if (this.isInRecycle(id)) {
      this.purge(id);
      return;
    }
    const origin = node.parent ?? IDS.docs;
    node.name = this.uniqueName(IDS.recycle, node.name);
    node.parent = IDS.recycle;
    node.origin = origin;
    node.modified = this.clock();
    this.changed();
  }

  restore(id: string): void {
    const node = this.require(id);
    if (!this.isInRecycle(id) || node.parent !== IDS.recycle) return;
    const target = node.origin && this.nodes.get(node.origin) ? node.origin : IDS.docs;
    node.name = this.uniqueName(target, node.name);
    node.parent = target;
    delete node.origin;
    this.changed();
  }

  purge(id: string): void {
    const node = this.require(id);
    if (node.system) throw new VfsError('forbidden', 'Access is denied.');
    for (const child of this.children(id, true)) this.purge(child.id);
    this.nodes.delete(node.id);
    this.changed();
  }

  emptyRecycle(): void {
    for (const child of this.children(IDS.recycle, true)) this.purge(child.id);
  }

  // ---------- seed ----------
  private seed(): void {
    this.nodes.clear();
    this.nextId = 1;
    const now = this.clock();
    const add = (id: string, name: string, parent: string | null, extra: Partial<VNode> = {}) => {
      this.nodes.set(id, {
        id,
        name,
        type: 'dir',
        parent,
        content: '',
        mime: '',
        created: now,
        modified: now,
        system: true,
        ...extra,
      });
    };
    add(IDS.root, 'My Computer', null);
    add(IDS.c, 'C:', IDS.root);
    add(IDS.windows, 'WINDOWS', IDS.c);
    add(IDS.programs, 'Program Files', IDS.c);
    add('docsettings', 'Documents and Settings', IDS.c);
    add(IDS.user, 'User', 'docsettings');
    add(IDS.docs, 'My Documents', IDS.user);
    add(IDS.pictures, 'My Pictures', IDS.docs);
    add(IDS.music, 'My Music', IDS.docs);
    add(IDS.desktop, 'Desktop', IDS.user);
    add(IDS.recycle, 'Recycle Bin', IDS.root, { hidden: true });
    this.nodes.set('welcome', {
      id: 'welcome',
      name: 'Welcome.txt',
      type: 'file',
      parent: IDS.docs,
      content:
        'Welcome to Windows XP Clone!\r\n\r\n' +
        'This is a fan-made recreation that runs entirely in your browser.\r\n' +
        'Files you create here are saved in your browser (IndexedDB).\r\n\r\n' +
        'Try: Start > Run... > cmd, Minesweeper, Paint, or right-click the desktop.\r\n',
      mime: 'text/plain',
      created: now,
      modified: now,
    });
    this.nodes.set('readme', {
      id: 'readme',
      name: 'Read me.txt',
      type: 'file',
      parent: IDS.desktop,
      content: 'Double-click files to open them. Drag items onto the Recycle Bin to delete them.\r\n',
      mime: 'text/plain',
      created: now,
      modified: now,
    });
  }
}
