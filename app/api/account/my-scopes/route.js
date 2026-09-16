// // path: app/api/account/my-scopes/route.js

// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import { supabaseAdmin } from "@/lib/supabase";
// import { isGlobalAdmin } from "@/lib/dataScope";

// export async function GET() {
//   const session = await getServerSession(authOptions);
//   if (!session)
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   if (isGlobalAdmin(session)) {
//     return NextResponse.json({ isGlobal: true, brands: [], branches: [] });
//   }

//   const scopes = session.user.scopes || {};

//   const [brandsRes, branchesRes] = await Promise.all([
//     scopes.brandIds?.length
//       ? supabaseAdmin
//           .from("brands")
//           .select("id, name, company_id")
//           .in("id", scopes.brandIds)
//       : Promise.resolve({ data: [] }),
//     scopes.branchIds?.length
//       ? supabaseAdmin
//           .from("branches")
//           .select("id, name, brand_id")
//           .in("id", scopes.branchIds)
//       : Promise.resolve({ data: [] }),
//   ]);

//   return NextResponse.json({
//     isGlobal: false,
//     brands: brandsRes.data || [],
//     branches: branchesRes.data || [],
//   });
// }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isGlobalAdmin } from "@/lib/dataScope";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isGlobalAdmin(session)) {
      return NextResponse.json({ isGlobal: true, brands: [], branches: [] });
    }

    const scopes = session.user.scopes || {};

    const [brands, branches] = await Promise.all([
      scopes.brandIds?.length
        ? prisma.brand.findMany({
            where: {
              id: { in: scopes.brandIds },
            },
            select: {
              id: true,
              name: true,
              company_id: true,
            },
          })
        : Promise.resolve([]),
      scopes.branchIds?.length
        ? prisma.branch.findMany({
            where: {
              id: { in: scopes.branchIds },
            },
            select: {
              id: true,
              name: true,
              brand_id: true,
            },
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      isGlobal: false,
      brands,
      branches,
    });
  } catch (error) {
    console.error("Failed to fetch account scopes from Prisma:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        isGlobal: false,
        brands: [],
        branches: [],
      },
      { status: 500 },
    );
  }
}
