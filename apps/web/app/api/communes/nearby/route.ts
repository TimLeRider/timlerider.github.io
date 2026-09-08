import { NextRequest, NextResponse } from "next/server";
import { GeoApiGouvCommuneProvider } from "@/lib/communes/geoApiGouvProvider";

const provider = new GeoApiGouvCommuneProvider();

export async function GET(request: NextRequest) {
  const codeInsee = request.nextUrl.searchParams.get("codeInsee")?.trim() ?? "";
  const radiusKm = Number(request.nextUrl.searchParams.get("radiusKm") ?? "10");

  if (!codeInsee) {
    return NextResponse.json({ error: "Paramètre codeInsee manquant." }, { status: 400 });
  }

  try {
    const communes = await provider.findNearbyCommunes(codeInsee, radiusKm);
    return NextResponse.json({ communes });
  } catch {
    return NextResponse.json(
      { error: "Impossible de contacter le service de recherche pour le moment." },
      { status: 502 }
    );
  }
}
