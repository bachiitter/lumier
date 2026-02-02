import { isValidElement, type ReactElement, type ReactNode } from "react";

export function reactNodeToString(node: ReactNode): string {
  if (node === null || node === undefined) {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (typeof node === "boolean") {
    return "";
  }

  if (Array.isArray(node)) {
    return node.map(reactNodeToString).join("");
  }

  if (isValidElement(node)) {
    const element = node as ReactElement<{ children?: ReactNode }>;

    if (!element.props.children) {
      return "";
    }

    return reactNodeToString(element.props.children);
  }

  return "";
}
