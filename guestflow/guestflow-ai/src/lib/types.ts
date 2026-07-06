// Shared domain types used across server and client code.

export type PropertyType = "airbnb" | "villa" | "hotel" | "rooms";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  airbnb: "Airbnb",
  villa: "Βίλα",
  hotel: "Ξενοδοχείο",
  rooms: "Rooms to let",
};

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  type: PropertyType;
  area: string;
  languages: string[];
  checkin_time: string;
  checkout_time: string;
  wifi_name: string;
  wifi_password: string;
  house_rules: string;
  access_instructions: string;
  phone: string;
  emergency_contact: string;
  welcome_message: string;
  quick_buttons: string[];
  created_at: string;
}

export type KnowledgeCategory =
  | "wifi"
  | "checkin_checkout"
  | "transport"
  | "parking"
  | "beaches"
  | "food"
  | "drinks"
  | "supermarket"
  | "pharmacy"
  | "rules"
  | "faq";

export const KNOWLEDGE_CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  wifi: "WiFi",
  checkin_checkout: "Check-in / Check-out",
  transport: "Μεταφορά / Ταξί",
  parking: "Πάρκινγκ",
  beaches: "Παραλίες",
  food: "Φαγητό",
  drinks: "Ποτό",
  supermarket: "Σούπερ μάρκετ",
  pharmacy: "Φαρμακείο",
  rules: "Κανόνες καταλύματος",
  faq: "Συχνές ερωτήσεις",
};

export interface KnowledgeItem {
  id: string;
  property_id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  created_at: string;
}

export type RequestStatus = "new" | "in_progress" | "done";

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  new: "Νέο",
  in_progress: "Σε εξέλιξη",
  done: "Ολοκληρώθηκε",
};

export const REQUEST_CATEGORY_LABELS: Record<string, string> = {
  housekeeping: "Καθαριότητα / Πετσέτες",
  issue: "Πρόβλημα",
  taxi: "Ταξί",
  late_checkout: "Late checkout",
  help: "Βοήθεια",
  other: "Άλλο",
};

export interface GuestRequest {
  id: string;
  property_id: string;
  session_id: string | null;
  category: string;
  message: string;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: "guest" | "assistant";
  content: string;
}
