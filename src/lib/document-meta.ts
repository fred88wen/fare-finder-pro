import { useEffect } from "react";

type Meta = { title: string; description?: string; robots?: string };

function setMetaTag(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Per-page <title>/<meta> updates — the client-side stand-in for the `head()`
 * option each TanStack Start route used to declare.
 */
export function useDocumentMeta({ title, description, robots }: Meta) {
  useEffect(() => {
    document.title = title;
    setMetaTag('meta[property="og:title"]', "property", "og:title", title);

    if (description) {
      setMetaTag('meta[name="description"]', "name", "description", description);
      setMetaTag('meta[property="og:description"]', "property", "og:description", description);
    }

    if (robots) {
      setMetaTag('meta[name="robots"]', "name", "robots", robots);
    } else {
      document.head.querySelector('meta[name="robots"]')?.remove();
    }
  }, [title, description, robots]);
}
