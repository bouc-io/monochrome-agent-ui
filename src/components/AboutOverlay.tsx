
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect } from "react";

interface AboutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutOverlay = ({ isOpen, onClose }: AboutOverlayProps) => {
  const { t } = useLanguage();

  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <div 
        className="bg-background border border-border rounded-lg shadow-xl w-full max-w-md p-8 relative"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCloseClick}
          className="absolute top-4 right-4"
          aria-label="Close about dialog"
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Content */}
        <div className="flex flex-col items-center space-y-6 mt-4">
          {/* Logo */}
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-border bg-background flex items-center justify-center">
            <img
              src="/boucio-logo.png"
              alt="ChatBot Logo"
              className="object-cover h-full w-full"
            />
          </div>

          {/* App Name */}
          <h2 id="about-title" className="text-2xl font-bold text-foreground">{t.chatBot}</h2>

          {/* Version Information */}
          <div className="text-center space-y-2 text-muted-foreground">
            <p className="text-sm">
              <span className="font-medium">{t.uiVersion}:</span> 1.0.0
            </p>
            <p className="text-sm">
              <span className="font-medium">{t.llmVersion}:</span> GPT-4
            </p>
          </div>

          {/* Copyright */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border w-full">
            <p>{t.copyright}</p>
          </div>
        </div>

        {/* Close button at bottom */}
        <div className="flex justify-center mt-8">
          <Button 
            onClick={handleCloseClick}
            className="px-8"
          >
            {t.close}
          </Button>
        </div>
      </div>
    </div>
  );
};
