import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image, Font } from '@react-pdf/renderer';
import { GeneratedInvoice, InvoiceCompany, InvoiceLineItem } from '@/types/invoice';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Register fonts if needed (optional)
// Font.register({
//   family: 'Roboto',
//   src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf'
// });

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  companySection: {
    flex: 1,
  },
  invoiceSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  companyDetails: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#333333',
    marginBottom: 3,
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    marginVertical: 20,
  },
  billToSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  clientInfo: {
    fontSize: 10,
    color: '#333333',
    marginBottom: 2,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tableCell: {
    fontSize: 10,
    color: '#333333',
  },
  // Column widths
  itemColumn: {
    flex: 4,
  },
  quantityColumn: {
    flex: 1,
    textAlign: 'center',
  },
  unitColumn: {
    flex: 1,
    textAlign: 'center',
  },
  priceColumn: {
    flex: 1.5,
    textAlign: 'right',
  },
  totalColumn: {
    flex: 1.5,
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 250,
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 10,
    color: '#666666',
  },
  totalValue: {
    fontSize: 10,
    color: '#333333',
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 250,
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 2,
    borderTopColor: '#333333',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'right',
  },
  notesSection: {
    marginTop: 30,
  },
  notesText: {
    fontSize: 10,
    color: '#666666',
    marginTop: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
  },
  footerText: {
    fontSize: 8,
    color: '#999999',
    textAlign: 'center',
  },
  logo: {
    width: 100,
    height: 40,
    marginBottom: 10,
  },
});

// Invoice PDF Document Component
interface InvoicePDFProps {
  invoice: GeneratedInvoice;
  company: InvoiceCompany;
  lineItems: InvoiceLineItem[];
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, company, lineItems }) => {
  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {/* Company Info */}
            <View style={styles.companySection}>
              {company.logoUrl && (
                <Image style={styles.logo} src={company.logoUrl} />
              )}
              <Text style={styles.companyName}>{company.legalName}</Text>
              <Text style={styles.companyDetails}>RIF: {company.taxId}</Text>
              <Text style={styles.companyDetails}>{company.address}</Text>
              <Text style={styles.companyDetails}>{company.city}, {company.state} {company.postalCode}</Text>
              {company.phone && <Text style={styles.companyDetails}>Tel: {company.phone}</Text>}
              {company.email && <Text style={styles.companyDetails}>Email: {company.email}</Text>}
            </View>

            {/* Invoice Info */}
            <View style={styles.invoiceSection}>
              <Text style={styles.invoiceTitle}>FACTURA</Text>
              <Text style={styles.invoiceNumber}>Nº {invoice.invoiceNumber}</Text>
              <Text style={styles.invoiceNumber}>
                Fecha: {format(new Date(invoice.invoiceDate), 'dd/MM/yyyy', { locale: es })}
              </Text>
              <Text style={styles.invoiceNumber}>
                Vence: {format(new Date(invoice.dueDate), 'dd/MM/yyyy', { locale: es })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.separator} />

        {/* Bill To Section */}
        <View style={styles.billToSection}>
          <Text style={styles.sectionTitle}>FACTURAR A:</Text>
          <Text style={styles.clientInfo}>{invoice.clientName}</Text>
          {invoice.clientTaxId && <Text style={styles.clientInfo}>RIF/CI: {invoice.clientTaxId}</Text>}
          {invoice.clientAddress && <Text style={styles.clientInfo}>{invoice.clientAddress}</Text>}
          {invoice.clientPhone && <Text style={styles.clientInfo}>Tel: {invoice.clientPhone}</Text>}
          {invoice.clientEmail && <Text style={styles.clientInfo}>Email: {invoice.clientEmail}</Text>}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.itemColumn]}>Descripción</Text>
            <Text style={[styles.tableHeaderCell, styles.quantityColumn]}>Cant.</Text>
            <Text style={[styles.tableHeaderCell, styles.unitColumn]}>Unidad</Text>
            <Text style={[styles.tableHeaderCell, styles.priceColumn]}>Precio Unit.</Text>
            <Text style={[styles.tableHeaderCell, styles.totalColumn]}>Total</Text>
          </View>

          {/* Table Rows */}
          {lineItems
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item, index) => (
              <View key={item.id || index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.itemColumn]}>{item.description}</Text>
                <Text style={[styles.tableCell, styles.quantityColumn]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.unitColumn]}>{item.unit}</Text>
                <Text style={[styles.tableCell, styles.priceColumn]}>
                  {formatCurrency(item.unitPrice, invoice.currency)}
                </Text>
                <Text style={[styles.tableCell, styles.totalColumn]}>
                  {formatCurrency(item.subtotal, invoice.currency)}
                </Text>
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
            <Text style={styles.totalLabel}>IVA (16%):</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.taxAmount, invoice.currency)}</Text>
          </View>
          
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(invoice.totalAmount, invoice.currency)}</Text>
          </View>

          {invoice.exchangeRate && invoice.currency === 'VES' && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tasa de cambio:</Text>
              <Text style={styles.totalValue}>1 USD = {invoice.exchangeRate} VES</Text>
            </View>
          )}
        </View>

        {/* Notes Section */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notas:</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Esta factura fue generada electrónicamente y es válida sin firma.
          </Text>
          <Text style={styles.footerText}>
            {company.name} - {company.website || company.email}
          </Text>
        </View>
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