import React from "react";
import OrdersManager from "@/components/admin/OrdersManager";

export const metadata = {
  title: "إدارة الطلبات والمبيعات | لوحة التحكم",
};

export default function AdminOrdersPage() {
  return <OrdersManager />;
}
