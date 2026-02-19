"use client";

import { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Building2,
  User,
  Search,
  AlertTriangle,
  Globe,
  Clock,
  Heart,
  ShieldAlert,
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
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Types ──────────────────────────────────────────────────────
interface CorporateLink {
  companyName: string;
  companyCnpj: string;
  companyStatus?: string;
  role: string;
  sharePercentage?: number;
  isOffshore: boolean;
  isRecentCreation: boolean;
  hasIrregularity: boolean;
  irregularityDesc?: string;
  openDate?: string | Date;
}

interface RelatedPerson {
  name: string;
  cpfCnpj?: string;
  role: string;
  relationship?: string;
  riskFlags?: string[];
  companyCnpj?: string;
}

interface CorporateNetworkProps {
  corporateLinks: CorporateLink[];
  relatedPersons: RelatedPerson[];
  targetName: string;
  targetDocument: string;
}

// ── Risk flag badge ────────────────────────────────────────────
const FLAG_STYLES: Record<string, { bg: string; icon: React.ElementType }> = {
  "Empresa Recente": { bg: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", icon: Clock },
  Offshore: { bg: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", icon: Globe },
  Irregularidade: { bg: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", icon: ShieldAlert },
  "Cônjuge": { bg: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", icon: Heart },
};

function RiskBadge({ flag }: { flag: string }) {
  const style = FLAG_STYLES[flag] ?? {
    bg: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    icon: AlertTriangle,
  };
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg}`}
    >
      <Icon className="size-3" />
      {flag}
    </span>
  );
}

// ── Status indicator ───────────────────────────────────────────
function StatusIndicator({ status }: { status?: string }) {
  if (!status) return null;
  const isActive = status.toLowerCase().includes("ativ");
  return (
    <span className="text-[11px] font-medium">
      {isActive ? (
        <span className="text-green-600 dark:text-green-400">Ativa</span>
      ) : (
        <span className="text-red-600 dark:text-red-400">{status}</span>
      )}
    </span>
  );
}

// ── Mask document ──────────────────────────────────────────────
function formatDocument(doc: string): string {
  const clean = doc.replace(/\D/g, "");
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  }
  if (clean.length === 14) {
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
  }
  return doc;
}

// ── Build risk flags for a company ─────────────────────────────
function buildCompanyFlags(link: CorporateLink): string[] {
  const flags: string[] = [];
  if (link.isRecentCreation) flags.push("Empresa Recente");
  if (link.isOffshore) flags.push("Offshore");
  if (link.hasIrregularity) flags.push("Irregularidade");
  return flags;
}

// ── Company node ───────────────────────────────────────────────
function CompanyNode({
  link,
  relatedPersons,
  depth,
  onInvestigate,
}: {
  link: CorporateLink;
  relatedPersons: RelatedPerson[];
  depth: number;
  onInvestigate: (cnpj: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const childPersons = relatedPersons.filter(
    (p) => p.companyCnpj === link.companyCnpj
  );
  const hasChildren = childPersons.length > 0;
  const flags = buildCompanyFlags(link);
  const paddingLeft = 16 + depth * 24;

  return (
    <div>
      {/* Company row */}
      <div
        className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group"
        style={{ paddingLeft }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Tree connector */}
        <span className="text-muted-foreground text-xs select-none w-4 shrink-0">
          {depth > 0 ? "├─" : ""}
        </span>

        {/* Expand/collapse */}
        {hasChildren ? (
          <button
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Icon */}
        <Building2 className="size-4 text-amber-500 shrink-0" />

        {/* Name & info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">
              {link.companyName}
            </span>
            <span className="text-xs text-muted-foreground">
              ({formatDocument(link.companyCnpj)})
            </span>
            <span className="text-xs text-muted-foreground">
              — {link.role}
              {link.sharePercentage != null && ` ${link.sharePercentage}%`}
            </span>
            <StatusIndicator status={link.companyStatus} />
          </div>
          {flags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {flags.map((flag) => (
                <RiskBadge key={flag} flag={flag} />
              ))}
            </div>
          )}
        </div>

        {/* Investigate button */}
        <Button
          variant="outline"
          size="xs"
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onInvestigate(link.companyCnpj, link.companyName);
          }}
        >
          <Search className="size-3" />
          Investigar
        </Button>
      </div>

      {/* Child persons */}
      {expanded &&
        childPersons.map((person, idx) => (
          <PersonNode
            key={`${person.cpfCnpj ?? person.name}-${idx}`}
            person={person}
            depth={depth + 1}
            isLast={idx === childPersons.length - 1}
          />
        ))}
    </div>
  );
}

// ── Person node ────────────────────────────────────────────────
function PersonNode({
  person,
  depth,
  isLast,
}: {
  person: RelatedPerson;
  depth: number;
  isLast: boolean;
}) {
  const paddingLeft = 16 + depth * 24;
  const flags = person.riskFlags ?? [];
  if (person.relationship === "Cônjuge" && !flags.includes("Cônjuge")) {
    flags.push("Cônjuge");
  }

  return (
    <div
      className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors"
      style={{ paddingLeft }}
    >
      <span className="text-muted-foreground text-xs select-none w-4 shrink-0">
        {isLast ? "└─" : "├─"}
      </span>
      <span className="w-4 shrink-0" />
      <User className="size-4 text-blue-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm truncate">{person.name}</span>
          {person.cpfCnpj && (
            <span className="text-xs text-muted-foreground">
              ({formatDocument(person.cpfCnpj)})
            </span>
          )}
          <span className="text-xs text-muted-foreground">— {person.role}</span>
        </div>
        {flags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {flags.map((flag) => (
              <RiskBadge key={flag} flag={flag} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export function CorporateNetwork({
  corporateLinks,
  relatedPersons,
  targetName,
  targetDocument,
}: CorporateNetworkProps) {
  const [investigatingCnpj, setInvestigatingCnpj] = useState<string | null>(null);

  function handleInvestigate(cnpj: string, name: string) {
    setInvestigatingCnpj(cnpj);
    // Open the investigation detail or trigger a new investigation
    // For now we log and could navigate
    console.log(`Investigar empresa: ${name} (${cnpj})`);
    setTimeout(() => setInvestigatingCnpj(null), 1000);
  }

  // Group persons that are NOT linked to a specific company (top-level related persons)
  const topLevelPersons = relatedPersons.filter(
    (p) => !p.companyCnpj || !corporateLinks.some((l) => l.companyCnpj === p.companyCnpj)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rede Societaria</CardTitle>
        <CardDescription>
          Estrutura corporativa e vinculos do investigado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-0.5">
            {/* Target root node */}
            <div className="flex items-center gap-2 py-2 px-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <Badge className="bg-amber-500 text-white text-[10px]">
                ALVO
              </Badge>
              <span className="text-sm font-semibold">{targetName}</span>
              <span className="text-xs text-muted-foreground">
                ({formatDocument(targetDocument)})
              </span>
            </div>

            {/* Corporate links (companies) */}
            {corporateLinks.length > 0 ? (
              corporateLinks.map((link, idx) => (
                <CompanyNode
                  key={`${link.companyCnpj}-${idx}`}
                  link={link}
                  relatedPersons={relatedPersons}
                  depth={1}
                  onInvestigate={handleInvestigate}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum vinculo societario encontrado
              </p>
            )}

            {/* Top-level related persons (not associated with any company node) */}
            {topLevelPersons.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground font-medium px-2 py-1">
                  Pessoas Relacionadas
                </p>
                {topLevelPersons.map((person, idx) => (
                  <PersonNode
                    key={`top-${person.cpfCnpj ?? person.name}-${idx}`}
                    person={person}
                    depth={1}
                    isLast={idx === topLevelPersons.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
