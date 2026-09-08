import { NextRequest, NextResponse } from "next/server";
import { GeoApiGouvCommuneProvider } from "@/lib/communes/geoApiGouvProvider";

// Toute logique d'appel externe passe par le backend : le frontend n'appelle
// jamais directement geo.api.gouv.fr, ce qui permet de changer de fournisseur
// (ou d'ajouter une clé/quota) sans toucher au client.
const provider = new GeoApiGouvCommuneProvider();

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ communes: [] });
  }

  try {
    const communes = await provider.searchCommunes(query);
    return NextResponse.json({ communes });
  } catch (error) {
    return NextResponse.json(
      { error: "Impossible de contacter le service de recherche de communes pour le moment." },
      { status: 502 }
    );
  }
}
