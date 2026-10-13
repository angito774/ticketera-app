import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { TicketPdfData } from "@/modules/tickets/types/ticket-pdf.types";

const BRAND = "#4F46E5";
const INK = "#111827";
const MUTED = "#4B5563";
const BORDER = "#D1D5DB";
const CONDITIONS =
  "Presenta este código QR en el ingreso. Cada código es único: no lo compartas ni lo publiques.";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", color: INK, padding: 48, fontSize: 11 },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: BRAND },
  counter: { fontSize: 10, color: MUTED, marginTop: 4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  rule: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 20 },
  eventTitle: { fontSize: 28, fontFamily: "Helvetica-Bold", lineHeight: 1.2 },
  date: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 12 },
  line: { fontSize: 12, color: MUTED, marginTop: 4 },
  badge: { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK, marginTop: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  field: { width: "50%", marginTop: 16 },
  label: { fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 },
  value: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 3 },
  qrBlock: { alignItems: "center", marginTop: 28 },
  qr: { width: 130, height: 130 },
  shortCode: { fontSize: 18, fontFamily: "Courier-Bold", letterSpacing: 3, marginTop: 10 },
  shortCodeLabel: { fontSize: 9, color: MUTED, marginTop: 4 },
  footer: { position: "absolute", left: 48, right: 48, bottom: 40 },
  conditions: { fontSize: 10, color: MUTED, lineHeight: 1.4, marginTop: 8 },
});

interface FieldProps {
  label: string;
  value: string;
}

function Field({ label, value }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

interface TicketPdfDocumentProps {
  data: TicketPdfData;
  qrDataUrls: Record<string, string>;
}

export function TicketPdfDocument({ data, qrDataUrls }: TicketPdfDocumentProps) {
  return (
    <Document title={data.title} author="Ticketera" language="es">
      {data.pages.map((page) => (
        <Page key={page.ticketId} size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.brand}>Ticketera</Text>
            <Text style={styles.counter}>
              Entrada {page.position.index} de {page.position.total}
            </Text>
          </View>
          <View style={styles.rule} />

          <Text style={styles.eventTitle}>{data.eventTitle}</Text>
          <Text style={styles.date}>{data.dateLine}</Text>
          {data.doorsLine ? <Text style={styles.line}>{data.doorsLine}</Text> : null}
          <Text style={styles.line}>{data.venueLine}</Text>
          <Text style={styles.line}>{data.addressLine}</Text>
          {page.statusLabel ? <Text style={styles.badge}>Estado: {page.statusLabel}</Text> : null}

          <View style={styles.grid}>
            <Field label="Zona" value={page.zoneName} />
            {page.seatLabel ? <Field label="Asiento" value={page.seatLabel} /> : null}
            <Field label="Titular" value={data.holderName} />
            <Field label="Pedido" value={data.orderNumber} />
            <Field label="Total del pedido" value={data.totalLabel} />
            {data.minAgeLabel ? <Field label="Edad mínima" value={data.minAgeLabel} /> : null}
          </View>

          <View style={styles.qrBlock}>
            {/* react-pdf Image is not an <img> and has no alt prop; the short code below is the text alternative */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image style={styles.qr} src={qrDataUrls[page.ticketId]} />
            <Text style={styles.shortCode}>{page.shortCode}</Text>
            <Text style={styles.shortCodeLabel}>Código de verificación</Text>
          </View>

          <View style={styles.footer} fixed>
            <View style={styles.rule} />
            <Text style={styles.conditions}>{CONDITIONS}</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
