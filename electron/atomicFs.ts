import fs from 'fs/promises';
import path from 'path';

/** Функция `atomicWriteText`. */
export async function atomicWriteText(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${filePath}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, content, 'utf-8');
  try {
    await fs.copyFile(filePath, `${filePath}.bak`);
  } catch {
    /* no previous file */
  }
  await fs.rename(tmp, filePath);
}

/** Функция `atomicWriteJson`. */
export async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  await atomicWriteText(filePath, JSON.stringify(data, null, 2));
}
