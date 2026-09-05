import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Brain,
  Database,
  Shield,
  LayoutDashboard,
  Info,
} from "lucide-react";
import { AboutOverlay } from "./AboutOverlay";

interface NavigationDropdownProps {
  onAboutOpen?: () => void;
}

export const NavigationDropdown = ({
  onAboutOpen,
}: NavigationDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getCurrentDomain = () => {
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    if (parts.length > 2) {
      return parts.slice(1).join(".");
    }
    return hostname;
  };

  const getSubdomainUrl = (subdomain: string) => {
    const domain = getCurrentDomain();
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : "";
    return `${protocol}//${subdomain}.${domain}${port}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleAboutClick = () => {
    setIsOpen(false);
    if (onAboutOpen) {
      onAboutOpen();
    } else {
      setAboutOpen(true);
    }
  };

  const handleCloseAbout = () => {
    setAboutOpen(false);
  };

  return (
    <>
      <div ref={dropdownRef} className="relative">
        {/* Logo Button */}
        <button
          onClick={handleLogoClick}
          className="h-10 w-10 rounded-full overflow-hidden border border-border bg-background flex items-center justify-center hover:border-accent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          style={{ minWidth: 40 }}
          type="button"
          aria-label="Navigation menu"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <img
            src="/boucio-logo.png"
            alt="Logo"
            className="object-cover h-full w-full"
            style={{ display: "block" }}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className="absolute right-0 top-0 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[200px] overflow-hidden"
            role="menu"
            aria-orientation="vertical"
          >
            {/* Logo header section */}
            <div className="flex items-center gap-3 p-3 border-b border-border">
              <div className="h-10 w-10 rounded-full overflow-hidden border border-border bg-background flex items-center justify-center shrink-0">
                <img
                  src="/boucio-logo.png"
                  alt="Logo"
                  className="object-cover h-full w-full"
                />
              </div>
              <span className="font-semibold text-foreground">Navigate to</span>
            </div>

            {/* Navigation Items */}
            <div className="py-1">
              <a
                href={getSubdomainUrl("chat")}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
                role="menuitem"
              >
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span>Chatbot</span>
              </a>
              <a
                href={getSubdomainUrl("agent")}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
                role="menuitem"
              >
                <Brain className="w-4 h-4 text-muted-foreground" />
                <span>Agent</span>
              </a>
              <a
                href={getSubdomainUrl("memory")}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
                role="menuitem"
              >
                <Database className="w-4 h-4 text-muted-foreground" />
                <span>Memory</span>
              </a>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Admin / Portal */}
            <div className="py-1">
              <a
                href={getSubdomainUrl("admin")}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
                role="menuitem"
              >
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span>Admin</span>
              </a>
              <a
                href={getSubdomainUrl("portal")}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
                role="menuitem"
              >
                <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                <span>Portal</span>
              </a>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* About */}
            <div className="py-1">
              <button
                onClick={handleAboutClick}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer w-full text-left"
                role="menuitem"
              >
                <Info className="w-4 h-4 text-muted-foreground" />
                <span>About</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {!onAboutOpen && aboutOpen && (
        <AboutOverlay isOpen={aboutOpen} onClose={handleCloseAbout} />
      )}
    </>
  );
};
