import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  PDFDocument,
  rgb,
  PDFFont,
  StandardFonts,
} from "https://esm.sh/pdf-lib@1.17.1";
import type { Transaction, BankAccount } from "../../../src/types/index.ts";

// It's recommended to store these as environment variables
const SUPABASE_URL = Deno.env.get("HOST_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("HOST_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const TO_EMAIL = Deno.env.get("DAILY_REPORT_TO_EMAIL")!;

// Helper to determine if a transaction is a credit (+) or debit (-)
const getTransactionEffect = (tx: any): number => {
  const amount = tx.amount || 0;
  switch (tx.type) {
    case "sale":
    case "payment":
      return tx.debt_id ? -amount : amount; // Credit unless it's paying a debt
    case "purchase":
    case "expense":
      return -amount; // Debit
    case "banking":
    case "balance-change":
      return amount; // Amount should be signed
    default:
      return 0;
  }
};

const formatCurrency = (amount: number) => amount.toFixed(2);

// Función para centrar texto
function drawCenteredText(
  page: any,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  width: number
) {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (width - textWidth) / 2,
    y,
    size,
    font,
  });
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // --- Date and Time Configuration ---
    // The report is generated for the day of execution.
    // The cron job is timed to run at midnight VET, so the "last 24 hours"
    // correctly captures the previous calendar day's activity.
    const reportDate = new Date();
    const reportDateString = reportDate.toLocaleDateString("es-VE", {
      timeZone: "America/Caracas",
    });
    const reportFileNameDate = reportDate.toISOString().split("T")[0];

    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    // 1. Fetch data
    const { data: bankAccounts, error: accountsError } = await supabase
      .from("bank_accounts")
      .select("*");
    if (accountsError) throw accountsError;

    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*, client:clients!transactions_client_id_fkey(name)")
      .gte("created_at", twentyFourHoursAgo);
    if (txError) throw txError;

    // 2. Process data: Group transactions by account and calculate balances
    const accountReports = new Map<string, AccountReport>();

    // Special category for transactions without a bank account
    accountReports.set("UNASSIGNED", {
      accountDetails: {
        id: "UNASSIGNED",
        bankName: "Efectivo y Otros Movimientos",
        bank: "Efectivo y Otros Movimientos",
        accountNumber: "N/A",
        account_number: "N/A",
        amount: 0,
        currency: "USD",
      } as unknown as BankAccount,
      startingBalance: 0,
      transactions: [],
    });

    bankAccounts.forEach((acc: any) => {
      accountReports.set(acc.id.toString(), {
        accountDetails: acc as BankAccount,
        startingBalance: acc.amount,
        transactions: [],
      });
    });

    transactions.forEach((tx: any) => {
      let report: AccountReport | undefined = tx.bank_account_id
        ? accountReports.get(tx.bank_account_id.toString())
        : undefined;

      // If no specific account found, assign to the general "unassigned" category
      if (!report) {
        report = accountReports.get("UNASSIGNED");
      }

      if (report) {
        const effect = getTransactionEffect(tx);
        report.transactions.push({ ...(tx as Transaction), effect });
        if (report.accountDetails.id !== "UNASSIGNED") {
          report.startingBalance -= effect;
        }
      }
    });

    // --- 3. Generate PDF ---
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    let y = height - 40;

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Título centrado
    drawCenteredText(
      page,
      `Reporte de Movimientos Diarios - ${reportDateString}`,
      y,
      helveticaBold,
      18,
      width
    );
    y -= 40;

    if (transactions.length === 0) {
      drawCenteredText(
        page,
        "No se registraron movimientos en las últimas 24 horas.",
        y,
        helvetica,
        12,
        width
      );
    } else {
      const reportsToShow = Array.from(accountReports.values()).sort((a, b) =>
        a.accountDetails.id === "UNASSIGNED" ? 1 : -1
      );

      for (const report of reportsToShow) {
        if (report.transactions.length === 0) continue;

        const { accountDetails, startingBalance, transactions } = report;
        const isUnassigned = accountDetails.id === "UNASSIGNED";

        // Sort transactions chronologically
        transactions.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        y -= 20;
        // Nombre de la tienda/cuenta centrado y destacado
        drawCenteredText(
          page,
          `Cuenta: ${
            accountDetails.bankName || accountDetails.bank || "Sin banco"
          } (${
            accountDetails.accountNumber ||
            accountDetails.account_number ||
            "Sin número"
          })`,
          y,
          helveticaBold,
          14,
          width
        );
        y -= 15;
        // Línea separadora
        page.drawLine({
          start: { x: 50, y },
          end: { x: width - 50, y },
          thickness: 1,
        });
        y -= 20;

        // Saldo Inicial
        if (!isUnassigned) {
          page.drawText("Saldo Inicial:", {
            x: 60,
            y,
            font: helvetica,
            size: 11,
          });
          page.drawText(formatCurrency(startingBalance), {
            x: width - 120,
            y,
            font: helvetica,
            size: 11,
          });
          y -= 20;
        }

        // Encabezados de tabla alineados
        const columns = [
          { label: "Fecha", x: 60, width: 60 },
          { label: "Descripción", x: 130, width: 200 },
          { label: "Débito (-)", x: 340, width: 60 },
          { label: "Crédito (+)", x: 420, width: 60 },
          { label: "Saldo", x: width - 120, width: 60 },
        ];
        columns.forEach((col) => {
          page.drawText(col.label, {
            x: col.x,
            y,
            font: helveticaBold,
            size: 10,
          });
        });
        y -= 12;
        // Línea bajo encabezados
        page.drawLine({
          start: { x: 50, y },
          end: { x: width - 50, y },
          thickness: 0.5,
        });
        y -= 10;

        let runningBalance = startingBalance;
        for (const tx of transactions) {
          runningBalance += tx.effect;
          const clientInfo = tx as any; // Cast to access aliased property
          const clientName = clientInfo.client
            ? `a/de ${clientInfo.client.name}`
            : "";
          const description = `${tx.description} ${clientName}`;

          // Alinea cada valor según la columna
          const rowValues = [
            new Date(tx.date).toLocaleTimeString("es-VE"),
            description,
            tx.effect < 0 ? formatCurrency(Math.abs(tx.effect)) : "",
            tx.effect > 0 ? formatCurrency(tx.effect) : "",
            !isUnassigned ? formatCurrency(runningBalance) : "",
          ];
          columns.forEach((col, idx) => {
            page.drawText(rowValues[idx], {
              x: col.x,
              y,
              font: helvetica,
              size: 9,
            });
          });
          y -= 13;
          // Línea separadora entre filas
          page.drawLine({
            start: { x: 50, y: y + 10 },
            end: { x: width - 50, y: y + 10 },
            thickness: 0.2,
          });
        }

        // Saldo Final
        if (!isUnassigned) {
          y -= 5;
          page.drawLine({
            start: { x: 340, y: y + 10 },
            end: { x: width - 50, y: y + 10 },
            thickness: 0.5,
          });
          y -= 15;
          page.drawText("Saldo Final:", {
            x: 280,
            y,
            font: helveticaBold,
            size: 11,
          });
          page.drawText(formatCurrency(runningBalance), {
            x: width - 120,
            y,
            font: helveticaBold,
            size: 11,
          });
        }
        y -= 35;
      }
    }

    const pdfBytes = await pdfDoc.save();

    // --- 4. Send email with PDF attachment ---
    const emailBody = {
      from: "onboarding@resend.dev",
      to: TO_EMAIL,
      subject: `Estado de Cuenta Diario - ${reportDateString}`,
      html: `<h1>Estado de Cuenta</h1><p>Adjunto encontrarás el reporte detallado con los movimientos de tus cuentas para el día de ayer.</p>`,
      attachments: [
        {
          filename: `estado-de-cuenta-${reportFileNameDate}.pdf`,
          content: btoa(String.fromCharCode(...pdfBytes)),
        },
      ],
    };

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailBody),
    });

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.json();
      throw new Error(`Failed to send email: ${JSON.stringify(errorBody)}`);
    }

    return new Response(
      JSON.stringify({ message: "Report sent successfully!" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
