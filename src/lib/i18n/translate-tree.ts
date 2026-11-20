import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

const attributes = ["alt", "title", "placeholder", "aria-label", "aria-description", "aria-valuetext"] as const;

export function translateTree(children: ReactNode, t: (value: string) => string): ReactNode {
  function walk(node: ReactNode): ReactNode {
    if (typeof node === "string") return t(node);
    if (Array.isArray(node)) return walkChildren(node);
    if (!isValidElement(node)) return node;
    const element = node as ReactElement<Record<string, unknown>>;
    const props = element.props;
    if (props.translate === "no" || props["data-no-translate"] || props.contentEditable) return element;
    if (["script", "style", "textarea"].includes(element.type as string)) return element;
    const translated: Record<string, unknown> = {};
    for (const attribute of attributes) if (typeof props[attribute] === "string") translated[attribute] = t(props[attribute] as string);
    if (props.children !== undefined) translated.children = walkChildren(props.children as ReactNode);
    return cloneElement(element, translated);
  }
  function walkChildren(nodes: ReactNode): ReactNode {
    const output: ReactNode[] = [];
    let text = "";
    const flush = () => { if (text) { output.push(t(text)); text = ""; } };
    Children.toArray(nodes).forEach(node => {
      if (typeof node === "string" || typeof node === "number") text += String(node);
      else { flush(); output.push(walk(node)); }
    });
    flush();
    return output;
  }
  return walk(children);
}
