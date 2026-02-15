export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
  recipe: string | null;
  is_hidden: boolean;
  is_hot: boolean;
  is_ice: boolean;
};

export type InventoryItem = {
  id: string;
  category: string;
  name: string;
  qty: number;
  price: number;
};

export type Order = {
  id: string;
  order_code: string | null;
  status: "주문요청" | "음료준비중" | "완료" | "주문취소";
  subtotal: number;
  discount: number;
  total: number;
  pickup_time: string | null;
  note: string | null;
  customer_token: string | null;
  customer_name?: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  qty: number;
  price: number;
  status: "주문요청" | "제조중" | "제조완료" | "취소";
  recipe: string | null;
};
