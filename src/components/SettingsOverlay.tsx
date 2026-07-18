import { useState } from "react";
import { X, Settings, User, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme, Theme } from "@/context/ThemeContext";
import { useLanguage, Language } from "@/context/LanguageContext";
import { useAuth } from "@/auth/authcontext";
import { useToast } from "@/hooks/use-toast";
import { PaymentOverlay } from "@/components/PaymentOverlay";
import logger from '@/lib/logger';

const log = logger.child('Settings');

interface SettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "settings" | "account";
}

export const SettingsOverlay = ({ isOpen, onClose, initialTab = "settings" }: SettingsOverlayProps) => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tempTheme, setTempTheme] = useState<Theme>(theme);
  const [tempLanguage, setTempLanguage] = useState<Language>(language);
  const [isPaymentOverlayOpen, setIsPaymentOverlayOpen] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    log.info('Settings saved');
    setTheme(tempTheme);
    setLanguage(tempLanguage);
    onClose();
    toast({ title: t.settingsSaved });
  };

  const handleThemeChange = (value: string) => {
    setTempTheme(value as Theme);
  };

  const handleLanguageChange = (value: string) => {
    setTempLanguage(value as Language);
  };

  const handleUpgradeClick = () => {
    setIsPaymentOverlayOpen(true);
  };

  // Get user display information with proper type handling
  const userEmail = (user?.email || user?.preferred_username || "Unknown User") as string;
  const userName = (user?.name || user?.preferred_username || userEmail) as string;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl h-[600px] flex flex-col border">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-10"
          >
            <X className="w-4 h-4" />
          </Button>

          <Tabs defaultValue={initialTab} className="w-full flex flex-1">
            {/* Left sidebar with tabs */}
            <div className="w-64 border-r border-border p-6">
              <h2 className="text-xl font-semibold mb-6">{t.settings}</h2>
              <TabsList className="flex flex-col h-auto w-full bg-transparent space-y-2">
                <TabsTrigger 
                  value="settings" 
                  className="w-full justify-start data-[state=active]:bg-accent"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {t.settings}
                </TabsTrigger>
                <TabsTrigger 
                  value="account" 
                  className="w-full justify-start data-[state=active]:bg-accent"
                >
                  <User className="w-4 h-4 mr-2" />
                  {t.account}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Right content area */}
            <div className="flex-1 p-6 flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <TabsContent value="settings" className="mt-0">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">{t.generalSettings}</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">{t.theme}</label>
                            <p className="text-sm text-muted-foreground">{t.chooseTheme}</p>
                          </div>
                          <div className="w-48">
                            <Select value={tempTheme} onValueChange={handleThemeChange}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[60]">
                                <SelectItem value="light">{t.light}</SelectItem>
                                <SelectItem value="dark">{t.dark}</SelectItem>
                                <SelectItem value="system">{t.system}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">{t.language}</label>
                            <p className="text-sm text-muted-foreground">{t.selectLanguage}</p>
                          </div>
                          <div className="w-48">
                            <Select value={tempLanguage} onValueChange={handleLanguageChange}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[60]">
                                <SelectItem value="english">{t.english}</SelectItem>
                                <SelectItem value="french">{t.french}</SelectItem>
                                <SelectItem value="spanish">{t.spanish}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">{t.notifications}</label>
                            <p className="text-sm text-muted-foreground">{t.enableNotifications}</p>
                          </div>
                          <input type="checkbox" className="rounded" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Keyboard Shortcuts Section */}
                    <div className="pt-4 border-t border-border">
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Keyboard className="w-5 h-5" />
                        {t.keyboardShortcuts}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t.shortcutShowHelp}</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">?</kbd>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="account" className="mt-0">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">{t.accountInformation}</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">{t.email}</label>
                          <input 
                            type="email" 
                            value={userEmail} 
                            readOnly
                            className="w-full border border-input rounded-md px-3 py-2 bg-muted text-muted-foreground cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">{t.displayName}</label>
                          <input 
                            type="text" 
                            value={userName}
                            readOnly
                            className="w-full border border-input rounded-md px-3 py-2 bg-muted text-muted-foreground cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">{t.plan}</label>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 bg-secondary rounded text-sm">{t.freePlan}</span>
                            <Button variant="outline" size="sm" onClick={handleUpgradeClick}>
                              {t.upgrade}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <h4 className="text-md font-medium mb-3">{t.dangerZone}</h4>
                      <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950">
                        {t.deleteAccount}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </div>
          </Tabs>

          {/* Footer with action buttons */}
          <div className="border-t border-border p-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave}>
              {t.saveChanges}
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Overlay */}
      <PaymentOverlay 
        isOpen={isPaymentOverlayOpen} 
        onClose={() => setIsPaymentOverlayOpen(false)} 
      />
    </>
  );
};
