const changed = () => window.dispatchEvent(new Event("test:navigation"));
const router = {
  push(url: string) { window.history.pushState(null, "", url); changed(); },
  replace(url: string) { window.history.replaceState(null, "", url); changed(); },
  refresh() { changed(); },
};
export const useRouter = () => router;
export const usePathname = () => window.location.pathname;
