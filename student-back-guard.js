// Back-button guard for classroom iPads (10/22). Apple Classroom locks students in Safari, where
// the back button or a swipe from the left edge can leave the site and lose the work in memory.
// Once a student is signed in, a "stay" entry is placed in the browser history just below the
// current page. Going back to it is caught, and the page moves forward again with a short notice.
// It cannot stop a reload, typing another address or opening a new tab.

export const BACK_GUARD_HASH = '#stay';
export const BACK_GUARD_NOTICE = '已留在原來的畫面。要離開，請按右上角「結束本次使用」。';

export function createBackGuard({ history, location, isActive }) {
  let installed = false;
  return {
    // Call during a student's tap (Safari ignores history entries added without a tap).
    install() {
      if (installed || !isActive()) return false;
      const here = location.hash || '#home';
      if (here === BACK_GUARD_HASH) return false;
      history.replaceState({ backGuard: true }, '', BACK_GUARD_HASH);
      history.pushState(null, '', here);
      installed = true;
      return true;
    },
    // A new student starts: place a fresh stay entry on their first tap.
    reset() { installed = false; },
    isGuardHash(hash = location.hash) { return hash === BACK_GUARD_HASH; },
    get installed() { return installed; }
  };
}
