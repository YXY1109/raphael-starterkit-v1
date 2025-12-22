export type CreemEventType =
  | "checkout.completed"
  | "refund.created"
  | "subscription.active"
  | "subscription.trialing"
  | "subscription.canceled"
  | "subscription.paid"
  | "subscription.expired"
  | "subscription.unpaid"
  | "subscription.update";

export interface CreemCustomer {
  id: string;
  object: "customer";
  email: string;
  name: string;
  country: string;
  created_at: string;
  updated_at: string;
  mode: string;
}

export interface CreemProduct {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  price: number;
  currency: string;
  billing_type: "recurring" | "one_time";
  billing_period?: string;
  status: "active" | "inactive";
  tax_mode: "inclusive" | "exclusive";
  tax_category: string;
  default_success_url: string;
  created_at: string;
  updated_at: string;
  mode: string;
  metadata?: {
    credits?: number; // Number of credits this product provides
    product_type?: "subscription" | "credits"; // Type of the product
  };
}

export interface CreemSubscription {
  id: string;
  object: "subscription";
  product: string | CreemProduct;
  customer: string | CreemCustomer;
  collection_method: "charge_automatically";
  status: "active" | "canceled" | "expired";
  canceled_at: string | null;
  current_period_start_date?: string;
  current_period_end_date?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
  mode: string;
}

export interface CreemOrder {
  id: string;
  customer: string;
  product: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed";
  type: "recurring" | "one_time";
  created_at: string;
  updated_at: string;
  mode: string;
  metadata: {
    user_id: string; // User ID of the customer
    product_type: "subscription" | "credits"; // Type of the product
    credits?: number; // Number of credits this order provides
  };
}

export interface CreemCheckout {
  id: string;
  object: "checkout";
  request_id: string;
  order: CreemOrder;
  product: CreemProduct;
  customer: CreemCustomer;
  subscription?: CreemSubscription;
  custom_fields: any[];
  status: "completed" | "pending" | "failed";
  metadata?: Record<string, any>;
  mode: string;
}

export interface CreemWebhookEvent {
  id: string;
  eventType: CreemEventType;
  created_at: number;
  object: CreemCheckout | CreemSubscription | any;
  mode: string;
}

export interface CreditTransaction {
  id: string;
  customer_id: string;
  amount: number;
  type: "add" | "subtract";
  description?: string;
  creem_order_id?: string;
  created_at: string;
  metadata?: Record<string, any>;
}
