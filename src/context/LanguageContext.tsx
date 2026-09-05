import React, { createContext, useContext, useEffect, useState } from "react";
import logger from "@/lib/logger";

const log = logger.child("Language");

type Language = "english" | "french" | "spanish";

interface Translations {
  // Settings Overlay
  settings: string;
  account: string;
  generalSettings: string;
  theme: string;
  chooseTheme: string;
  language: string;
  selectLanguage: string;
  notifications: string;
  enableNotifications: string;
  accountInformation: string;
  email: string;
  displayName: string;
  plan: string;
  freePlan: string;
  upgrade: string;
  dangerZone: string;
  deleteAccount: string;
  cancel: string;
  saveChanges: string;

  // Theme options
  light: string;
  dark: string;
  system: string;

  // Language options
  english: string;
  french: string;
  spanish: string;

  // Sidebar
  newChat: string;
  logOut: string;
  noChats: string;

  // About Overlay
  chatBot: string;
  uiVersion: string;
  llmVersion: string;
  copyright: string;
  allRightsReserved: string;
  close: string;

  // Copy functionality
  copyAiMessage: string;
  copyUserMessage: string;
  messageCopied: string;
  copyFailed: string;

  // Chat actions
  rename: string;
  archive: string;
  delete: string;
  chatActions: string;

  // Feedback buttons
  goodResponse: string;
  badResponse: string;

  // File attachment
  addFiles: string;
  attach: string;

  // Keyboard shortcuts
  keyboardShortcuts: string;
  shortcutNewChat: string;
  shortcutToggleSidebar: string;
  shortcutSendMessage: string;
  shortcutClearInput: string;
  shortcutFocusInput: string;

  // Message search
  searchMessages: string;
  searchPlaceholder: string;
  shortcutSearchMessages: string;
  shortcutShowHelp: string;
  pressEscapeToClose: string;

  // Delete confirmation
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  confirm: string;

  // Rename & search
  renameAssignment: string;
  searchAssignments: string;

  // Error toasts
  errorLoadAssignments: string;
  errorDeleteAssignment: string;
  errorCreateAssignment: string;
  errorLoadChat: string;
  errorSendMessage: string;

  // Settings saved
  settingsSaved: string;
}

const translations: Record<Language, Translations> = {
  english: {
    settings: "Settings",
    account: "Account",
    generalSettings: "General Settings",
    theme: "Theme",
    chooseTheme: "Choose your preferred theme",
    language: "Language",
    selectLanguage: "Select your language",
    notifications: "Notifications",
    enableNotifications: "Enable desktop notifications",
    accountInformation: "Account Information",
    email: "Email",
    displayName: "Display Name",
    plan: "Plan",
    freePlan: "Free Plan",
    upgrade: "Upgrade",
    dangerZone: "Danger Zone",
    deleteAccount: "Delete Account",
    cancel: "Cancel",
    saveChanges: "Save Changes",
    light: "Light",
    dark: "Dark",
    system: "System",
    english: "English",
    french: "French",
    spanish: "Spanish",
    newChat: "New Chat",
    logOut: "Log out",
    noChats: "No chats. Press + New chat button above",
    chatBot: "ChatBot",
    uiVersion: "UI Version",
    llmVersion: "LLM Version",
    copyright: "© 2024 ChatBot. All rights reserved.",
    allRightsReserved: "All rights reserved",
    close: "Close",
    copyAiMessage: "Copy AI message",
    copyUserMessage: "Copy your message",
    messageCopied: "Message copied to clipboard",
    copyFailed: "Failed to copy message",
    rename: "Rename",
    archive: "Archive",
    delete: "Delete",
    chatActions: "Chat actions",
    goodResponse: "Good response",
    badResponse: "Bad response",
    addFiles: "Add files or photos",
    attach: "Attach",
    keyboardShortcuts: "Keyboard Shortcuts",
    shortcutNewChat: "New chat",
    shortcutToggleSidebar: "Toggle sidebar",
    shortcutSendMessage: "Send message",
    shortcutClearInput: "Clear input",
    shortcutFocusInput: "Focus input",
    searchMessages: "Search messages",
    searchPlaceholder: "Search messages...",
    shortcutSearchMessages: "Search messages",
    shortcutShowHelp: "Show keyboard shortcuts",
    pressEscapeToClose: "Press Escape to close",
    deleteConfirmTitle: "Delete Assignment",
    deleteConfirmDescription:
      "Are you sure you want to delete this assignment? This action cannot be undone.",
    confirm: "Confirm",
    renameAssignment: "Rename",
    searchAssignments: "Search assignments...",
    errorLoadAssignments: "Failed to load assignments",
    errorDeleteAssignment: "Failed to delete assignment",
    errorCreateAssignment: "Failed to create assignment",
    errorLoadChat: "Failed to load chat",
    errorSendMessage: "Failed to send message",
    settingsSaved: "Settings saved successfully",
  },
  french: {
    settings: "Paramètres",
    account: "Compte",
    generalSettings: "Paramètres généraux",
    theme: "Thème",
    chooseTheme: "Choisissez votre thème préféré",
    language: "Langue",
    selectLanguage: "Sélectionnez votre langue",
    notifications: "Notifications",
    enableNotifications: "Activer les notifications de bureau",
    accountInformation: "Informations du compte",
    email: "Email",
    displayName: "Nom d'affichage",
    plan: "Plan",
    freePlan: "Plan gratuit",
    upgrade: "Mettre à niveau",
    dangerZone: "Zone dangereuse",
    deleteAccount: "Supprimer le compte",
    cancel: "Annuler",
    saveChanges: "Enregistrer les modifications",
    light: "Clair",
    dark: "Sombre",
    system: "Système",
    english: "Anglais",
    french: "Français",
    spanish: "Espagnol",
    newChat: "Nouveau chat",
    logOut: "Se déconnecter",
    noChats: "Aucun chat. Appuyez sur le bouton + Nouveau chat ci-dessus",
    chatBot: "ChatBot",
    uiVersion: "Version UI",
    llmVersion: "Version LLM",
    copyright: "© 2024 ChatBot. Tous droits réservés.",
    allRightsReserved: "Tous droits réservés",
    close: "Fermer",
    copyAiMessage: "Copier le message IA",
    copyUserMessage: "Copier votre message",
    messageCopied: "Message copié dans le presse-papiers",
    copyFailed: "Échec de la copie du message",
    rename: "Renommer",
    archive: "Archiver",
    delete: "Supprimer",
    chatActions: "Actions de chat",
    goodResponse: "Bonne réponse",
    badResponse: "Mauvaise réponse",
    addFiles: "Ajouter des fichiers ou des photos",
    attach: "Joindre",
    keyboardShortcuts: "Raccourcis clavier",
    shortcutNewChat: "Nouveau chat",
    shortcutToggleSidebar: "Basculer la barre latérale",
    shortcutSendMessage: "Envoyer le message",
    shortcutClearInput: "Effacer la saisie",
    shortcutFocusInput: "Focus sur la saisie",
    searchMessages: "Rechercher des messages",
    searchPlaceholder: "Rechercher des messages...",
    shortcutSearchMessages: "Rechercher des messages",
    shortcutShowHelp: "Afficher les raccourcis clavier",
    pressEscapeToClose: "Appuyez sur Échap pour fermer",
    deleteConfirmTitle: "Supprimer la tâche",
    deleteConfirmDescription:
      "Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.",
    confirm: "Confirmer",
    renameAssignment: "Renommer",
    searchAssignments: "Rechercher des tâches...",
    errorLoadAssignments: "Échec du chargement des tâches",
    errorDeleteAssignment: "Échec de la suppression de la tâche",
    errorCreateAssignment: "Échec de la création de la tâche",
    errorLoadChat: "Échec du chargement du chat",
    errorSendMessage: "Échec de l'envoi du message",
    settingsSaved: "Paramètres enregistrés avec succès",
  },
  spanish: {
    settings: "Configuración",
    account: "Cuenta",
    generalSettings: "Configuración general",
    theme: "Tema",
    chooseTheme: "Elige tu tema preferido",
    language: "Idioma",
    selectLanguage: "Selecciona tu idioma",
    notifications: "Notificaciones",
    enableNotifications: "Habilitar notificaciones de escritorio",
    accountInformation: "Información de la cuenta",
    email: "Email",
    displayName: "Nombre de visualización",
    plan: "Plan",
    freePlan: "Plan gratuito",
    upgrade: "Actualizar",
    dangerZone: "Zona peligrosa",
    deleteAccount: "Eliminar cuenta",
    cancel: "Cancelar",
    saveChanges: "Guardar cambios",
    light: "Claro",
    dark: "Oscuro",
    system: "Sistema",
    english: "Inglés",
    french: "Francés",
    spanish: "Español",
    newChat: "Nuevo chat",
    logOut: "Cerrar sesión",
    noChats: "Sin chats. Presiona el botón + Nuevo chat arriba",
    chatBot: "ChatBot",
    uiVersion: "Versión UI",
    llmVersion: "Versión LLM",
    copyright: "© 2024 ChatBot. Todos los derechos reservados.",
    allRightsReserved: "Todos los derechos reservados",
    close: "Cerrar",
    copyAiMessage: "Copiar mensaje de IA",
    copyUserMessage: "Copiar tu mensaje",
    messageCopied: "Mensaje copiado al portapapeles",
    copyFailed: "Error al copiar el mensaje",
    rename: "Renombrar",
    archive: "Archivar",
    delete: "Eliminar",
    chatActions: "Acciones de chat",
    goodResponse: "Buena respuesta",
    badResponse: "Mala respuesta",
    addFiles: "Agregar archivos o fotos",
    attach: "Adjuntar",
    keyboardShortcuts: "Atajos de teclado",
    shortcutNewChat: "Nuevo chat",
    shortcutToggleSidebar: "Alternar barra lateral",
    shortcutSendMessage: "Enviar mensaje",
    shortcutClearInput: "Borrar entrada",
    shortcutFocusInput: "Enfocar entrada",
    searchMessages: "Buscar mensajes",
    searchPlaceholder: "Buscar mensajes...",
    shortcutSearchMessages: "Buscar mensajes",
    shortcutShowHelp: "Mostrar atajos de teclado",
    pressEscapeToClose: "Presiona Escape para cerrar",
    deleteConfirmTitle: "Eliminar tarea",
    deleteConfirmDescription:
      "¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.",
    confirm: "Confirmar",
    renameAssignment: "Renombrar",
    searchAssignments: "Buscar tareas...",
    errorLoadAssignments: "Error al cargar las tareas",
    errorDeleteAssignment: "Error al eliminar la tarea",
    errorCreateAssignment: "Error al crear la tarea",
    errorLoadChat: "Error al cargar el chat",
    errorSendMessage: "Error al enviar el mensaje",
    settingsSaved: "Configuración guardada correctamente",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
}

export type { Language };

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    log.error("useLanguage must be used within a LanguageProvider");
    return {
      language: "english" as Language,
      setLanguage: () => {},
      t: translations.english,
    };
  }
  return context;
};

export const LanguageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("language") as Language;
      return saved && ["english", "french", "spanish"].includes(saved)
        ? saved
        : "english";
    } catch {
      return "english";
    }
  });

  const handleSetLanguage = (newLanguage: Language) => {
    log.info("Setting language to:", newLanguage);
    setLanguage(newLanguage);
    try {
      localStorage.setItem("language", newLanguage);
    } catch (error) {
      log.error("Failed to save language to localStorage:", error);
    }
  };

  const contextValue = {
    language,
    setLanguage: handleSetLanguage,
    t: translations[language],
  };

  log.info("LanguageProvider rendering with:", contextValue);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};
