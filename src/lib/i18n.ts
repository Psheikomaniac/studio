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
            "dashboard": "Dashboard",
            "money": "Money",
            "drinks": "Drinks",
            "dues": "Dues",
            "admin": "Admin",
            "welcome": "Welcome",
            "currentBalance": "Current Balance",
            "unpaidPenalties": "Unpaid Penalties",
            "totalPaid": "Total Paid",
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
        }
    },
    fr: {
        translation: {
            "settings": "Paramètres",
            "profile": "Profil",
            "logout": "Se déconnecter",
            "language": "Langue",
            "showLanguageName": "Afficher le nom de la langue",
            "dashboard": "Tableau de bord",
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
            "dashboard": "Painel",
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
            "dashboard": "仪表板",
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
            "dashboard": "Pulpit",
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
            "dashboard": "Панель",
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
