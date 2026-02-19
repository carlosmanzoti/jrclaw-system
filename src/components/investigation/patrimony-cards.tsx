"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Home,
  Car,
  Building2,
  TrendingUp,
  Tractor,
  Package,
} from "lucide-react";

// --- Types ---

interface AssetCategoryData {
  count: number;
  value: number;
}

interface PatrimonyCardsProps {
  assets: {
    imoveis: AssetCategoryData;
    veiculos: AssetCategoryData;
    participacoes: AssetCategoryData;
    investimentos: AssetCategoryData;
    rural: AssetCategoryData;
    outros: AssetCategoryData;
  };
}

interface CategoryConfig {
  key: keyof PatrimonyCardsProps["assets"];
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

// --- Config ---

const CATEGORIES: CategoryConfig[] = [
  {
    key: "imoveis",
    label: "Imoveis",
    icon: <Home className="size-5" />,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
  },
  {
    key: "veiculos",
    label: "Veiculos",
    icon: <Car className="size-5" />,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
  },
  {
    key: "participacoes",
    label: "Participacoes",
    icon: <Building2 className="size-5" />,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
  },
  {
    key: "investimentos",
    label: "Investimentos",
    icon: <TrendingUp className="size-5" />,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
  },
  {
    key: "rural",
    label: "Rural",
    icon: <Tractor className="size-5" />,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
  },
  {
    key: "outros",
    label: "Outros",
    icon: <Package className="size-5" />,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
  },
];

// --- Helpers ---

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactBRL(value: number): string {
  if (value === 0) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

// --- Component ---

export function PatrimonyCards({ assets }: PatrimonyCardsProps) {
  const totalValue = CATEGORIES.reduce(
    (sum, cat) => sum + (assets[cat.key]?.value ?? 0),
    0
  );
  const totalCount = CATEGORIES.reduce(
    (sum, cat) => sum + (assets[cat.key]?.count ?? 0),
    0
  );

  return (
    <div className="flex flex-col gap-3">
      {/* 2x3 Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CATEGORIES.map((cat) => {
          const data = assets[cat.key] ?? { count: 0, value: 0 };
          const hasItems = data.count > 0;
          return (
            <Card
              key={cat.key}
              className={`transition-colors ${
                hasItems ? "border-amber-200/60" : "border-border opacity-60"
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${cat.iconBg} ${cat.iconColor}`}
                  >
                    {cat.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground truncate">
                      {cat.label}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-foreground">
                        {data.count}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {data.count === 1 ? "item" : "itens"}
                      </span>
                    </div>
                    <p
                      className={`text-xs font-semibold mt-0.5 ${
                        hasItems ? "text-green-700" : "text-muted-foreground"
                      }`}
                    >
                      {formatCompactBRL(data.value)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-amber-900">
            Total Patrimonio
          </span>
          <span className="text-xs text-amber-700">
            ({totalCount} {totalCount === 1 ? "bem" : "bens"})
          </span>
        </div>
        <span className="text-lg font-bold text-amber-900">
          {formatBRL(totalValue)}
        </span>
      </div>
    </div>
  );
}
