import { useLanguage } from "@/context/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsHelp = ({
  isOpen,
  onClose,
}: KeyboardShortcutsHelpProps) => {
  const { t } = useLanguage();

  const shortcuts = [
    { key: "Ctrl + N", label: t.shortcutNewChat },
    { key: "Ctrl + B", label: t.shortcutToggleSidebar },
    { key: "Ctrl + F", label: t.shortcutSearchMessages },
    { key: "Ctrl + Enter", label: t.shortcutSendMessage },
    { key: "Escape", label: t.shortcutClearInput },
    { key: "/", label: t.shortcutFocusInput },
    { key: "?", label: t.shortcutShowHelp },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            {t.keyboardShortcuts}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-foreground">{shortcut.label}</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono text-muted-foreground">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {t.pressEscapeToClose}
        </p>
      </DialogContent>
    </Dialog>
  );
};
