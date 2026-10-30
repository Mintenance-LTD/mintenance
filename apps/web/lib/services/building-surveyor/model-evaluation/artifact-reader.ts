import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync } from 'fs';
import path from 'path';

/**
 * Read a regular, direct child of an operator-selected training directory.
 * The directory is trusted configuration, not a request-supplied sandbox root.
 * Reject links rather than following a metrics/log file outside that directory.
 */
export function readEvaluationArtifact(directory: string, filename: string): string | undefined {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(filename)) {
    throw new Error('Invalid evaluation artifact filename');
  }
  const file = path.join(directory, filename);
  let descriptor: number | undefined;
  try {
    if (!lstatSync(file).isFile()) {
      throw new Error('Evaluation artifact must be a regular file, not a link');
    }
    // O_NOFOLLOW also closes the leaf-link replacement race on POSIX. Windows
    // relies on the link check and the trusted directory's access controls.
    descriptor = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0));
    if (!fstatSync(descriptor).isFile()) {
      throw new Error('Evaluation artifact must be a regular file');
    }
    return readFileSync(descriptor, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}
