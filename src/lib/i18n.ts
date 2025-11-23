import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translations
const resources = {
    en: {
        translation: {
            "settings": "Settings",
            "profile": "Profile",
            "logout": "Log out",
            "language": "Language",
            "showLanguageName": "Show Language Name",

            "money": "Money",
            "drinks": "Drinks",
            "dues": "Dues",
            "admin": "Admin",
            "welcome": "Welcome",
            "currentBalance": "Current Balance",
            "unpaidPenalties": "Unpaid Penalties",
            "totalPaid": "Total Paid",
            "login": "Login",
            "signup": "Sign Up",
            "email": "Email",
            "password": "Password",
            "signIn": "Sign In",
            "createAccount": "Create Account",
            "welcomeBack": "Welcome back",
            "enterEmailToSignIn": "Enter your email to sign in to your account",
            "termsAgreement": "By clicking continue, you agree to our Terms of Service and Privacy Policy.",
            "authError": "Authentication Error",
            "loginFailed": "Login Failed",
            "signUpFailed": "Sign Up Failed",
            "failedToSignIn": "Failed to sign in.",
            "invalidCredential": "Invalid email or password. Please try again.",
            "tooManyRequests": "Too many failed attempts. Please try again later.",
            "failedToCreateAccount": "Failed to create account.",
            "emailInUse": "This email is already registered.",
            "weakPassword": "Password should be at least 6 characters.",
            "nav": {
                // "dashboard": "Dashboard",
                "players": "Players",
                "money": "Money",
                "settings": "Settings",
                "profile": "Profile",
                "billing": "Billing",
                "logout": "Log out"
            },
            "theme": {
                "label": "Theme",
                "light": "Light",
                "dark": "Dark",
                "system": "System"
            },
            "stats": {
                "totalCredit": "Total Credit",
                "totalDebt": "Total Debt",
                "openFines": "Open Fines",
                "totalCreditDesc": "Total amount owed to players.",
                "totalDebtDesc": "Total outstanding fines.",
                "openFinesDesc": "Number of fines waiting for payment."
            },
            "dashboard": {
                "revenueByDay": "Revenue by Day (last 28 days)",
                "topBeverages": "Top Beverages",
                "mostConsumedDrinks": "Most consumed drinks",
                "transactionsByType": "Transactions by Type (last 28 days)",
                "transactionsDesc": "Fines, Dues, Beverages vs. Payments",
                "quickActions": "Quick Actions",
                "quickActionsDesc": "Common tasks for managing team finances",
                "addFine": "Add Fine",
                "addPayment": "Add Payment",
                "recordDue": "Record Due",
                "recordBeverage": "Record Beverage",
                "topDebtors": "Top Debtors",
                "topDebtorsDesc": "Players with the highest debts",
                "recentActivity": "Recent Activity",
                "recentActivityDesc": "Last 5 transactions",
                "noPlayersInDebt": "No players in debt",
                "noRecentActivity": "No recent activity",
                "errorLoading": "Error Loading Dashboard",
                "errorLoadingDesc": "Failed to load dashboard data. Please try again later.",
                "lastUpdate": "Last data update"
            },
            "charts": {
                "fineStatistics": "Fine Statistics",
                "totalFinesDesc": "Total fines issued per month."
            },
            "multiSelect": {
                "placeholder": "Select players",
                "selected": "{{count}} player(s) selected",
                "search": "Search players...",
                "noPlayers": "No players found.",
                "done": "Done"
            },
            "dialogs": {
                "addFineTitle": "Assign a New Fine",
                "addFineDesc": "Select player(s) and a reason to assign a fine. Use the AI helper for quick suggestions.",
                "transgressionDesc": "Transgression Description (for AI)",
                "suggestWithAI": "Suggest with AI",
                "players": "Players",
                "reason": "Reason",
                "amount": "Amount (€)",
                "assignFine": "Assign Fine",
                "aiError": "AI Error",
                "aiSuggestionApplied": "AI Suggestion Applied!",
                "aiSuggestionAppliedDesc": "Reason and players have been pre-filled.",
                "pleaseEnterDesc": "Please enter a description of the transgression first."
            }
        }
    },
    de: {
        translation: {
            "settings": "Einstellungen",
            "profile": "Profil",
            "logout": "Abmelden",
            "language": "Sprache",
            "showLanguageName": "Sprachnamen anzeigen",
            "dashboard": "Übersicht",
            "money": "Finanzen",
            "drinks": "Getränke",
            "dues": "Beiträge",
            "admin": "Verwaltung",
            "welcome": "Willkommen",
            "currentBalance": "Aktuelles Guthaben",
            "unpaidPenalties": "Offene Strafen",
            "totalPaid": "Gesamt bezahlt",
            "login": "Anmelden",
            "signup": "Registrieren",
            "email": "E-Mail",
            "password": "Passwort",
            "signIn": "Anmelden",
            "createAccount": "Konto erstellen",
            "welcomeBack": "Willkommen zurück",
            "enterEmailToSignIn": "Geben Sie Ihre E-Mail ein, um sich anzumelden",
            "termsAgreement": "Durch Klicken auf Weiter stimmen Sie unseren Nutzungsbedingungen und Datenschutzrichtlinien zu.",
            "authError": "Authentifizierungsfehler",
            "loginFailed": "Anmeldung fehlgeschlagen",
            "signUpFailed": "Registrierung fehlgeschlagen",
            "failedToSignIn": "Anmeldung fehlgeschlagen.",
            "invalidCredential": "Ungültige E-Mail oder Passwort. Bitte versuchen Sie es erneut.",
            "tooManyRequests": "Zu viele fehlgeschlagene Versuche. Bitte versuchen Sie es später erneut.",
            "failedToCreateAccount": "Kontoerstellung fehlgeschlagen.",
            "emailInUse": "Diese E-Mail ist bereits registriert.",
            "weakPassword": "Das Passwort muss mindestens 6 Zeichen lang sein.",
            "nav": {
                "dashboard": "Übersicht",
                "players": "Spieler",
                "money": "Finanzen",
                "settings": "Einstellungen",
                "profile": "Profil",
                "billing": "Abrechnung",
                "logout": "Abmelden"
            },
            "theme": {
                "label": "Darstellung",
                "light": "Hell",
                "dark": "Dunkel",
                "system": "System"
            },
            "stats": {
                "totalCredit": "Aktuelles Guthaben",
                "totalDebt": "Offene Schulden",
                "openFines": "Offene Strafen",
                "totalCreditDesc": "Gesamtbetrag, der den Spielern geschuldet wird.",
                "totalDebtDesc": "Gesamte ausstehende Strafen.",
                "openFinesDesc": "Anzahl der unbezahlten Strafen."
            },
            "dashboard": {
                "revenueByDay": "Einnahmen pro Tag (letzte 28 Tage)",
                "topBeverages": "Top Getränke",
                "mostConsumedDrinks": "Meist konsumierte Getränke",
                "transactionsByType": "Transaktionen nach Typ (letzte 28 Tage)",
                "transactionsDesc": "Strafen, Beiträge, Getränke vs. Zahlungen",
                "quickActions": "Schnellzugriff",
                "quickActionsDesc": "Häufige Aufgaben für die Teamverwaltung",
                "addFine": "Strafe hinzufügen",
                "addPayment": "Zahlung hinzufügen",
                "recordDue": "Beitrag erfassen",
                "recordBeverage": "Getränk erfassen",
                "topDebtors": "Top Schuldner",
                "topDebtorsDesc": "Spieler mit den höchsten Schulden",
                "recentActivity": "Letzte Aktivitäten",
                "recentActivityDesc": "Die letzten 5 Transaktionen",
                "noPlayersInDebt": "Keine Spieler mit Schulden",
                "noRecentActivity": "Keine aktuellen Aktivitäten",
                "errorLoading": "Fehler beim Laden der Übersicht",
                "errorLoadingDesc": "Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.",
                "lastUpdate": "Letzte Aktualisierung"
            },
            "charts": {
                "fineStatistics": "Strafen Statistik",
                "totalFinesDesc": "Gesamte Strafen pro Monat."
            },
            "multiSelect": {
                "placeholder": "Spieler auswählen",
                "selected": "{{count}} Spieler ausgewählt",
                "search": "Spieler suchen...",
                "noPlayers": "Keine Spieler gefunden.",
                "done": "Fertig"
            },
            "dialogs": {
                "addFineTitle": "Neue Strafe zuweisen",
                "addFineDesc": "Wählen Sie Spieler und einen Grund aus. Nutzen Sie den KI-Helfer für schnelle Vorschläge.",
                "transgressionDesc": "Beschreibung des Vergehens (für KI)",
                "suggestWithAI": "Mit KI vorschlagen",
                "players": "Spieler",
                "reason": "Grund",
                "amount": "Betrag (€)",
                "assignFine": "Strafe zuweisen",
                "aiError": "KI Fehler",
                "aiSuggestionApplied": "KI Vorschlag angewendet!",
                "aiSuggestionAppliedDesc": "Grund und Spieler wurden vorausgefüllt.",
                "pleaseEnterDesc": "Bitte geben Sie zuerst eine Beschreibung des Vergehens ein."
            }
        }
    },
    fr: {
        translation: {
            "settings": "Paramètres",
            "profile": "Profil",
            "logout": "Se déconnecter",
            "language": "Langue",
            "showLanguageName": "Afficher le nom de la langue",

            "money": "Argent",
            "drinks": "Boissons",
            "dues": "Cotisations",
            "admin": "Admin",
            "welcome": "Bienvenue",
            "currentBalance": "Solde actuel",
            "unpaidPenalties": "Pénalités impayées",
            "totalPaid": "Total payé",
        }
    },
    es: {
        translation: {
            "settings": "Ajustes",
            "profile": "Perfil",
            "logout": "Cerrar sesión",
            "language": "Idioma",
            "showLanguageName": "Mostrar nombre del idioma",
            "dashboard": "Panel",
            "money": "Dinero",
            "drinks": "Bebidas",
            "dues": "Cuotas",
            "admin": "Admin",
            "welcome": "Bienvenido",
            "currentBalance": "Saldo actual",
            "unpaidPenalties": "Multas impagas",
            "totalPaid": "Total pagado",
        }
    },
    pt: {
        translation: {
            "settings": "Configurações",
            "profile": "Perfil",
            "logout": "Sair",
            "language": "Idioma",
            "showLanguageName": "Mostrar nome do idioma",

            "money": "Dinheiro",
            "drinks": "Bebidas",
            "dues": "Mensalidades",
            "admin": "Admin",
            "welcome": "Bem-vindo",
            "currentBalance": "Saldo atual",
            "unpaidPenalties": "Multas não pagas",
            "totalPaid": "Total pago",
        }
    },
    zh: {
        translation: {
            "settings": "设置",
            "profile": "个人资料",
            "logout": "登出",
            "language": "语言",
            "showLanguageName": "显示语言名称",

            "money": "资金",
            "drinks": "饮料",
            "dues": "会费",
            "admin": "管理",
            "welcome": "欢迎",
            "currentBalance": "当前余额",
            "unpaidPenalties": "未付罚款",
            "totalPaid": "已付总额",
        }
    },
    tr: {
        translation: {
            "settings": "Ayarlar",
            "profile": "Profil",
            "logout": "Çıkış Yap",
            "language": "Dil",
            "showLanguageName": "Dil adını göster",
            "dashboard": "Panel",
            "money": "Para",
            "drinks": "İçecekler",
            "dues": "Aidatlar",
            "admin": "Yönetici",
            "welcome": "Hoşgeldiniz",
            "currentBalance": "Güncel Bakiye",
            "unpaidPenalties": "Ödenmemiş Cezalar",
            "totalPaid": "Toplam Ödenen",
        }
    },
    pl: {
        translation: {
            "settings": "Ustawienia",
            "profile": "Profil",
            "logout": "Wyloguj",
            "language": "Język",
            "showLanguageName": "Pokaż nazwę języka",

            "money": "Finanse",
            "drinks": "Napoje",
            "dues": "Składki",
            "admin": "Admin",
            "welcome": "Witaj",
            "currentBalance": "Obecne saldo",
            "unpaidPenalties": "Niezapłacone kary",
            "totalPaid": "Łącznie zapłacono",
        }
    },
    ru: {
        translation: {
            "settings": "Настройки",
            "profile": "Профиль",
            "logout": "Выйти",
            "language": "Язык",
            "showLanguageName": "Показывать название языка",

            "money": "Деньги",
            "drinks": "Напитки",
            "dues": "Взносы",
            "admin": "Админ",
            "welcome": "Добро пожаловать",
            "currentBalance": "Текущий баланс",
            "unpaidPenalties": "Неоплаченные штрафы",
            "totalPaid": "Всего оплачено",
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        }
    });

export default i18n;
