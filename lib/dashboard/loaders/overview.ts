import type { WidgetApiResponse, WidgetFilters, WidgetId, WidgetScope } from "@/type/dashboard";
import { buildGeoMapData } from "@/lib/dashboard/loaders/geoMap";

export async function loadOverviewWidget(
  widgetId: WidgetId,
  _filters?: WidgetFilters,
  _scope: WidgetScope = "both",
  _origin?: string
): Promise<WidgetApiResponse> {
  if (widgetId === "overview.geo_map") {
    try {
      const data = await buildGeoMapData();

      return {
        ok: true,
        widgetId,
        generatedAt: new Date().toISOString(),
        payload: { kind: "geo_map", data },
      };
    } catch (err) {
      console.error("loadOverviewWidget(geo_map) error", err);
      return { ok: false, widgetId, error: "Não foi possível carregar os dados do mapa." };
    }
  }

  return {
    ok: true,
    widgetId,
    generatedAt: new Date().toISOString(),
    payload: { kind: "empty", reason: "Widget não reconhecido." },
  };
}
