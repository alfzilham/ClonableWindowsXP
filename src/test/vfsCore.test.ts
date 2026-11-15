import { describe, expect, it } from 'vitest';
import { IDS, VFS, VfsError, extOf, validateName } from '../core/vfsCore';

const fresh = () => new VFS(undefined, () => 1_000);

describe('VFS', () => {
  it('seeds the default folder structure', () => {
    const fs = fresh();
    expect(fs.pathOf(IDS.docs)).toBe('C:\\Documents and Settings\\User\\My Documents');
    expect(fs.pathOf(IDS.c)).toBe('C:\\');
    expect(fs.pathOf(IDS.root)).toBe('My Computer');
    expect(fs.children(IDS.root).map((n) => n.name)).toEqual(['C:']);
  });

  it('creates files and rejects duplicates case-insensitively', () => {
    const fs = fresh();
    fs.createFile(IDS.docs, 'a.txt', 'hi');
    expect(() => fs.createFile(IDS.docs, 'A.TXT')).toThrow(VfsError);
  });

  it('validates names', () => {
    expect(() => validateName('bad:name')).toThrow(VfsError);
    expect(() => validateName('   ')).toThrow(VfsError);
    expect(validateName('  ok.txt ')).toBe('ok.txt');
    expect(extOf('archive.tar.GZ')).toBe('gz');
    expect(extOf('.hidden')).toBe('');
  });

  it('generates unique names', () => {
    const fs = fresh();
    fs.createFile(IDS.docs, 'New Text Document.txt');
    expect(fs.uniqueName(IDS.docs, 'New Text Document.txt')).toBe('New Text Document (2).txt');
    const a = fs.createUnique(IDS.docs, 'New Folder', 'dir');
    const b = fs.createUnique(IDS.docs, 'New Folder', 'dir');
    expect(a.name).toBe('New Folder');
    expect(b.name).toBe('New Folder (2)');
  });

  it('resolves absolute and relative paths', () => {
    const fs = fresh();
    expect(fs.resolve('C:\\Documents and Settings\\User\\My Documents')?.id).toBe(IDS.docs);
    expect(fs.resolve('c:/documents and settings/user')?.id).toBe(IDS.user);
    expect(fs.resolve('..', IDS.docs)?.id).toBe(IDS.user);
    expect(fs.resolve('My Pictures', IDS.docs)?.id).toBe(IDS.pictures);
    expect(fs.resolve('nope\\x')).toBeNull();
  });

  it('moves, copies and prevents cycles', () => {
    const fs = fresh();
    const dir = fs.createDir(IDS.docs, 'A');
    const sub = fs.createDir(dir.id, 'B');
    expect(() => fs.move(dir.id, sub.id)).toThrow(VfsError);
    const file = fs.createFile(IDS.docs, 'f.txt', 'x');
    fs.move(file.id, dir.id);
    expect(fs.get(file.id)?.parent).toBe(dir.id);
    const copy = fs.copy(dir.id, IDS.desktop);
    expect(fs.children(copy.id).map((n) => n.name)).toEqual(['B', 'f.txt']);
  });

  it('sends deleted items to the recycle bin and restores them', () => {
    const fs = fresh();
    const file = fs.createFile(IDS.docs, 'gone.txt', 'bye');
    fs.remove(file.id);
    expect(fs.isInRecycle(file.id)).toBe(true);
    expect(fs.children(IDS.docs).some((n) => n.id === file.id)).toBe(false);
    fs.restore(file.id);
    expect(fs.get(file.id)?.parent).toBe(IDS.docs);
  });

  it('restores to My Documents when the origin folder is gone', () => {
    const fs = fresh();
    const dir = fs.createDir(IDS.docs, 'Tmp');
    const file = fs.createFile(dir.id, 'x.txt');
    fs.remove(file.id);
    fs.remove(dir.id);
    fs.purge(dir.id);
    fs.restore(file.id);
    expect(fs.get(file.id)?.parent).toBe(IDS.docs);
  });

  it('purges permanently from the bin and empties it', () => {
    const fs = fresh();
    const a = fs.createFile(IDS.docs, 'a.txt');
    const b = fs.createFile(IDS.docs, 'b.txt');
    fs.remove(a.id);
    fs.remove(a.id);
    expect(fs.get(a.id)).toBeUndefined();
    fs.remove(b.id);
    fs.emptyRecycle();
    expect(fs.children(IDS.recycle, true)).toHaveLength(0);
  });

  it('protects system folders', () => {
    const fs = fresh();
    expect(() => fs.remove(IDS.docs)).toThrow(VfsError);
    expect(() => fs.rename(IDS.docs, 'X')).toThrow(VfsError);
    expect(() => fs.move(IDS.docs, IDS.desktop)).toThrow(VfsError);
  });

  it('round-trips through a snapshot', () => {
    const fs = fresh();
    const f = fs.createFile(IDS.docs, 'keep.txt', 'data');
    const copy = new VFS(fs.toSnapshot());
    expect(copy.get(f.id)?.content).toBe('data');
    const next = copy.createFile(IDS.docs, 'later.txt');
    expect(next.id).not.toBe(f.id);
  });

  it('writes file content and reports sizes', () => {
    const fs = fresh();
    const f = fs.createFile(IDS.docs, 'w.txt');
    fs.writeFile(f.id, 'hello');
    expect(fs.sizeOf(f)).toBe(5);
    expect(fs.sizeOf(fs.require(IDS.docs))).toBeGreaterThan(5);
  });
});
