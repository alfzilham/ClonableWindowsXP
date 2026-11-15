import type { IconName } from '../components/Icon';
import { openApp, showDialog } from './os';
import { VfsError, extOf, vfs, type VNode } from './vfs';

export type FileKind = 'folder' | 'text' | 'image' | 'audio' | 'unknown';

const TEXT_EXT = new Set(['txt', 'log', 'md', 'ini', 'cfg', 'json', 'js', 'ts', 'css', 'html', 'csv', 'bat']);
const IMAGE_EXT = new Set(['png', 'bmp', 'jpg', 'jpeg', 'gif']);
const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg']);

export function fileKind(node: VNode): FileKind {
  if (node.type === 'dir') return 'folder';
  const ext = extOf(node.name);
  if (TEXT_EXT.has(ext)) return 'text';
  if (IMAGE_EXT.has(ext) || node.mime.startsWith('image/')) return 'image';
  if (AUDIO_EXT.has(ext)) return 'audio';
  return 'unknown';
}

export function iconForNode(node: VNode, open = false): IconName {
  if (node.id === 'c') return 'drive';
  switch (fileKind(node)) {
    case 'folder':
      return open ? 'folderOpen' : 'folder';
    case 'text':
      return 'notepad';
    case 'image':
      return 'image';
    case 'audio':
      return 'music';
    default:
      return 'document';
  }
}

export function typeLabel(node: VNode): string {
  if (node.id === 'c') return 'Local Disk';
  switch (fileKind(node)) {
    case 'folder':
      return 'File Folder';
    case 'text':
      return extOf(node.name) === 'txt' ? 'Text Document' : `${extOf(node.name).toUpperCase()} File`;
    case 'image':
      return 'Image';
    case 'audio':
      return 'Audio File';
    default: {
      const ext = extOf(node.name);
      return ext ? `${ext.toUpperCase()} File` : 'File';
    }
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Run a VFS operation and show an XP-style error box instead of throwing. Returns true on success. */
export function safely(action: () => void): boolean {
  try {
    action();
    return true;
  } catch (err) {
    const message = err instanceof VfsError ? err.message : 'An unexpected error occurred.';
    showDialog({ title: 'Error', message, icon: 'error' });
    return false;
  }
}

/** Open a node with the right program. Folders open in a new Explorer window. */
export function openNode(node: VNode): void {
  switch (fileKind(node)) {
    case 'folder':
      openApp('explorer', { dirId: node.id });
      break;
    case 'text':
      openApp('notepad', { fileId: node.id });
      break;
    case 'image':
      openApp('paint', { fileId: node.id });
      break;
    case 'audio':
      showDialog({
        title: 'Windows Media Player',
        message: 'Audio files stored in this virtual disk cannot be played yet. Use File > Open in Windows Media Player to play a file from your computer.',
        icon: 'info',
      });
      break;
    default:
      showDialog({
        title: 'Open With',
        message: `Windows cannot open this file:\n\n${node.name}\n\nTo open this file, Windows needs to know what program created it.`,
        icon: 'warning',
      });
  }
}

export function describeNode(node: VNode): string {
  const lines = [
    `Name: ${node.name}`,
    `Type: ${typeLabel(node)}`,
    `Location: ${vfs.pathOf(node.parent ?? 'root')}`,
    `Size: ${formatSize(vfs.sizeOf(node))}`,
    `Created: ${new Date(node.created).toLocaleString()}`,
    `Modified: ${new Date(node.modified).toLocaleString()}`,
  ];
  return lines.join('\n');
}
