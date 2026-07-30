import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";
import Order from "@/models/Order";
import { getAuthUser } from "@/lib/auth/token";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالدخول" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Execute ALL 6 queries concurrently in parallel with projection for maximum performance
    const [
      bookFacetData,
      totalCategories,
      recentBooks,
      ordersFacetData,
      recentOrders,
      topSellingItems,
    ] = await Promise.all([
      Book.aggregate([
        {
          $facet: {
            totalBooks: [{ $match: { isDeleted: false } }, { $count: "count" }],
            availableBooks: [{ $match: { isDeleted: false, availabilityStatus: "available" } }, { $count: "count" }],
            unavailableBooks: [{ $match: { isDeleted: false, availabilityStatus: "unavailable" } }, { $count: "count" }],
            featuredBooks: [{ $match: { isDeleted: false, isFeatured: true } }, { $count: "count" }],
            noImageBooks: [
              {
                $match: {
                  isDeleted: false,
                  $or: [
                    { "coverImage.secureUrl": { $exists: false } },
                    { "coverImage.secureUrl": "" },
                    { "coverImage.secureUrl": null },
                  ],
                },
              },
              { $count: "count" },
            ],
            softDeletedBooks: [{ $match: { isDeleted: true } }, { $count: "count" }],
          },
        },
      ]),
      Category.countDocuments(),
      Book.find({ isDeleted: false })
        .select("title author categoryId prices availabilityStatus coverImage createdAt")
        .populate("categoryId", "name slug")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Order.aggregate([
        {
          $facet: {
            totalOrders: [{ $count: "count" }],
            pendingOrders: [{ $match: { orderStatus: "pending" } }, { $count: "count" }],
            deliveredOrders: [{ $match: { orderStatus: "delivered" } }, { $count: "count" }],
            cancelledOrders: [{ $match: { orderStatus: "cancelled" } }, { $count: "count" }],

            financials: [
              { $match: { orderStatus: { $nin: ["pending", "cancelled"] } } },
              {
                $group: {
                  _id: "$currency",
                  totalRevenue: { $sum: "$grandTotal" },
                  totalProfit: { $sum: "$totalProfit" },
                  itemsSold: {
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
      Order.find()
        .select("orderNumber customerName governorate grandTotal orderStatus paymentStatus currency createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Order.aggregate([
        { $match: { orderStatus: { $nin: ["pending", "cancelled"] } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.bookId",
            title: { $first: "$items.title" },
            slug: { $first: "$items.slug" },
            coverImage: { $first: "$items.coverImage" },
            totalQuantity: { $sum: "$items.quantity" },
            totalSalesValue: { $sum: "$items.totalPrice" },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const facet = bookFacetData[0] || {};
    const totalBooks = facet.totalBooks?.[0]?.count || 0;
    const availableBooks = facet.availableBooks?.[0]?.count || 0;
    const unavailableBooks = facet.unavailableBooks?.[0]?.count || 0;
    const featuredBooks = facet.featuredBooks?.[0]?.count || 0;
    const noImageBooks = facet.noImageBooks?.[0]?.count || 0;
    const softDeletedBooks = facet.softDeletedBooks?.[0]?.count || 0;

    const orderFacet = ordersFacetData[0] || {};
    const totalOrders = orderFacet.totalOrders?.[0]?.count || 0;
    const pendingOrders = orderFacet.pendingOrders?.[0]?.count || 0;
    const deliveredOrders = orderFacet.deliveredOrders?.[0]?.count || 0;
    const cancelledOrders = orderFacet.cancelledOrders?.[0]?.count || 0;

    let totalBooksSold = 0;
    let totalRevenueEGP = 0;
    let totalProfitEGP = 0;

    (orderFacet.financials || []).forEach((fin: any) => {
      totalBooksSold += fin.itemsSold || 0;
      if (fin._id === "EGP" || !fin._id) {
        totalRevenueEGP += fin.totalRevenue || 0;
        totalProfitEGP += fin.totalProfit || 0;
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: "تم جلب إحصائيات لوحة التحكم والمبيعات بنجاح",
        data: {
          totalBooks,
          totalCategories,
          availableBooks,
          unavailableBooks,
          featuredBooks,
          noImageBooks,
          softDeletedBooks,
          recentBooks,
          totalOrders,
          pendingOrders,
          deliveredOrders,
          cancelledOrders,
          totalBooksSold,
          totalRevenueEGP,
          totalProfitEGP,
          recentOrders,
          topSellingItems,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Dashboard Stats GET Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب الإحصائيات" },
      { status: 500 }
    );
  }
}
