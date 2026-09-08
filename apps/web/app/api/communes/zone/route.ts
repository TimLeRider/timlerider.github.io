import { NextRequest, NextResponse } from "next/server";
import { GeoApiGouvCommuneProvider } from "@/lib/communes/geoApiGouvProvider";

const provider = new GeoApiGouvCommuneProvider();

export async function GET(request: NextRequest) {
  const codeInsee = request.nextUrl.searchParams.get("codeInsee")?.trim() ?? "";
  if (!codeInsee) {
    return NextResponse.json({ error: "Paramètre codeInsee manquant." }, { status: 400 });
  }

  try {
    const commune = await provider.getZone(codeInsee);
    if (!commune) {
      return NextResponse.json({ error: "Commune introuvable." }, { status: 404 });
    }
    return NextResponse.json({ commune });
  } catch {
    return NextResponse.json(
      { error: "Impossible de contacter le service de zonage pour le moment." },
      { status: 502 }
    );
  }
}
