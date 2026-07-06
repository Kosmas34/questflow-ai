// Guest-facing UI strings. v1 ships Greek + English;
// add a language by adding a key here and to the property's `languages`.

export type GuestLang = "el" | "en";

export const GUEST_STRINGS: Record<GuestLang, Record<string, string>> = {
  el: {
    welcome: "Καλώς ήρθατε",
    tagline: "Ρωτήστε με ό,τι χρειάζεστε για τη διαμονή σας",
    placeholder: "Γράψτε την ερώτησή σας…",
    send: "Αποστολή",
    thinking: "Ο βοηθός απαντά…",
    quickWifi: "WiFi",
    quickCheckout: "Check-out",
    quickTaxi: "Ταξί",
    quickRestaurants: "Εστιατόρια κοντά",
    quickBeaches: "Παραλίες",
    quickHelp: "Χρειάζομαι βοήθεια",
    qWifi: "Ποιος είναι ο κωδικός WiFi;",
    qCheckout: "Τι ώρα είναι το check-out;",
    qTaxi: "Πώς μπορώ να καλέσω ταξί;",
    qRestaurants: "Ποια εστιατόρια προτείνετε εδώ κοντά;",
    qBeaches: "Ποιες παραλίες είναι κοντά;",
    qHelp: "Χρειάζομαι βοήθεια",
    requestCreated: "✓ Το αίτημά σας στάλθηκε στον ιδιοκτήτη.",
    errorGeneric: "Κάτι πήγε στραβά. Δοκιμάστε ξανά.",
    greeting: "Γεια σας! Είμαι ο ψηφιακός βοηθός του καταλύματος. Ρωτήστε με για WiFi, check-out, παραλίες, εστιατόρια — ό,τι χρειαστείτε.",
    languageLabel: "Γλώσσα",
  },
  en: {
    welcome: "Welcome",
    tagline: "Ask me anything about your stay",
    placeholder: "Type your question…",
    send: "Send",
    thinking: "The assistant is replying…",
    quickWifi: "WiFi",
    quickCheckout: "Check-out",
    quickTaxi: "Taxi",
    quickRestaurants: "Restaurants nearby",
    quickBeaches: "Beaches",
    quickHelp: "I need help",
    qWifi: "What is the WiFi password?",
    qCheckout: "What time is check-out?",
    qTaxi: "How can I get a taxi?",
    qRestaurants: "Which restaurants do you recommend nearby?",
    qBeaches: "Which beaches are close by?",
    qHelp: "I need help",
    requestCreated: "✓ Your request was sent to the host.",
    errorGeneric: "Something went wrong. Please try again.",
    greeting: "Hi! I'm the property's digital assistant. Ask me about WiFi, check-out, beaches, restaurants — anything you need.",
    languageLabel: "Language",
  },
};

export const FALLBACK_ANSWER: Record<GuestLang, string> = {
  el: "Δεν έχω αυτή την πληροφορία. Μπορώ να ενημερώσω τον ιδιοκτήτη.",
  en: "I don't have that information. I can notify the host.",
};
