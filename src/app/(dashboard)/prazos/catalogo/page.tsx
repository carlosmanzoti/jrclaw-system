import { CatalogoDePrazos } from "@/components/prazos/catalogo-de-prazos"

export default function CatalogoPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <CatalogoDePrazos />
      </div>
    </div>
  )
}
