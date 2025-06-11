import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, PDFFont } from "https://esm.sh/pdf-lib@1.17.1";

// TODO: Replace with your actual Supabase URL and service role key
// It's recommended to store these as environment variables
const SUPABASE_URL = Deno.env.get("HOST_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("HOST_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const TO_EMAIL = Deno.env.get("DAILY_REPORT_TO_EMAIL")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // --- 1. Fetch data from the last 24 hours ---
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: obras, error: obrasError } = await supabase
      .from("obras")
      .select("*")
      .gte("updated_at", twentyFourHoursAgo);
    if (obrasError) throw obrasError;

    const { data: gastos, error: gastosError } = await supabase
      .from("gasto_obras")
      .select("*")
      .gte("created_at", twentyFourHoursAgo);
    if (gastosError) throw gastosError;

    const { data: receivables, error: receivablesError } = await supabase
      .from("receivables")
      .select("*, clients (name)")
      .gte("created_at", twentyFourHoursAgo);
    if (receivablesError) throw receivablesError;

    const { data: debts, error: debtsError } = await supabase
      .from("debts")
      .select("*, clients (name)")
      .gte("created_at", twentyFourHoursAgo);
    if (debtsError) throw debtsError;

    // TODO: Add fetching for receivables and debts
    // const { data: receivables, error: receivablesError } = await supabase...
    // const { data: debts, error: debtsError } = await supabase...

    // --- 2. Generate PDF ---
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    let y = height - 40;

    const font = await pdfDoc.embedFont("Helvetica-Bold");
    page.drawText("Reporte Diario de Movimientos", {
      x: 50,
      y,
      size: 24,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 40;

    const regularFont = await pdfDoc.embedFont("Helvetica");

    // Helper function to add text and manage position
    const addText = (
      text: string,
      x: number,
      size: number,
      fontToUse: PDFFont
    ) => {
      if (y < 40) {
        // Add new page if content reaches the bottom
        page = pdfDoc.addPage();
        y = height - 40;
      }
      page.drawText(text, { x, y, size, font: fontToUse, color: rgb(0, 0, 0) });
      y -= size + 5;
    };

    // Add Obras section
    if (obras.length > 0) {
      addText("Obras Actualizadas:", 50, 16, font);
      obras.forEach((obra) => {
        addText(`- ${obra.name} (Estado: ${obra.status})`, 60, 12, regularFont);
      });
      y -= 10;
    }

    // Add Gastos section
    if (gastos.length > 0) {
      addText("Gastos Nuevos:", 50, 16, font);
      gastos.forEach((gasto) => {
        addText(
          `- ${gasto.description}: $${gasto.amount.toFixed(2)}`,
          60,
          12,
          regularFont
        );
      });
      y -= 10;
    }

    // Add Receivables section (Who owes me)
    if (receivables.length > 0) {
      addText("Cuentas por Cobrar Nuevas (Me deben):", 50, 16, font);
      receivables.forEach((item) => {
        const clientName = item.clients?.name || "Cliente no especificado";
        addText(
          `- De ${clientName}: $${item.amount.toFixed(2)} por "${
            item.description
          }"`,
          60,
          12,
          regularFont
        );
      });
      y -= 10;
    }

    // Add Debts section (Who I owe)
    if (debts.length > 0) {
      addText("Deudas Nuevas (Debo a):", 50, 16, font);
      debts.forEach((item) => {
        const clientName = item.clients?.name || "Acreedor no especificado";
        addText(
          `- A ${clientName}: $${item.amount.toFixed(2)} por "${
            item.description
          }"`,
          60,
          12,
          regularFont
        );
      });
    }

    const pdfBytes = await pdfDoc.save();

    // --- 3. Send email with PDF attachment ---
    const emailBody = {
      from: "reportes@ledger-flow.com",
      to: TO_EMAIL,
      subject: `Reporte Diario - ${new Date().toLocaleDateString()}`,
      html: "<h1>Reporte Diario</h1><p>Adjunto encontrarás el reporte diario de movimientos.</p>",
      attachments: [
        {
          filename: `reporte-${new Date().toISOString().split("T")[0]}.pdf`,
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
