import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 11,
    fontFamily: "Helvetica",
    lineHeight: 1.6,
  },
  header: {
    textAlign: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 160,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#555",
  },
  value: {
    flex: 1,
    fontSize: 10,
  },
  body: {
    fontSize: 11,
    lineHeight: 1.7,
    marginBottom: 8,
    textAlign: "justify",
  },
  signature: {
    marginTop: 40,
    textAlign: "center",
  },
  signatureLine: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: "#333",
    width: 250,
    alignSelf: "center",
    paddingTop: 4,
    textAlign: "center",
    fontSize: 10,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  watermark: {
    position: "absolute",
    top: 300,
    left: 100,
    fontSize: 50,
    color: "#f0f0f0",
    transform: "rotate(-45deg)",
    fontFamily: "Helvetica-Bold",
  },
});

export interface CRJProposalPDFData {
  title: string;
  content: string;
  isDraft: boolean;
  metadata: {
    process_number: string;
    client_name: string;
    creditor_name: string;
    creditor_cpf_cnpj: string;
    creditor_class: string;
    credit_amount: string;
    proposed_amount: string;
    discount_percentage: string;
    installments: string;
    date: string;
    assignee_name: string;
    assignee_oab: string;
  };
}

export function CRJProposalPDFDocument({ data }: { data: CRJProposalPDFData }) {
  const lines = data.content.split("\n");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {data.isDraft && <Text style={styles.watermark}>RASCUNHO</Text>}

        <View style={styles.header}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.subtitle}>
            Processo n.o {data.metadata.process_number}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Recuperanda:</Text>
            <Text style={styles.value}>{data.metadata.client_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Credor:</Text>
            <Text style={styles.value}>
              {data.metadata.creditor_name} ({data.metadata.creditor_cpf_cnpj})
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Classe:</Text>
            <Text style={styles.value}>{data.metadata.creditor_class}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Credito:</Text>
            <Text style={styles.value}>{data.metadata.credit_amount}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Proposta:</Text>
            <Text style={styles.value}>
              {data.metadata.proposed_amount} (desagio{" "}
              {data.metadata.discount_percentage})
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Parcelas:</Text>
            <Text style={styles.value}>{data.metadata.installments}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Termos da Proposta</Text>
          {lines.map((line, i) => (
            <Text key={i} style={styles.body}>
              {line || " "}
            </Text>
          ))}
        </View>

        <View style={styles.signature}>
          <Text style={{ fontSize: 10, marginBottom: 4 }}>
            {data.metadata.date}
          </Text>
          <View style={styles.signatureLine}>
            <Text>{data.metadata.assignee_name}</Text>
            <Text style={{ fontSize: 9, color: "#666" }}>
              OAB: {data.metadata.assignee_oab}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            Documento gerado automaticamente — JRCLaw Sistema de Gestão
            Jurídica
          </Text>
        </View>
      </Page>
    </Document>
  );
}
