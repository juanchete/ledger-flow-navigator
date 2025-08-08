import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image, Font } from '@react-pdf/renderer';
import { GeneratedInvoice, InvoiceCompany, InvoiceLineItem } from '@/types/invoice';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
    marginBottom: 10,
  },
  logoSection: {
    width: 150,
    marginRight: 20,
  },
  logo: {
    width: 140,
    height: 56,
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
    fontSize: 9,
  },
  controlRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  controlLabel: {
    width: 80,
  },
  controlValue: {
    fontWeight: 'bold',
    color: '#FF0000',
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    marginVertical: 8,
  },
  billToSection: {
    marginBottom: 8,
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
    borderWidth: 1,
    borderColor: '#000000',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    padding: 5,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 5,
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 25,
    padding: 6,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 9,
    paddingHorizontal: 5,
  },
  // Column widths
  quantityColumn: {
    width: 60,
    textAlign: 'center',
  },
  descriptionColumn: {
    flex: 1,
    paddingRight: 10,
  },
  priceColumn: {
    width: 80,
    textAlign: 'right',
  },
  totalColumn: {
    width: 80,
    textAlign: 'right',
  },
  totalsSection: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginBottom: 3,
  },
  totalLabel: {
    fontSize: 10,
    textAlign: 'right',
    marginRight: 20,
  },
  totalValue: {
    fontSize: 10,
    textAlign: 'right',
    width: 100,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginTop: 10,
    paddingTop: 5,
    borderTopWidth: 2,
    borderTopColor: '#000000',
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
    width: 100,
  },
  paymentConditions: {
    marginTop: 8,
    marginBottom: 10,
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
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, company, lineItems }) => {
  const formatCurrency = (amount: number, currency?: string) => {
    const formattedNumber = amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const currencySymbol = currency === 'VES' ? 'Bs.' : currency || 'Bs.';
    return `${currencySymbol} ${formattedNumber}`;
  };

  // Generate control and invoice numbers
  const controlNumber = invoice.id ? invoice.id.slice(-8).toUpperCase() : '00-000000';
  const invoiceNumberFormatted = invoice.invoiceNumber || '00-000000';
  const invoiceDate = format(new Date(invoice.invoiceDate), 'dd/MM/yyyy', { locale: es });

  // Use the construction logo from public directory
  const logoUrl = company.type === 'construction' 
    ? '/construction-logo.png'
    : (company.logoUrl || '/construction-logo.png');

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {/* Left side with Logo and Company Info below */}
            <View style={styles.logoWithText}>
              <View style={styles.logoSection}>
                <Image style={styles.logo} src={logoUrl} />
              </View>
              
              {/* Company Info below logo */}
              <View style={{marginTop: 5}}>
                <Text style={styles.sectionTitle}>De</Text>
                <Text style={styles.companyTitle}>{company.legalName}</Text>
                <Text style={styles.companyDetails}>{company.address}</Text>
                <Text style={styles.companyDetails}>{company.city} - {company.state}</Text>
                <Text style={styles.companyDetails}>Código Postal {company.postalCode}</Text>
                <Text style={styles.companyDetails}>Telf: {company.phone}</Text>
                <Text style={styles.companyDetails}>e-mail: {company.email}</Text>
              </View>
            </View>

            {/* Right Company Info */}
            <View style={styles.companyRightSection}>
              <Text style={styles.companyTitle}>{company.name}</Text>
              <Text style={styles.companyDetails}>Rif: {company.taxId}</Text>
              <Text style={styles.companyDetails}>{company.address}</Text>
              <Text style={styles.companyDetails}>{company.city} {company.postalCode}</Text>
              <Text style={styles.companyDetails}>{company.phone}</Text>
              <Text style={styles.companyDetails}>email:{company.email}</Text>
              
              <View style={styles.controlInfo}>
                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>N° de control</Text>
                  <Text style={styles.controlValue}>{controlNumber}</Text>
                </View>
                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>N° de factura</Text>
                  <Text style={styles.controlValue}>{invoiceNumberFormatted}</Text>
                </View>
                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>Fecha</Text>
                  <Text style={styles.companyDetails}>{invoiceDate}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.separator} />

        {/* Bill To Section */}
        <View style={styles.billToSection}>
          <Text style={styles.sectionTitle}>Facturar a</Text>
          <Text style={styles.companyTitle}>{invoice.clientName}</Text>
          <Text style={styles.clientInfo}>J-{invoice.clientTaxId || '00000000-0'}</Text>
          <Text style={styles.clientInfo}>{invoice.clientAddress || 'Caracas - Venezuela'}</Text>
          {invoice.clientPhone && <Text style={styles.clientInfo}>Tel: {invoice.clientPhone}</Text>}
        </View>

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
            <View key={index} style={[styles.tableRow, index > 0 && { borderTopWidth: 1, borderTopColor: '#E0E0E0' }]}>
              <View style={styles.quantityColumn}>
                <Text style={styles.tableCell}>{item.quantity}</Text>
              </View>
              
              <View style={styles.descriptionColumn}>
                <Text style={styles.tableCell}>
                  {item.description.toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.priceColumn}>
                <Text style={styles.tableCell}>
                  {formatCurrency(item.unitPrice, invoice.currency)}
                </Text>
              </View>
              
              <View style={styles.totalColumn}>
                <Text style={styles.tableCell}>
                  {formatCurrency(item.subtotal, invoice.currency)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal, invoice.currency)}</Text>
          </View>
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA 16.0%:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.taxAmount, invoice.currency)}</Text>
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

        {/* Legal Box */}
        <View style={styles.legalBox}>
          <Text style={styles.legalText}>
            SEGUN GACETA OFICIAL 39.795 DE FECHA 08/11/2011 , PROVIDENCIA ADMINISTRATIVA N°071 , DEBE CUMPLIR CON LA LEY.
          </Text>
          <Text style={styles.legalText}>
            Telfs.: (0212) 870.48.83 / 870.48.91 - 6316 DOCUMENTO VÁ SIN TACHADURAS NI ENMENDADURAS./ Cantidad enmenda: 100
          </Text>
          <Text style={styles.legalText}>
            Fecha: 25-02-2022 - Control: 00-00152 desde el N°00-00300    Fecha Límite: Providencia  SENAIT: 01000001 / Régimen Capital Gaceta desde el Nº 22-02-2008
          </Text>
        </View>

        {/* Original Text */}
        <Text style={styles.originalText}>ORIGINAL</Text>
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
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ 
  invoice, 
  company, 
  lineItems,
  fileName 
}) => {
  const defaultFileName = fileName || `factura-${invoice.invoiceNumber}.pdf`;

  return (
    <PDFDownloadLink
      document={<InvoicePDF invoice={invoice} company={company} lineItems={lineItems} />}
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
              Descargar PDF
            </>
          )}
        </button>
      )}
    </PDFDownloadLink>
  );
};