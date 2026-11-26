import { useState } from "react";
import { FileText, Plus, ReceiptText, Send, Trash2, Wallet } from "lucide-react";
import { useStore } from "../lib/store";
import type { InvoiceType } from "../lib/types";
import { addDays, naira, prettyDate, todayISO } from "../lib/format";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  SectionCard,
  Select,
  StatCard,
  StatusPill,
  Textarea,
} from "../components/ui";

const invoiceTypes: InvoiceType[] = ["Room", "Restaurant", "Events", "Spa", "Laundry", "Mixed"];

export default function Billing() {
  const { db, createInvoice, setInvoiceStatus, logAudit } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    reservationRef: "",
    type: "Room" as InvoiceType,
    discount: 0,
    dueAt: addDays(todayISO(), 7),
    notes: "",
  });
  const [lines, setLines] = useState([{ description: "Accommodation", amount: 150_000 }]);

  const outstanding = db.invoices.filter((invoice) => invoice.status === "sent" || invoice.status === "overdue");
  const paid = db.invoices.filter((invoice) => invoice.status === "paid");
  const overdue = db.invoices.filter((invoice) => invoice.status === "overdue");
  const subtotal = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const taxRate = 7.5;
  const tax = Math.round((subtotal * taxRate) / 100);
  const total = Math.max(0, subtotal + tax - Number(form.discount || 0));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.customerName.trim() || lines.every((line) => !line.description.trim())) return;
    createInvoice({
      customerName: form.customerName.trim(),
      reservationRef: form.reservationRef.trim() || undefined,
      type: form.type,
      lines: lines
        .filter((line) => line.description.trim())
        .map((line) => ({ description: line.description.trim(), amount: Number(line.amount || 0) })),
      discount: Number(form.discount || 0),
      dueAt: form.dueAt,
      notes: form.notes.trim() || undefined,
    });
    logAudit(`Invoice drafted for ${form.customerName.trim()}`, "Billing");
    setOpen(false);
    setForm({ ...form, customerName: "", reservationRef: "", notes: "" });
    setLines([{ description: "Accommodation", amount: 150_000 }]);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Billing & invoices"
        description="Raise folios, corporate invoices and event bills with tax, discounts and payment tracking."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New invoice</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Outstanding" value={naira(outstanding.reduce((sum, invoice) => sum + invoice.total, 0))} hint={`${outstanding.length} invoices`} icon={Wallet} tone="noir" />
        <StatCard label="Collected" value={naira(paid.reduce((sum, invoice) => sum + invoice.total, 0))} hint={`${paid.length} paid`} icon={ReceiptText} />
        <StatCard label="Overdue" value={naira(overdue.reduce((sum, invoice) => sum + invoice.total, 0))} hint={`${overdue.length} need chasing`} icon={FileText} />
        <StatCard label="Draft invoices" value={String(db.invoices.filter((invoice) => invoice.status === "draft").length)} hint="Not yet sent" icon={Send} />
      </div>

      <SectionCard className="mt-4" title="Invoice register" subtitle="Every folio, corporate bill and event invoice" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="table-base min-w-[920px]">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Subtotal</th>
                <th>Tax</th>
                <th>Total</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {db.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <p className="text-xs font-semibold">{invoice.ref}</p>
                    <p className="text-[10px] text-muted-foreground">{invoice.reservationRef ?? "Standalone"}</p>
                  </td>
                  <td className="text-xs font-medium">{invoice.customerName}</td>
                  <td className="text-xs">{invoice.type}</td>
                  <td className="text-xs">{prettyDate(invoice.issuedAt)}</td>
                  <td className="text-xs">{prettyDate(invoice.dueAt)}</td>
                  <td className="text-xs">{naira(invoice.subtotal)}</td>
                  <td className="text-xs">{naira(invoice.tax)}</td>
                  <td className="text-xs font-semibold">
                    {naira(invoice.total)}
                    {invoice.discount > 0 && <span className="block text-[10px] font-normal text-emerald-600">−{naira(invoice.discount)} discount</span>}
                  </td>
                  <td><StatusPill status={invoice.status} /></td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      {invoice.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => setInvoiceStatus(invoice.id, "sent")}>Send</Button>
                      )}
                      {(invoice.status === "sent" || invoice.status === "overdue") && (
                        <Button size="sm" onClick={() => { setInvoiceStatus(invoice.id, "paid"); logAudit(`Invoice ${invoice.ref} marked paid`, "Billing"); }}>Mark paid</Button>
                      )}
                      {invoice.status !== "paid" && invoice.status !== "void" && (
                        <Button size="sm" variant="ghost" onClick={() => setInvoiceStatus(invoice.id, "void")}>Void</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {db.invoices.length === 0 && (
                <tr><td colSpan={10} className="py-8 text-center text-xs text-muted-foreground">No invoices yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create an invoice"
        description="Bill a guest, company or event with itemised lines."
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="invoice-form"><ReceiptText className="size-4" /> Create invoice</Button>
          </>
        }
      >
        <form id="invoice-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer / company">
              <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="e.g. Meridian Group" required />
            </Field>
            <Field label="Reservation reference">
              <Input value={form.reservationRef} onChange={(e) => setForm({ ...form, reservationRef: e.target.value })} placeholder="Optional · STY-24001" />
            </Field>
            <Field label="Invoice type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as InvoiceType })}>
                {invoiceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </Select>
            </Field>
            <Field label="Due date">
              <Input type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} required />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground/80">Line items</p>
              <Button type="button" size="sm" variant="outline" onClick={() => setLines((prev) => [...prev, { description: "", amount: 0 }])}>
                <Plus className="size-3.5" /> Add line
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={line.description}
                    onChange={(e) => setLines((prev) => prev.map((item, i) => (i === index ? { ...item, description: e.target.value } : item)))}
                    placeholder="Description"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={line.amount}
                    onChange={(e) => setLines((prev) => prev.map((item, i) => (i === index ? { ...item, amount: Number(e.target.value) } : item)))}
                    className="w-32"
                    placeholder="Amount"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))}
                    aria-label="Remove line"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Discount (₦)">
              <Input type="number" min={0} value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} />
            </Field>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{naira(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">VAT {taxRate}%</span><span>{naira(tax)}</span></div>
              <div className="flex justify-between font-semibold"><span>Total</span><span>{naira(total)}</span></div>
            </div>
          </div>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Payment terms, PO number, bank details…" />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
