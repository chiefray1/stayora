import { useState } from "react";
import { CheckCircle2, FileText, FolderOpen, Plus, ScanLine, ShieldCheck } from "lucide-react";
import { useStore } from "../lib/store";
import type { DocumentType } from "../lib/types";
import { addDays, prettyDate, todayISO } from "../lib/format";
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
  cn,
} from "../components/ui";

const types: DocumentType[] = ["Passport", "National ID", "Visa", "Contract", "Invoice", "Receipt", "Signature", "Other"];

export default function Documents() {
  const { db, addDocument, setDocumentStatus, logAudit } = useStore();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | DocumentType>("all");
  const [form, setForm] = useState({
    name: "",
    type: "Passport" as DocumentType,
    ownerName: "",
    size: "1.2 MB",
    expiresAt: addDays(todayISO(), 365),
  });

  const visible = filter === "all" ? db.documents : db.documents.filter((doc) => doc.type === filter);
  const verified = db.documents.filter((doc) => doc.status === "verified").length;
  const pending = db.documents.filter((doc) => doc.status === "pending").length;
  const expiring = db.documents.filter((doc) => doc.expiresAt && doc.expiresAt <= addDays(todayISO(), 30)).length;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.ownerName.trim()) return;
    addDocument({
      name: form.name.trim().endsWith(".pdf") ? form.name.trim() : `${form.name.trim()}.pdf`,
      type: form.type,
      ownerName: form.ownerName.trim(),
      size: form.size,
      expiresAt: form.expiresAt || undefined,
      status: "pending",
    });
    logAudit(`Document uploaded · ${form.name.trim()}`, "Documents");
    setOpen(false);
    setForm({ ...form, name: "", ownerName: "" });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Compliance"
        title="Documents"
        description="Store guest IDs, contracts, visas, receipts and signatures with expiry tracking."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> Upload document</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Documents" value={String(db.documents.length)} hint="Across all records" icon={FolderOpen} tone="noir" />
        <StatCard label="Verified" value={String(verified)} hint="Ready for compliance" icon={ShieldCheck} />
        <StatCard label="Pending review" value={String(pending)} hint="Awaiting verification" icon={ScanLine} />
        <StatCard label="Expiring soon" value={String(expiring)} hint="Within 30 days" icon={FileText} />
      </div>

      <SectionCard
        className="mt-4"
        title="Document library"
        subtitle={`${visible.length} file${visible.length === 1 ? "" : "s"}`}
        action={
          <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="h-8 w-40 py-1 text-xs">
            <option value="all">All types</option>
            {types.map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="table-base min-w-[820px]">
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Uploaded</th>
                <th>Expires</th>
                <th>Size</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <p className="flex items-center gap-2 text-xs font-semibold"><FileText className="size-3.5 text-gold" /> {doc.name}</p>
                  </td>
                  <td className="text-xs">{doc.type}</td>
                  <td className="text-xs font-medium">{doc.ownerName}</td>
                  <td className="text-xs">{prettyDate(doc.uploadedAt)}</td>
                  <td className={cn("text-xs", doc.expiresAt && doc.expiresAt <= addDays(todayISO(), 30) && "font-semibold text-destructive")}>
                    {doc.expiresAt ? prettyDate(doc.expiresAt) : "—"}
                  </td>
                  <td className="text-xs text-muted-foreground">{doc.size}</td>
                  <td><StatusPill status={doc.status} /></td>
                  <td className="text-right">
                    {doc.status === "pending" ? (
                      <Button size="sm" variant="outline" onClick={() => { setDocumentStatus(doc.id, "verified"); logAudit(`Verified document ${doc.name}`, "Documents"); }}>
                        <CheckCircle2 className="size-3.5" /> Verify
                      </Button>
                    ) : doc.status === "expired" ? (
                      <Button size="sm" variant="outline" onClick={() => setDocumentStatus(doc.id, "pending")}>Renew</Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Verified</span>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">No documents in this category.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Upload a document"
        description="Record a guest ID, contract or receipt in the secure document vault."
        width="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="document-form"><FolderOpen className="size-4" /> Add document</Button>
          </>
        }
      >
        <form id="document-form" onSubmit={submit} className="space-y-4">
          <Field label="File name" hint="A .pdf extension is added automatically.">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Guest-passport" required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Document type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as DocumentType })}>
                {types.map((type) => <option key={type} value={type}>{type}</option>)}
              </Select>
            </Field>
            <Field label="Owner">
              <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} placeholder="Guest or company" required />
            </Field>
            <Field label="File size">
              <Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="1.2 MB" />
            </Field>
            <Field label="Expiry date">
              <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </Field>
          </div>
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            Uploads are simulated in this workspace. Files stay inside the tenant boundary and are never shared across properties.
          </p>
        </form>
      </Modal>
    </div>
  );
}
