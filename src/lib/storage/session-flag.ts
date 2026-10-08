/**
 * Whether a one-page-load value (`./session.ts`) is waiting, without reading or removing it. A
 * module of its own because every page asks (search's arrival, `src/scripts/search-boot.ts`) while
 * only the script that reads the value needs `./session.ts`: kept apart, neither costs the other's
 * page anything. Never throws: blocked storage reads as "nothing waiting".
 */
export function sessionHas(key: string, win: Window = window): boolean {
  try {
    return win.sessionStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}
