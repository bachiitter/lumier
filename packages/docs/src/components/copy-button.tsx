import { IconCheck, IconCopy } from "@tabler/icons-react";
import { Button } from "orphos/button";
import * as React from "react";

function useCopyToClipboard({ timeout = 2000, onCopy }: { timeout?: number; onCopy?: () => void } = {}) {
  const [isCopied, setIsCopied] = React.useState(false);

  const copyToClipboard = (value: string) => {
    if (typeof window === "undefined" || !navigator.clipboard.writeText) {
      return;
    }

    if (!value) return;

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);

      if (onCopy) {
        onCopy();
      }

      if (timeout !== 0) {
        setTimeout(() => {
          setIsCopied(false);
        }, timeout);
      }
    }, console.error);
  };

  return { isCopied, copyToClipboard };
}

export function CopyButton({
  value,
}: React.ComponentProps<typeof Button> & {
  value: string;
}) {
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  return (
    <Button onClick={() => copyToClipboard(value)} size="sm">
      {isCopied ? <IconCheck /> : <IconCopy />}
      Copy Page
    </Button>
  );
}
