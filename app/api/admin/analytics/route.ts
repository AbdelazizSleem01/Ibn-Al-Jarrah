import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";
import Order from "@/models/Order";
import { getAuthUser } from "@/lib/auth/token";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالدخول" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";

    await dbConnect();

    // Determine date threshold
    let startDate = new Date();
    if (period === "7d") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "30d") {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === "90d") {
      startDate.setDate(startDate.getDate() - 90);
    } else if (period === "1y") {
      startDate.setDate(startDate.getDate() - 365);
    } else {
      startDate = new Date(0); // All time
    }

    // Parallel Aggregation Pipeline
    const [
      kpiData,
      dailyTrend,
      orderStatusDistribution,
      paymentMethodDistribution,
      governorateSales,
      topBooks,
      topCategories,
      inventoryStats,
    ] = await Promise.all([
      // 1. Overall KPI Summary
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $facet: {
            totalOrders: [{ $count: "count" }],
            deliveredOrders: [{ $match: { orderStatus: "delivered" } }, { $count: "count" }],
            cancelledOrders: [{ $match: { orderStatus: "cancelled" } }, { $count: "count" }],
            pendingOrders: [{ $match: { orderStatus: "pending" } }, { $count: "count" }],
            financials: [
              { $match: { orderStatus: { $nin: ["pending", "cancelled"] } } },
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: "$grandTotal" },
                  totalProfit: { $sum: "$totalProfit" },
                  totalBooksSold: {
                    $sum: {
                      $reduce: {
                        input: "$items",
                        initialValue: 0,
                        in: { $add: ["$$value", "$$this.quantity"] },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      ]),

      // 2. Daily Sales & Revenue Trend
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            orderStatus: { $nin: ["pending", "cancelled"] },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            revenue: { $sum: "$grandTotal" },
            profit: { $sum: "$totalProfit" },
            ordersCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 60 },
      ]),

      // 3. Order Status Distribution
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: "$orderStatus",
            count: { $sum: 1 },
            totalValue: { $sum: "$grandTotal" },
          },
        },
      ]),

      // 4. Payment Method Distribution
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: "$paymentMethod",
            count: { $sum: 1 },
            totalValue: { $sum: "$grandTotal" },
          },
        },
      ]),

      // 5. Governorate Sales Distribution (Top 8)
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            orderStatus: { $nin: ["cancelled"] },
          },
        },
        {
          $group: {
            _id: "$governorate",
            ordersCount: { $sum: 1 },
            totalRevenue: { $sum: "$grandTotal" },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 8 },
      ]),

      // 6. Top Best Selling Books (Top 6)
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            orderStatus: { $nin: ["pending", "cancelled"] },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.bookId",
            title: { $first: "$items.title" },
            slug: { $first: "$items.slug" },
            coverImage: { $first: "$items.coverImage" },
            quantitySold: { $sum: "$items.quantity" },
            totalSales: { $sum: "$items.totalPrice" },
          },
        },
        { $sort: { quantitySold: -1 } },
        { $limit: 6 },
      ]),

      // 7. Top Selling Categories
      Book.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: "$categoryId",
            bookCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: { $ifNull: ["$category.name", "عام"] },
            bookCount: 1,
          },
        },
        { $sort: { bookCount: -1 } },
        { $limit: 6 },
      ]),

      // 8. Inventory Stock Overview
      Book.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            totalCatalogBooks: { $sum: 1 },
            availableBooks: {
              $sum: { $cond: [{ $eq: ["$availabilityStatus", "available"] }, 1, 0] },
            },
            unavailableBooks: {
              $sum: { $cond: [{ $eq: ["$availabilityStatus", "unavailable"] }, 1, 0] },
            },
            totalInventoryValue: { $sum: { $ifNull: ["$prices.egp", 0] } },
          },
        },
      ]),
    ]);

    // Process KPI Output
    const facet = kpiData[0] || {};
    const totalOrders = facet.totalOrders?.[0]?.count || 0;
    const deliveredOrders = facet.deliveredOrders?.[0]?.count || 0;
    const cancelledOrders = facet.cancelledOrders?.[0]?.count || 0;
    const pendingOrders = facet.pendingOrders?.[0]?.count || 0;

    const fin = facet.financials?.[0] || {};
    const totalRevenue = fin.totalRevenue || 0;
    const totalProfit = fin.totalProfit || 0;
    const totalBooksSold = fin.totalBooksSold || 0;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const deliveryRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

    const inv = inventoryStats[0] || {};

    return NextResponse.json(
      {
        success: true,
        message: "تم جلب تقارير وإحصائيات المنصة بنجاح",
        data: {
          period,
          kpis: {
            totalRevenue,
            totalProfit,
            totalOrders,
            deliveredOrders,
            pendingOrders,
            cancelledOrders,
            totalBooksSold,
            avgOrderValue,
            deliveryRate,
          },
          inventory: {
            totalCatalogBooks: inv.totalCatalogBooks || 0,
            availableBooks: inv.availableBooks || 0,
            unavailableBooks: inv.unavailableBooks || 0,
            totalInventoryValue: inv.totalInventoryValue || 0,
          },
          dailyTrend,
          orderStatusDistribution,
          paymentMethodDistribution,
          governorateSales,
          topBooks,
          topCategories,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Analytics GET Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب التقارير والإحصائيات" },
      { status: 500 }
    );
  }
}
