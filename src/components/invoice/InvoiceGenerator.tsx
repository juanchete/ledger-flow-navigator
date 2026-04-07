import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image, Font } from '@react-pdf/renderer';
import { GeneratedInvoice, InvoiceCompany, InvoiceLineItem } from '@/types/invoice';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/utils';

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 25,
    paddingBottom: 65,
    fontFamily: 'Helvetica',
    fontSize: 10,
    position: 'relative',
    height: '100%',
  },
  header: {
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  logoSection: {
    width: 220,
    marginRight: 20,
  },
  logo: {
    width: 210,
    height: 84,
  },
  companySection: {
    flex: 1,
  },
  logoWithText: {
    marginBottom: 10,
  },
  companyRightSection: {
    width: 200,
    alignItems: 'flex-end',
  },
  companyTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  companyDetails: {
    fontSize: 8,
    marginBottom: 1,
    lineHeight: 1.2,
  },
  controlInfo: {
    marginTop: 10,
    fontSize: 12,
  },
  controlRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  controlLabel: {
    width: 110,
    fontSize: 12,
    color: '#FF0000',
  },
  controlValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF0000',
  },
  separator: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#CCCCCC',
    marginVertical: 8,
  },
  billToSection: {
    marginTop: 2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  clientInfo: {
    fontSize: 9,
    marginBottom: 2,
    lineHeight: 1.3,
  },
  table: {
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 5,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 22,
    padding: 5,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 8,
    paddingHorizontal: 4,
  },
  // Column widths
  quantityColumn: {
    width: 45,
    textAlign: 'center',
  },
  descriptionColumn: {
    flex: 1,
    paddingRight: 8,
  },
  priceColumn: {
    width: 100,
    textAlign: 'right',
  },
  totalColumn: {
    width: 100,
    textAlign: 'right',
  },
  totalsSection: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 260,
    marginBottom: 3,
  },
  totalLabel: {
    fontSize: 9,
    textAlign: 'right',
    marginRight: 20,
  },
  totalValue: {
    fontSize: 9,
    textAlign: 'right',
    width: 140,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 260,
    paddingTop: 2,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
    width: 140,
  },
  paymentConditions: {
    position: 'absolute',
    bottom: 100,
    left: 25,
  },
  paymentConditionsText: {
    fontSize: 9,
  },
  legalBox: {
    position: 'absolute',
    bottom: 45,
    left: 25,
    right: 25,
    borderWidth: 1,
    borderColor: '#000000',
    padding: 6,
    backgroundColor: '#FFFFFF',
  },
  legalText: {
    fontSize: 6,
    textAlign: 'center',
    lineHeight: 1.2,
    marginBottom: 0,
  },
  originalText: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF0000',
  },
});

// Invoice PDF Document Component
interface InvoicePDFProps {
  invoice: GeneratedInvoice;
  company: InvoiceCompany;
  lineItems: InvoiceLineItem[];
  isCopy?: boolean;
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, company, lineItems, isCopy }) => {
  const formatNumber = (amount: number): string => {
    return amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatCurrency = (amount: number, currency?: string): string => {
    const currencySymbol = currency === 'VES' ? 'Bs.S.' : currency || 'Bs.S.';
    return `${currencySymbol} ${formatNumber(amount)}`;
  };

  // Generate control and invoice numbers
  const fullInvoiceNumber = invoice.invoiceNumber || '00-000000';
  const dashIdx = fullInvoiceNumber.indexOf('-');
  const numberPrefix = dashIdx >= 0 ? fullInvoiceNumber.substring(0, dashIdx) : '00';
  const numberValue = dashIdx >= 0 ? fullInvoiceNumber.substring(dashIdx + 1) : fullInvoiceNumber;
  const invoiceDate = format(parseLocalDate(invoice.invoiceDate), 'dd/MM/yyyy', { locale: es });

  // Prefer the company's uploaded logo; fall back to the bundled default
  const logoUrl = company.logoUrl || '/construction-logo.png';

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header: Logo + Client (left) | Company + Control (right) */}
        <View style={styles.headerRow}>
          {/* Left column: Logo then client info */}
          <View style={{ flex: 1 }}>
            <Image style={styles.logo} src={logoUrl} />
            <View style={{ marginTop: 8 }}>
              <Text style={styles.sectionTitle}>Facturar a</Text>
              <Text style={styles.companyTitle}>{invoice.clientName}</Text>
              <Text style={styles.clientInfo}>{invoice.clientTaxId || 'J-00000000-0'}</Text>
              <Text style={styles.clientInfo}>{invoice.clientAddress || 'Caracas - Venezuela'}</Text>
              {invoice.clientPhone && <Text style={styles.clientInfo}>Tlf: {invoice.clientPhone}</Text>}
            </View>
          </View>

          {/* Right column: Company info + control numbers */}
          <View style={styles.companyRightSection}>
            <Text style={styles.companyTitle}>{company.legalName || company.name}</Text>
            <Text style={styles.companyDetails}>RIF: {company.taxId}</Text>
            <Text style={styles.companyDetails}>{company.address}</Text>
            <Text style={styles.companyDetails}>
              Telfs.: {company.phone} / e-mail: {company.email}
            </Text>
            <Text style={[styles.companyDetails, { marginTop: 4, fontWeight: 'bold' }]}>FORMA LIBRE</Text>

            <View style={styles.controlInfo}>
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>N° CONTROL {numberPrefix} —</Text>
                <Text style={styles.controlValue}>{numberValue}</Text>
              </View>
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>N° FACTURA {numberPrefix} —</Text>
                <Text style={styles.controlValue}>{numberValue}</Text>
              </View>
              <View style={styles.controlRow}>
                <Text style={[styles.controlLabel, { color: '#000000' }]}>Fecha</Text>
                <Text style={styles.companyDetails}>{invoiceDate}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.separator} />

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.quantityColumn]}>Cantidad</Text>
            <Text style={[styles.tableHeaderCell, styles.descriptionColumn]}>Descripción</Text>
            <Text style={[styles.tableHeaderCell, styles.priceColumn]}>Precio Unitario</Text>
            <Text style={[styles.tableHeaderCell, styles.totalColumn]}>Importe</Text>
          </View>

          {/* Table Content */}
          {lineItems.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.quantityColumn}>
                <Text style={styles.tableCell}>{item.quantity}</Text>
              </View>
              
              <View style={styles.descriptionColumn}>
                <Text style={styles.tableCell}>
                  {item.description}
                </Text>
              </View>
              
              <View style={styles.priceColumn}>
                <Text style={styles.tableCell}>
                  {formatNumber(item.unitPrice)}
                </Text>
              </View>

              <View style={styles.totalColumn}>
                <Text style={styles.tableCell}>
                  {formatNumber(item.subtotal)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        {/* Full-width line before Subtotal */}
        <View style={styles.separator} />

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatNumber(invoice.subtotal)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA 16.0%:</Text>
            <Text style={styles.totalValue}>{formatNumber(invoice.taxAmount)}</Text>
          </View>

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(invoice.totalAmount, invoice.currency)}</Text>
          </View>
        </View>

        {/* Payment Conditions */}
        <View style={styles.paymentConditions}>
          <Text style={styles.sectionTitle}>Condiciones y forma de pago</Text>
          <Text style={styles.paymentConditionsText}>100%</Text>
        </View>

        {/* Legal Box (printer / imprenta info) */}
        <View style={styles.legalBox}>
          <Text style={styles.legalText}>
            RAZON SOCIAL "LITO EXPRESO C.A." RIF: J00130277-8 - Calle Colombia entre 2da y 3ra. Av. Catia - Caracas
          </Text>
          <Text style={styles.legalText}>
            Telfs.: (0212) 870-46-83 / 870-25-89 - ESTE DOCUMENTO VA SIN TACHADURA NI ENMENDADURA / Cantidad emitidas: 100
          </Text>
          <Text style={styles.legalText}>
            Fecha: 04-04-2022 - Control Desde el N° {company.invoiceRangeFrom || '00-000701'} Hasta el N° {company.invoiceRangeTo || '00000800'} - Forma Libre / Providencia: SENIAT/ 01/00604 / Region Capital Gaceta oficial del 01-02-2008
          </Text>
        </View>

        {/* Original/Copy Text */}
        <Text style={[styles.originalText]}>
          {isCopy ? 'COPIA' : 'ORIGINAL'}
        </Text>
      </Page>
    </Document>
  );
};

// Main Invoice Generator Component
interface InvoiceGeneratorProps {
  invoice: GeneratedInvoice;
  company: InvoiceCompany;
  lineItems: InvoiceLineItem[];
  fileName?: string;
  isCopy?: boolean;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({
  invoice,
  company,
  lineItems,
  fileName,
  isCopy
}) => {
  const defaultFileName = fileName || (isCopy
    ? `factura-copia-${invoice.invoiceNumber}.pdf`
    : `factura-${invoice.invoiceNumber}.pdf`);

  return (
    <PDFDownloadLink
      document={<InvoicePDF invoice={invoice} company={company} lineItems={lineItems} isCopy={isCopy} />}
      fileName={defaultFileName}
      style={{ textDecoration: 'none' }}
    >
      {({ blob, url, loading, error }) => (
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generando PDF...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {isCopy ? 'Descargar Copia (PDF)' : 'Descargar PDF'}
            </>
          )}
        </button>
      )}
    </PDFDownloadLink>
  );
};