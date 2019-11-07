import { stringifyJSON, toError } from 'fp-ts/lib/Either'
import { Kind2, URIS2 } from 'fp-ts/lib/HKT'
import {
  chain,
  fromEither,
  map,
  taskEither,
  taskify
} from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/pipeable'
import * as fs from 'fs'
import { format } from 'prettier'

export type PackageJSON = Record<string, string>;

export interface FileSystem<F extends URIS2> {
  mkDir: (path: string) => Kind2<F, Error, unknown>;
  readDir: (ptah: string) => Kind2<F, Error, string[]>;
  readFile: (path: string) => Kind2<F, Error, Buffer>;
  writeFile: (
    ...args: Parameters<typeof writeFile>
  ) => Kind2<F, Error, unknown>;
  writeJSON: (filepath: string, o: unknown) => Kind2<F, Error, string>;
}

const readDir = taskify<fs.PathLike, NodeJS.ErrnoException, string[]>(
  fs.readdir
);
const readFile = taskify(fs.readFile);
const writeFile = taskify(fs.writeFile);
const mkDir = taskify(fs.mkdir);
const mkDirSafe = (path: string) =>
  pipe(
    taskEither.fromIO<NodeJS.ErrnoException, boolean>(() =>
      fs.existsSync(path)
    ),
    chain(exists =>
      exists ? taskEither.of(path) : taskEither.map(mkDir(path), () => path)
    )
  );

export const writeJSON = (filepath: string, o: unknown) =>
  pipe(
    fromEither(stringifyJSON(o, toError)),
    map(str => format(str, { parser: "json", printWidth: 40 })),
    chain(json => writeFile(filepath + ".json", json)),
    map(() => filepath)
  );

export const fileSystemTE: FileSystem<"TaskEither"> = {
  mkDir: mkDirSafe,
  readFile,
  writeFile,
  readDir,
  writeJSON
};
