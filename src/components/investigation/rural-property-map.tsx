"use client";

import {
  MapPin,
  TreePine,
  AlertTriangle,
  ExternalLink,
  Ruler,
  FileText,
  Layers,
  DollarSign,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ── Types ──────────────────────────────────────────────────────
interface RuralAsset {
  id?: string;
  description: string;
  registrationId?: string;
  carCode?: string;
  areaHectares?: number;
  latitude?: number;
  longitude?: number;
  estimatedValue?: number;
  location?: string;
  state?: string;
  city?: string;
  hasRestriction: boolean;
  restrictionType?: string;
  restrictionDetail?: string;
  isSeizable: boolean;
  soilUsage?: {
    crop?: number;
    pasture?: number;
    app?: number;
    other?: number;
  };
  deforestationAlert?: boolean;
  deforestationAlertDetail?: string;
}

interface RuralPropertyMapProps {
  assets: RuralAsset[];
}

// ── BRL formatter ──────────────────────────────────────────────
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFmt = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

// ── Soil usage bar ─────────────────────────────────────────────
function SoilUsageBar({
  usage,
}: {
  usage?: { crop?: number; pasture?: number; app?: number; other?: number };
}) {
  if (!usage) return null;

  const total =
    (usage.crop ?? 0) + (usage.pasture ?? 0) + (usage.app ?? 0) + (usage.other ?? 0);
  if (total === 0) return null;

  const cropPct = ((usage.crop ?? 0) / total) * 100;
  const pasturePct = ((usage.pasture ?? 0) / total) * 100;
  const appPct = ((usage.app ?? 0) / total) * 100;
  const otherPct = ((usage.other ?? 0) / total) * 100;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Uso do Solo</p>
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
        {cropPct > 0 && (
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${cropPct}%` }}
            title={`Lavoura: ${numberFmt.format(usage.crop ?? 0)} ha`}
          />
        )}
        {pasturePct > 0 && (
          <div
            className="bg-yellow-400 transition-all"
            style={{ width: `${pasturePct}%` }}
            title={`Pastagem: ${numberFmt.format(usage.pasture ?? 0)} ha`}
          />
        )}
        {appPct > 0 && (
          <div
            className="bg-emerald-700 transition-all"
            style={{ width: `${appPct}%` }}
            title={`APP/Reserva: ${numberFmt.format(usage.app ?? 0)} ha`}
          />
        )}
        {otherPct > 0 && (
          <div
            className="bg-gray-400 transition-all"
            style={{ width: `${otherPct}%` }}
            title={`Outros: ${numberFmt.format(usage.other ?? 0)} ha`}
          />
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground">
        {cropPct > 0 && (
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-green-500" />
            Lavoura ({numberFmt.format(usage.crop ?? 0)} ha)
          </span>
        )}
        {pasturePct > 0 && (
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-yellow-400" />
            Pastagem ({numberFmt.format(usage.pasture ?? 0)} ha)
          </span>
        )}
        {appPct > 0 && (
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-700" />
            APP/Reserva ({numberFmt.format(usage.app ?? 0)} ha)
          </span>
        )}
        {otherPct > 0 && (
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-gray-400" />
            Outros ({numberFmt.format(usage.other ?? 0)} ha)
          </span>
        )}
      </div>
    </div>
  );
}

// ── Property card ──────────────────────────────────────────────
function PropertyCard({ asset }: { asset: RuralAsset }) {
  const googleMapsUrl =
    asset.latitude != null && asset.longitude != null
      ? `https://www.google.com/maps?q=${asset.latitude},${asset.longitude}`
      : null;

  const locationParts: string[] = [];
  if (asset.city) locationParts.push(asset.city);
  if (asset.state) locationParts.push(asset.state);
  const locationStr = locationParts.join("/") || asset.location || "Localizacao nao informada";

  return (
    <Card className="relative">
      {/* Deforestation alert badge */}
      {asset.deforestationAlert && (
        <div className="absolute top-3 right-3">
          <Badge className="bg-red-600 text-white text-[10px] gap-1">
            <AlertTriangle className="size-3" />
            Alerta de Desmatamento
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TreePine className="size-4 text-green-600 shrink-0" />
          {asset.description}
        </CardTitle>
        <CardDescription>{locationStr}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {asset.areaHectares != null && (
            <div className="flex items-center gap-2">
              <Ruler className="size-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Area</p>
                <p className="font-medium">
                  {numberFmt.format(asset.areaHectares)} ha
                </p>
              </div>
            </div>
          )}

          {asset.registrationId && (
            <div className="flex items-center gap-2">
              <FileText className="size-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Matricula</p>
                <p className="font-medium">{asset.registrationId}</p>
              </div>
            </div>
          )}

          {asset.carCode && (
            <div className="flex items-center gap-2">
              <Layers className="size-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Codigo CAR</p>
                <p className="font-medium text-xs truncate" title={asset.carCode}>
                  {asset.carCode}
                </p>
              </div>
            </div>
          )}

          {asset.estimatedValue != null && (
            <div className="flex items-center gap-2">
              <DollarSign className="size-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">
                  Valor Estimado
                </p>
                <p className="font-medium">{brl.format(asset.estimatedValue)}</p>
              </div>
            </div>
          )}

          {asset.latitude != null && asset.longitude != null && (
            <div className="flex items-center gap-2 col-span-2">
              <MapPin className="size-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Coordenadas</p>
                <p className="font-medium text-xs">
                  {asset.latitude.toFixed(6)}, {asset.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Restriction info */}
        {asset.hasRestriction && (
          <div className="rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-2 text-xs">
            <p className="font-medium text-orange-700 dark:text-orange-300">
              Restricao: {asset.restrictionType ?? "Sim"}
            </p>
            {asset.restrictionDetail && (
              <p className="text-orange-600 dark:text-orange-400 mt-0.5">
                {asset.restrictionDetail}
              </p>
            )}
          </div>
        )}

        {/* Penhorability indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`size-2 rounded-full ${
              asset.isSeizable ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {asset.isSeizable
              ? "Penhoravel"
              : "Impenhoravel"}
          </span>
        </div>

        {/* Deforestation detail */}
        {asset.deforestationAlert && asset.deforestationAlertDetail && (
          <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-2 text-xs text-red-700 dark:text-red-300">
            {asset.deforestationAlertDetail}
          </div>
        )}

        {/* Soil usage */}
        <SoilUsageBar usage={asset.soilUsage} />

        {/* Google Maps button */}
        {googleMapsUrl && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            asChild
          >
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
              <MapPin className="size-3.5" />
              Ver no Google Maps
              <ExternalLink className="size-3" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────
export function RuralPropertyMap({ assets }: RuralPropertyMapProps) {
  if (assets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <TreePine className="size-8 mb-2" />
          <p className="text-sm">Nenhum imovel rural encontrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Imoveis Rurais ({assets.length})
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {assets.map((asset, idx) => (
          <PropertyCard key={asset.id ?? `rural-${idx}`} asset={asset} />
        ))}
      </div>
    </div>
  );
}
