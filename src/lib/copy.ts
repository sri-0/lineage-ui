import { toast } from "sonner";

/** Copy text to the clipboard and confirm with a toast. */
export function copyWithToast(label: string, text: string) {
  void navigator.clipboard.writeText(text);
  toast.success(`${label} copied`);
}
